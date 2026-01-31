import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddressEntity } from '../entities/address.entity';
import { AddressType } from '../enums/address-type.enum';
import { GeocodingService } from './geocoding.service';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorService } from '../../tutor/services/tutor.service';
import { TutorCertificationStageEnum } from '../../tutor/enums/tutor.enums';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(AddressEntity)
    private readonly addressRepository: Repository<AddressEntity>,
    private readonly geocodingService: GeocodingService,
    private readonly tutorService: TutorService,
  ) {}

  /**
   * Create or update an address for a tutor by type (HOME, TEACHING, etc.)
   * If an address with the given type already exists for the tutor, it is overwritten.
   * Otherwise, a new address is created.
   */
  async createAddressForTutor(
    tutorId: number,
    addressData: {
      type?: AddressType;
      street?: string;
      subArea?: string;
      city?: string;
      state?: string;
      country?: string;
      landmark?: string;
      postalCode?: number;
      fullAddress?: string;
      latitude?: number;
      longitude?: number;
    },
  ): Promise<AddressEntity> {
    const addressType = addressData.type ?? AddressType.HOME;

    // Verify tutor exists
    await this.tutorService.findOne(tutorId);

    // If coordinates not provided, geocode the address
    let latitude = addressData.latitude;
    let longitude = addressData.longitude;

    if (!latitude || !longitude) {
      const addressString =
        addressData.fullAddress ||
        [
          addressData.street,
          addressData.subArea,
          addressData.city,
          addressData.state,
          addressData.postalCode?.toString(),
          addressData.country,
        ]
          .filter(Boolean)
          .join(', ');

      if (addressString) {
        const geocodeResult =
          await this.geocodingService.geocodeAddress(addressString);
        if (geocodeResult) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
        }
      }
    }

    // Check if address with this type already exists for the tutor
    const existingAddress = await this.addressRepository.findOne({
      where: {
        tutor: { id: tutorId },
        type: addressType,
        deleted: false,
      },
    });

    if (existingAddress) {
      // Overwrite existing address
      existingAddress.street = addressData.street ?? existingAddress.street;
      existingAddress.subArea = addressData.subArea ?? existingAddress.subArea;
      existingAddress.city = addressData.city ?? existingAddress.city;
      existingAddress.state = addressData.state ?? existingAddress.state;
      existingAddress.country = addressData.country ?? existingAddress.country;
      existingAddress.landmark = addressData.landmark ?? existingAddress.landmark;
      existingAddress.postalCode =
        addressData.postalCode ?? existingAddress.postalCode;
      existingAddress.fullAddress =
        addressData.fullAddress ?? existingAddress.fullAddress;
      existingAddress.latitude = latitude ?? existingAddress.latitude;
      existingAddress.longitude = longitude ?? existingAddress.longitude;

      const saved = await this.addressRepository.save(existingAddress);
      await this.tutorService.updateCertificationStage(
        tutorId,
        TutorCertificationStageEnum.qualificationExperience,
      );
      return saved;
    }

    // No existing address with this type - create new
    const isFirstAddress = !(await this.addressRepository.findOne({
      where: { tutor: { id: tutorId }, deleted: false },
    }));

    const address = this.addressRepository.create({
      tutor: { id: tutorId } as Tutor,
      type: addressType,
      street: addressData.street,
      subArea: addressData.subArea,
      city: addressData.city,
      state: addressData.state,
      country: addressData.country,
      landmark: addressData.landmark,
      postalCode: addressData.postalCode,
      fullAddress: addressData.fullAddress,
      latitude: latitude || 0,
      longitude: longitude || 0,
      verified: false,
      primary: isFirstAddress,
    });

    const savedAddress = await this.addressRepository.save(address);

    // Advance certification stage to next step (qualification & experience)
    await this.tutorService.updateCertificationStage(
      tutorId,
      TutorCertificationStageEnum.qualificationExperience,
    );

    return savedAddress;
  }

  /**
   * Find address by ID
   */
  async findOne(id: number): Promise<AddressEntity> {
    const address = await this.addressRepository.findOne({
      where: { id, deleted: false },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return address;
  }
}
