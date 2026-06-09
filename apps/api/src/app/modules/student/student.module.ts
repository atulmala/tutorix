import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { StudentService } from './services/student.service';
import { StudentResolver } from './resolvers/student.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  providers: [StudentService, StudentResolver],
  exports: [StudentService],
})
export class StudentModule {}
