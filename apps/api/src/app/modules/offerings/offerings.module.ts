import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import './enums/offering-category.enum';
import './enums/teaching-language.enum';
import { OfferingEntity } from './entities/offering.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OfferingEntity])],
  providers: [],
  exports: [],
})
export class OfferingsModule {}
