import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import './enums/offering-category.enum';
import './enums/teaching-language.enum';
import { OfferingEntity } from './entities/offering.entity';
import { OfferingService } from './services/offering.service';
import { OfferingResolver } from './resolvers/offering.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([OfferingEntity])],
  providers: [OfferingService, OfferingResolver],
  exports: [OfferingService],
})
export class OfferingsModule {}
