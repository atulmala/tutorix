import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../student/entities/student.entity';
import { StudentModule } from '../student/student.module';
import { User } from '../auth/entities/user.entity';
import { TutorClassSessionEntity } from '../tutor-class-session/entities/tutor-class-session.entity';
import { TutorClassSessionModule } from '../tutor-class-session/tutor-class-session.module';
import { readAgoraConfig } from './agora.config';
import { AgoraRestClient } from './agora-rest.client';
import { AgoraTokenService } from './agora-token.service';
import { AgoraWhiteboardService } from './agora-whiteboard.service';
import { AgoraRtcWebhookController } from './agora-rtc-webhook.controller';
import { OnlineClassPresenceEntity } from './entities/online-class-presence.entity';
import { OnlineClassPresenceService } from './online-class-presence.service';
import { OnlineClassResolver } from './online-class.resolver';
import { OnlineClassService } from './online-class.service';

@Module({
  imports: [
    TutorClassSessionModule,
    StudentModule,
    TypeOrmModule.forFeature([TutorClassSessionEntity, Student, OnlineClassPresenceEntity, User]),
  ],
  providers: [
    {
      provide: AgoraTokenService,
      useFactory: () => new AgoraTokenService(readAgoraConfig()),
    },
    {
      provide: AgoraRestClient,
      useFactory: () => new AgoraRestClient(readAgoraConfig()),
    },
    {
      provide: AgoraWhiteboardService,
      useFactory: (sessionRepo: Repository<TutorClassSessionEntity>) =>
        new AgoraWhiteboardService(sessionRepo, readAgoraConfig()),
      inject: [getRepositoryToken(TutorClassSessionEntity)],
    },
    OnlineClassService,
    OnlineClassPresenceService,
    OnlineClassResolver,
  ],
  controllers: [AgoraRtcWebhookController],
})
export class AgoraModule {}
