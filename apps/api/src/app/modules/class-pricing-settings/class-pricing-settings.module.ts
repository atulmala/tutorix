import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassPricingSettingsEntity } from './entities/class-pricing-settings.entity';
import { ClassPricingSettingsResolver } from './resolvers/class-pricing-settings.resolver';
import { ClassPricingSettingsService } from './services/class-pricing-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClassPricingSettingsEntity])],
  providers: [ClassPricingSettingsService, ClassPricingSettingsResolver],
  exports: [ClassPricingSettingsService],
})
export class ClassPricingSettingsModule {}
