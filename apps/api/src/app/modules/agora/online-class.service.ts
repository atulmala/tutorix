import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { onlineClassChannelName, onlineClassWindow } from '@tutorix/shared-utils';
import { In, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { Student } from '../student/entities/student.entity';
import { StudentService } from '../student/services/student.service';
import { ClassSessionDeliveryModeEnum } from '../tutor-class-session/enums/class-session-delivery-mode.enum';
import { ClassSessionEnrollmentStatusEnum } from '../tutor-class-session/enums/class-session-enrollment-status.enum';
import { ClassSessionStatusEnum } from '../tutor-class-session/enums/class-session-status.enum';
import { TutorClassSessionEntity } from '../tutor-class-session/entities/tutor-class-session.entity';
import { readAgoraConfig } from './agora.config';
import { AgoraRestClient } from './agora-rest.client';
import { AgoraTokenService } from './agora-token.service';
import { AgoraWhiteboardService, WhiteboardJoinRole } from './agora-whiteboard.service';
import { JoinOnlineClassResult } from './dto/join-online-class.dto';

@Injectable()
export class OnlineClassService {
  constructor(
    @InjectRepository(TutorClassSessionEntity)
    private readonly sessionRepo: Repository<TutorClassSessionEntity>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly studentService: StudentService,
    private readonly tokens: AgoraTokenService,
    private readonly rest: AgoraRestClient,
    private readonly whiteboard: AgoraWhiteboardService,
  ) {}

  async join(
    user: User,
    sessionIdInput: string | number,
    now = new Date(),
  ): Promise<JoinOnlineClassResult> {
    const sessionId = Number(sessionIdInput);
    const session = await this.loadSession(sessionId);
    if (session.deliveryMode !== ClassSessionDeliveryModeEnum.online) {
      throw new BadRequestException('This class is not online');
    }
    const startsAt = session.tutorCalendar?.startsAt;
    if (!startsAt) {
      throw new NotFoundException('Class session not found');
    }
    const durationMinutes = session.tutorCalendar?.durationMinutes ?? 60;
    const window = onlineClassWindow(startsAt, durationMinutes);
    if (now.getTime() < window.opensAt.getTime()) {
      throw new BadRequestException('This class is not open yet');
    }
    if (now.getTime() >= window.hardEnd.getTime() || session.endedAt) {
      throw new BadRequestException('This class has ended');
    }

    const participant = await this.resolveParticipant(user, session);
    const channelName = onlineClassChannelName(session.id);
    const uid = Number(user.id);
    try {
      await this.rest.kickUnauthorized(channelName, participant.allowedUserIds);
    } catch {
      // Channel management must not block the join token.
    }

    const result: JoinOnlineClassResult = {
      appId: readAgoraConfig().appId,
      channelName,
      token: this.tokens.rtcToken(channelName, uid, window.hardEnd, now),
      rtmToken: this.tokens.rtmToken(uid, window.hardEnd, now),
      uid,
      expiresAt: window.hardEnd,
      warnAt: window.warnAt,
      scheduledEnd: window.scheduledEnd,
      whiteboardAppIdentifier: null,
      whiteboardRegion: null,
      whiteboardRoomUuid: null,
      whiteboardRoomToken: null,
      whiteboardError: null,
    };

    if (!this.whiteboard.configured()) {
      result.whiteboardError = 'Whiteboard is not configured';
      return result;
    }

    try {
      const uuid = await this.whiteboard.ensureRoom(session, window.hardEnd, now);
      const config = readAgoraConfig();
      result.whiteboardAppIdentifier = config.whiteboardAppIdentifier;
      result.whiteboardRegion = config.whiteboardRegion;
      result.whiteboardRoomUuid = uuid;
      result.whiteboardRoomToken = this.whiteboard.buildRoomToken(
        uuid,
        participant.whiteboardRole,
        window.hardEnd,
        now,
      );
    } catch (error) {
      result.whiteboardError =
        error instanceof Error ? error.message : 'Whiteboard is unavailable';
    }
    return result;
  }

  async end(user: User, sessionIdInput: string | number, now = new Date()): Promise<boolean> {
    const session = await this.loadSession(Number(sessionIdInput));
    if (session.deliveryMode !== ClassSessionDeliveryModeEnum.online) {
      throw new BadRequestException('This class is not online');
    }
    const tutorUserId = session.tutorOffering?.tutor?.userId;
    if (user.role !== UserRole.TUTOR || tutorUserId == null || Number(tutorUserId) !== Number(user.id)) {
      throw new ForbiddenException('Only the tutor of this class can end it');
    }
    if (!session.endedAt) {
      session.endedAt = now;
      await this.sessionRepo.save(session);
    }
    const startsAt = session.tutorCalendar?.startsAt;
    const durationMinutes = session.tutorCalendar?.durationMinutes ?? 60;
    const hardEnd = startsAt ? onlineClassWindow(startsAt, durationMinutes).hardEnd : now;
    const banMinutes = Math.min(
      1440,
      Math.max(1, Math.ceil((hardEnd.getTime() - now.getTime()) / 60_000)),
    );
    try {
      await this.rest.kickChannel(onlineClassChannelName(session.id), banMinutes);
    } catch {
      // The session is already closed. A kick failure must not undo that.
    }
    return true;
  }

  private async loadSession(sessionId: number): Promise<TutorClassSessionEntity> {
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      throw new NotFoundException('Class session not found');
    }
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, deleted: false },
      relations: {
        tutorCalendar: true,
        tutorOffering: { tutor: true },
        enrollments: true,
      },
    });
    if (!session || session.status === ClassSessionStatusEnum.cancelled) {
      throw new NotFoundException('Class session not found');
    }
    return session;
  }

  private async resolveParticipant(
    user: User,
    session: TutorClassSessionEntity,
  ): Promise<{ whiteboardRole: WhiteboardJoinRole; allowedUserIds: number[] }> {
    const tutorUserId = session.tutorOffering?.tutor?.userId;
    const enrolledStudentIds = (session.enrollments ?? [])
      .filter(
        (row) =>
          !row.deleted && row.status === ClassSessionEnrollmentStatusEnum.confirmed,
      )
      .map((row) => row.studentId);
    const students =
      enrolledStudentIds.length === 0
        ? []
        : await this.studentRepo.find({
            where: { id: In(enrolledStudentIds), deleted: false },
          });
    const allowedUserIds = [
      ...(tutorUserId != null ? [tutorUserId] : []),
      ...students.map((student) => student.userId),
    ];

    if (user.role === UserRole.TUTOR) {
      if (tutorUserId == null) {
        throw new ForbiddenException('Tutor profile not found');
      }
      if (Number(tutorUserId) !== Number(user.id)) {
        throw new ForbiddenException('Only the tutor or an enrolled student can join this class');
      }
      return { whiteboardRole: 'admin', allowedUserIds };
    }

    if (user.role === UserRole.STUDENT) {
      const student = await this.studentService.findByUserId(user.id);
      if (!student) {
        throw new ForbiddenException('Student profile not found');
      }
      const enrolled = students.some((row) => row.id === student.id);
      if (!enrolled) {
        throw new ForbiddenException('Only the tutor or an enrolled student can join this class');
      }
      return { whiteboardRole: 'writer', allowedUserIds };
    }

    throw new ForbiddenException('Only the tutor or an enrolled student can join this class');
  }
}
