import { Client, TravelMode } from '@googlemaps/google-maps-services-js';
import type { Coordinates } from '@/types';
import type { DirectionsResult } from '@/types';

export class GoogleDirectionsService {
  private readonly client: Client;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.client = new Client({});
    this.apiKey = apiKey;
  }

  async getDirections(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<DirectionsResult> {
    const response = await this.client.directions({
      params: {
        origin: { lat: origin.latitude, lng: origin.longitude },
        destination: { lat: destination.latitude, lng: destination.longitude },
        mode: TravelMode.driving,
        key: this.apiKey,
      },
    });

    const route = response.data.routes[0];
    if (!route) {
      throw new Error('No route found between the specified locations');
    }

    const totalDistanceM = route.legs.reduce(
      (sum, leg) => sum + (leg.distance?.value ?? 0),
      0
    );
    const totalDurationS = route.legs.reduce(
      (sum, leg) => sum + (leg.duration?.value ?? 0),
      0
    );
    const encodedPolyline = route.overview_polyline.points;

    return {
      encodedPolyline,
      totalDistanceKm: totalDistanceM / 1000,
      totalDurationSeconds: totalDurationS,
      waypointCoords: decodePolyline(encodedPolyline),
    };
  }
}

/**
 * Decodes a Google Maps encoded polyline into an array of coordinates.
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): Coordinates[] {
  const coords: Coordinates[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coords;
}
