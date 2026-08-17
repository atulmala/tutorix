import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import './enums/communication-event.enum';
import './enums/communication-channel.enum';
import './enums/communication-audience.enum';
import './enums/device-platform.enum';
import { User } from '../auth/entities/user.entity';
import { EmailModule } from './email/email.module';
import { NotificationModule } from './notification/notification.module';
import { SmsModule } from './sms/sms.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { CommunicationRuleEntity } from './entities/communication-rule.entity';
import { CommunicationTemplateEntity } from './entities/communication-template.entity';
import { CommunicationSendEntity } from './entities/communication-send.entity';
import { UserDeviceTokenEntity } from './entities/user-device-token.entity';
import { TemplateStore } from './template.store';
import { CommunicationDispatcher } from './communication.dispatcher';
import { CommunicationService } from './communication.service';
import { CommunicationAdminService } from './communication.admin.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      CommunicationRuleEntity,
      CommunicationTemplateEntity,
      CommunicationSendEntity,
      UserDeviceTokenEntity,
      User,
    ]),
    EmailModule,
    NotificationModule,
    SmsModule,
    WhatsAppModule,
  ],
  providers: [
    TemplateStore,
    CommunicationDispatcher,
    CommunicationService,
    CommunicationAdminService,
  ],
  exports: [
    EmailModule,
    NotificationModule,
    CommunicationService,
    CommunicationAdminService,
  ],
})
export class CommunicationModule {}
