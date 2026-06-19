import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment';
import { Student } from './entities/student.entity';
import { StudentService } from './services/student.service';
import { StudentDetailService } from './services/student-detail.service';
import { StudentResolver } from './resolvers/student.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Student]), forwardRef(() => AuthModule), forwardRef(() => PaymentModule)],
  providers: [StudentService, StudentDetailService, StudentResolver],
  exports: [StudentService, StudentDetailService],
})
export class StudentModule {}
