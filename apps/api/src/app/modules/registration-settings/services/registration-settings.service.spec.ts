import { UserRole } from '../../auth/enums/user-role.enum';
import {
  DEFAULT_REGISTRATION_DISABLED_MESSAGE,
  RegistrationSettingsEntity,
} from '../entities/registration-settings.entity';
import { RegistrationSettingsService } from './registration-settings.service';

describe('RegistrationSettingsService', () => {
  const settings: RegistrationSettingsEntity = {
    id: 1,
    version: 1,
    deleted: false,
    active: true,
    createdDate: new Date(),
    updatedDate: new Date(),
    m_id: null as unknown as string,
    tutorRegistrationEnabled: true,
    studentRegistrationEnabled: true,
    disabledMessage: DEFAULT_REGISTRATION_DISABLED_MESSAGE,
  } as RegistrationSettingsEntity;

  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let service: RegistrationSettingsService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue({ ...settings }),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    service = new RegistrationSettingsService(repository as never);
  });

  it('returns settings from singleton row', async () => {
    const result = await service.getSettings();
    expect(result.tutorRegistrationEnabled).toBe(true);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('checks tutor/student enable flags', async () => {
    expect(await service.isRegistrationRoleEnabled(UserRole.TUTOR)).toBe(true);
    expect(await service.isRegistrationRoleEnabled(UserRole.STUDENT)).toBe(
      true,
    );
    expect(await service.isRegistrationRoleEnabled(UserRole.UNKNOWN)).toBe(
      true,
    );

    repository.findOne.mockResolvedValue({
      ...settings,
      tutorRegistrationEnabled: false,
    });
    expect(await service.isRegistrationRoleEnabled(UserRole.TUTOR)).toBe(false);
  });

  it('updates settings', async () => {
    const updated = await service.updateSettings({
      tutorRegistrationEnabled: false,
      studentRegistrationEnabled: true,
      disabledMessage: 'Closed for tutors',
    });
    expect(updated.tutorRegistrationEnabled).toBe(false);
    expect(updated.disabledMessage).toBe('Closed for tutors');
    expect(repository.save).toHaveBeenCalled();
  });

  it('returns configured disabled message', async () => {
    repository.findOne.mockResolvedValue({
      ...settings,
      disabledMessage: 'Custom message',
    });
    expect(await service.registrationDisabledMessage(UserRole.TUTOR)).toBe(
      'Custom message',
    );
  });
});
