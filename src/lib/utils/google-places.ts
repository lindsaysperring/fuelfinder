import { Client } from '@googlemaps/google-maps-services-js';
import type { Coordinates, PlaceSuggestion } from '@/types';

export class GooglePlacesService {
  private readonly client: Client;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.client = new Client({});
    this.apiKey = apiKey;
  }

  async autocomplete(
    input: string,
    sessionToken?: string
  ): Promise<PlaceSuggestion[]> {
    const response = await this.client.placeAutocomplete({
      params: {
        input,
        key: this.apiKey,
        ...(sessionToken && { sessiontoken: sessionToken }),
      },
    });

    return response.data.predictions.map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? '',
    }));
  }

  async geocodePlaceId(placeId: string): Promise<Coordinates> {
    const response = await this.client.geocode({
      params: {
        place_id: placeId,
        key: this.apiKey,
      },
    });

    const result = response.data.results[0];
    if (!result) {
      throw new Error('No geocoding result found for this place');
    }

    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
    };
  }

  async geocodeAddress(address: string): Promise<Coordinates> {
    const response = await this.client.geocode({
      params: {
        address,
        key: this.apiKey,
      },
    });

    const result = response.data.results[0];
    if (!result) {
      throw new Error(`Could not geocode address: ${address}`);
    }

    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
    };
  }
}
