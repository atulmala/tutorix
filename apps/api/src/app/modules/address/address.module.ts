import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressEntity } from './entities/address.entity';
import { GeocodingService } from './services/geocoding.service';
import { AddressService } from './services/address.service';
import { AddressResolver } from './resolvers/address.resolver';
import { TutorModule } from '../tutor/tutor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AddressEntity]),
    ConfigModule,
    TutorModule, // Import TutorModule to access TutorService
  ],
  providers: [GeocodingService, AddressService, AddressResolver],
  exports: [GeocodingService, AddressService, TypeOrmModule], // Export for use in other modules
})
export class AddressModule {}
