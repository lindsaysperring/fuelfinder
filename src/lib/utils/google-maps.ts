import { Client, TravelMode } from '@googlemaps/google-maps-services-js';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class GoogleMapsService {
  private readonly client: Client;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.client = new Client({});
    this.apiKey = apiKey;
  }

  async calculateDistance(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<number> {
    try {
      const response = await this.client.distancematrix({
        params: {
          origins: [{ lat: origin.latitude, lng: origin.longitude }],
          destinations: [
            { lat: destination.latitude, lng: destination.longitude }
          ],
          mode: TravelMode.driving,
          key: this.apiKey
        }
      });

      if (response.data.rows[0]?.elements[0]?.distance) {
        return response.data.rows[0].elements[0].distance.value / 1000; // Convert meters to kilometers
      }

      throw new Error('No distance data returned from Google Maps API');
    } catch (error) {
      console.error('Error calculating distance:', error);
      throw error;
    }
  }
}

// Export utility functions
export { calculateBoundingBox } from './config';
export type { BoundingBox } from './config';




