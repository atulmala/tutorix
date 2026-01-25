import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { AddressEntity } from '../entities/address.entity';
import { GeocodingService } from './geocoding.service';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorService } from '../../tutor/services/tutor.service';
import { LocationSuggestion } from '../dto/location-suggestion.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(AddressEntity)
    private readonly addressRepository: Repository<AddressEntity>,
    private readonly geocodingService: GeocodingService,
    private readonly tutorService: TutorService,
  ) {}

  /**
   * Search for location suggestions based on query string
   * Uses Nominatim search API for autocomplete
   */
  async searchLocations(query: string): Promise<LocationSuggestion[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      // Use Nominatim search API for autocomplete
      const httpClient = axios.create({
        timeout: 10000,
      });

      const url = 'https://nominatim.openstreetmap.org/search';
      const response = await httpClient.get(url, {
        params: {
          q: query,
          format: 'json',
          limit: 10,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'Tutorix-App/1.0',
        },
      });

      if (response.data && Array.isArray(response.data)) {
        return response.data.map((result: any) => ({
          displayName: result.display_name,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          city: result.address?.city || result.address?.town || result.address?.village,
          state: result.address?.state,
          country: result.address?.country,
          postalCode: result.address?.postcode,
        }));
      }

      return [];
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  }

  /**
   * Create an address for a tutor
   */
  async createAddressForTutor(
    tutorId: number,
    addressData: {
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
    // Verify tutor exists
    const tutor = await this.tutorService.findOne(tutorId);

    // If coordinates not provided, geocode the address
    let latitude = addressData.latitude;
    let longitude = addressData.longitude;

    if (!latitude || !longitude) {
      const addressString = addressData.fullAddress || 
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
        const geocodeResult = await this.geocodingService.geocodeAddress(addressString);
        if (geocodeResult) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
        }
      }
    }

    const address = this.addressRepository.create({
      tutor: { id: tutorId } as Tutor,
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
      primary: true, // First address is primary
    });

    const savedAddress = await this.addressRepository.save(address);

    // Mark onboarding as complete when first address is created
    if (!tutor.onBoardingComplete) {
      await this.tutorService.updateOnboardingStatus(tutorId, true);
    }

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
