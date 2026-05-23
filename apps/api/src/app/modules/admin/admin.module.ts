import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Tutor } from '../tutor/entities/tutor.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Tutor]), AuthModule],
  providers: [AdminService, AdminResolver, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
