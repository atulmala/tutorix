import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../auth/entities/user.entity';
import { EmailSendEntity } from './entities/email-send.entity';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([EmailSendEntity, User])],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
