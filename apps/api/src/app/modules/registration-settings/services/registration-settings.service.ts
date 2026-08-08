import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../auth/enums/user-role.enum';
import { AdminUpdateRegistrationSettingsInput } from '../dto/admin-update-registration-settings.input';
import {
  DEFAULT_REGISTRATION_DISABLED_MESSAGE,
  RegistrationSettingsEntity,
} from '../entities/registration-settings.entity';

const SINGLETON_ID = 1;

@Injectable()
export class RegistrationSettingsService implements OnModuleInit {
  private readonly logger = new Logger(RegistrationSettingsService.name);

  constructor(
    @InjectRepository(RegistrationSettingsEntity)
    private readonly repository: Repository<RegistrationSettingsEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureSingleton();
    } catch (error) {
      this.logger.warn(
        'Could not ensure registration_settings row (migration may not have run yet)',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async getSettings(): Promise<RegistrationSettingsEntity> {
    return this.ensureSingleton();
  }

  async updateSettings(
    input: AdminUpdateRegistrationSettingsInput,
  ): Promise<RegistrationSettingsEntity> {
    const settings = await this.ensureSingleton();
    settings.tutorRegistrationEnabled = input.tutorRegistrationEnabled;
    settings.studentRegistrationEnabled = input.studentRegistrationEnabled;
    if (input.disabledMessage !== undefined && input.disabledMessage !== null) {
      const trimmed = input.disabledMessage.trim();
      settings.disabledMessage =
        trimmed.length > 0 ? trimmed : DEFAULT_REGISTRATION_DISABLED_MESSAGE;
    }
    return this.repository.save(settings);
  }

  async isRegistrationRoleEnabled(
    role: UserRole | string | undefined,
  ): Promise<boolean> {
    if (role === UserRole.TUTOR || role === 'TUTOR') {
      const settings = await this.getSettings();
      return settings.tutorRegistrationEnabled;
    }
    if (role === UserRole.STUDENT || role === 'STUDENT') {
      const settings = await this.getSettings();
      return settings.studentRegistrationEnabled;
    }
    return true;
  }

  async registrationDisabledMessage(
    role: UserRole | string | undefined,
  ): Promise<string> {
    const settings = await this.getSettings();
    if (settings.disabledMessage?.trim()) {
      return settings.disabledMessage.trim();
    }
    const label =
      role === UserRole.TUTOR || role === 'TUTOR'
        ? 'tutor'
        : role === UserRole.STUDENT || role === 'STUDENT'
          ? 'student'
          : 'this';
    return `Registration as a ${label} is temporarily unavailable. Please try again later.`;
  }

  private async ensureSingleton(): Promise<RegistrationSettingsEntity> {
    let settings = await this.repository.findOne({
      where: { id: SINGLETON_ID },
    });
    if (settings) {
      return settings;
    }

    settings = this.repository.create({
      id: SINGLETON_ID,
      tutorRegistrationEnabled: true,
      studentRegistrationEnabled: true,
      disabledMessage: DEFAULT_REGISTRATION_DISABLED_MESSAGE,
    });
    try {
      return await this.repository.save(settings);
    } catch {
      const existing = await this.repository.findOne({
        where: { id: SINGLETON_ID },
      });
      if (existing) return existing;
      throw new Error('Failed to create registration_settings singleton row');
    }
  }
}
