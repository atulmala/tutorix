import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import './enums/platform-fee-code.enum';
import './enums/platform-fee-discount-type.enum';
import { PlatformFeeConfigEntity } from './entities/platform-fee-config.entity';
import { PlatformFeeService } from './services/platform-fee.service';
import { PlatformFeeResolver } from './resolvers/platform-fee.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformFeeConfigEntity])],
  providers: [PlatformFeeService, PlatformFeeResolver],
  exports: [PlatformFeeService],
})
export class PlatformFeeModule {}
