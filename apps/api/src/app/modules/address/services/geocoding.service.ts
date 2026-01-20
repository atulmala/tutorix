import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

export enum GeocodingProvider {
  NOMINATIM = 'nominatim', // OpenStreetMap - Free, no API key needed
  GOOGLE_MAPS = 'google', // Google Maps - Requires API key
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly httpClient: AxiosInstance;
  private readonly provider: GeocodingProvider;
  private readonly googleApiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.httpClient = axios.create({
      timeout: 10000, // 10 seconds timeout
    });

    // Determine which provider to use (default to Nominatim if no Google API key)
    this.googleApiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    this.provider = this.googleApiKey
      ? GeocodingProvider.GOOGLE_MAPS
      : GeocodingProvider.NOMINATIM;

    this.logger.log(
      `Geocoding service initialized with provider: ${this.provider}`,
    );
  }

  /**
   * Geocode an address string to latitude and longitude
   * @param address - Full address string or address components
   * @returns GeocodingResult with latitude and longitude
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      if (this.provider === GeocodingProvider.GOOGLE_MAPS) {
        return await this.geocodeWithGoogle(address);
      } else {
        return await this.geocodeWithNominatim(address);
      }
    } catch (error) {
      this.logger.error(`Geocoding failed for address: ${address}`, error);
      return null;
    }
  }

  /**
   * Geocode using address components
   * @param addressComponents - Object with address components
   * @returns GeocodingResult with latitude and longitude
   */
  async geocodeAddressComponents(addressComponents: {
    street?: string;
    subArea?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: number;
    fullAddress?: string;
  }): Promise<GeocodingResult | null> {
    // Build address string from components
    const addressParts: string[] = [];

    if (addressComponents.fullAddress) {
      addressParts.push(addressComponents.fullAddress);
    } else {
      if (addressComponents.street) addressParts.push(addressComponents.street);
      if (addressComponents.subArea)
        addressParts.push(addressComponents.subArea);
      if (addressComponents.city) addressParts.push(addressComponents.city);
      if (addressComponents.state) addressParts.push(addressComponents.state);
      if (addressComponents.postalCode)
        addressParts.push(addressComponents.postalCode.toString());
      if (addressComponents.country) addressParts.push(addressComponents.country);
    }

    const addressString = addressParts.join(', ');
    return this.geocodeAddress(addressString);
  }

  /**
   * Geocode using Google Maps Geocoding API
   */
  private async geocodeWithGoogle(
    address: string,
  ): Promise<GeocodingResult | null> {
    if (!this.googleApiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await this.httpClient.get(url, {
      params: {
        address,
        key: this.googleApiKey,
      },
    });

    if (
      response.data.status === 'OK' &&
      response.data.results &&
      response.data.results.length > 0
    ) {
      const result = response.data.results[0];
      const location = result.geometry.location;

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
      };
    }

    this.logger.warn(
      `Google geocoding returned status: ${response.data.status}`,
    );
    return null;
  }

  /**
   * Geocode using OpenStreetMap Nominatim API (Free, no API key needed)
   * Note: Nominatim has usage limits - max 1 request per second
   */
  private async geocodeWithNominatim(
    address: string,
  ): Promise<GeocodingResult | null> {
    const url = 'https://nominatim.openstreetmap.org/search';
    const response = await this.httpClient.get(url, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'Tutorix-App/1.0', // Required by Nominatim
      },
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];

      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
      };
    }

    return null;
  }

  /**
   * Reverse geocode: Convert latitude/longitude to address
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns Formatted address string
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<string | null> {
    try {
      if (this.provider === GeocodingProvider.GOOGLE_MAPS) {
        return await this.reverseGeocodeWithGoogle(latitude, longitude);
      } else {
        return await this.reverseGeocodeWithNominatim(latitude, longitude);
      }
    } catch (error) {
      this.logger.error(
        `Reverse geocoding failed for coordinates: ${latitude}, ${longitude}`,
        error,
      );
      return null;
    }
  }

  private async reverseGeocodeWithGoogle(
    latitude: number,
    longitude: number,
  ): Promise<string | null> {
    if (!this.googleApiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await this.httpClient.get(url, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: this.googleApiKey,
      },
    });

    if (
      response.data.status === 'OK' &&
      response.data.results &&
      response.data.results.length > 0
    ) {
      return response.data.results[0].formatted_address;
    }

    return null;
  }

  private async reverseGeocodeWithNominatim(
    latitude: number,
    longitude: number,
  ): Promise<string | null> {
    const url = 'https://nominatim.openstreetmap.org/reverse';
    const response = await this.httpClient.get(url, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'Tutorix-App/1.0',
      },
    });

    if (response.data && response.data.display_name) {
      return response.data.display_name;
    }

    return null;
  }
}
