import { Client, TravelMode } from '@googlemaps/google-maps-services-js';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  polyline: string;
  distance: number;
  duration: number;
  bounds: {
    neLat: number;
    neLng: number;
    swLat: number;
    swLng: number;
  };
}

interface DirectionsError {
  response?: {
    data?: {
      status?: string;
      error_message?: string;
    };
  };
}

export class RouteService {
  private static client: Client | null = null;
  private static apiKey: string | null = null;

  private static getClient(): Client {
    if (!this.client) {
      this.apiKey = process.env.GOOGLE_MAPS_API_KEY ?? null;
      if (!this.apiKey) {
        throw new Error('GOOGLE_MAPS_API_KEY is not configured');
      }
      this.client = new Client({});
    }
    return this.client;
  }

  static async getRoute(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<RouteResult | null> {
    try {
      const client = this.getClient();
      const response = await client.directions({
        params: {
          origin: { lat: origin.latitude, lng: origin.longitude },
          destination: { lat: destination.latitude, lng: destination.longitude },
          mode: TravelMode.driving,
          key: this.apiKey!
        }
      });

      if (response.data.status === 'ZERO_RESULTS' || !response.data.routes?.length) {
        return null;
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      return {
        polyline: route.overview_polyline?.points ?? '',
        distance: leg.distance.value / 1000,
        duration: leg.duration.value,
        bounds: {
          neLat: route.bounds.northeast.lat,
          neLng: route.bounds.northeast.lng,
          swLat: route.bounds.southwest.lat,
          swLng: route.bounds.southwest.lng
        }
      };
    } catch (error) {
      const apiError = error as DirectionsError;
      if (apiError?.response?.data) {
        const { status, error_message } = apiError.response.data;
        throw new Error(`Directions API error (${status}): ${error_message}`);
      }
      throw error;
    }
  }

  static async getExactDetour(
    origin: Coordinates,
    station: Coordinates,
    destination: Coordinates
  ): Promise<number | null> {
    try {
      const client = this.getClient();
      const [originalRoute, waypointRoute] = await Promise.all([
        client.directions({
          params: {
            origin: { lat: origin.latitude, lng: origin.longitude },
            destination: { lat: destination.latitude, lng: destination.longitude },
            mode: TravelMode.driving,
            key: this.apiKey!
          }
        }),
        client.directions({
          params: {
            origin: { lat: origin.latitude, lng: origin.longitude },
            destination: { lat: destination.latitude, lng: destination.longitude },
            waypoints: [{ lat: station.latitude, lng: station.longitude }],
            mode: TravelMode.driving,
            key: this.apiKey!
          }
        })
      ]);

      if (
        !originalRoute.data.routes?.length ||
        !waypointRoute.data.routes?.length
      ) {
        return null;
      }

      const originalDistance =
        originalRoute.data.routes[0].legs.reduce(
          (sum, leg) => sum + leg.distance.value,
          0
        ) / 1000;

      const waypointDistance =
        waypointRoute.data.routes[0].legs.reduce(
          (sum, leg) => sum + leg.distance.value,
          0
        ) / 1000;

      return waypointDistance - originalDistance;
    } catch (error) {
      const apiError = error as DirectionsError;
      if (apiError?.response?.data) {
        const { status, error_message } = apiError.response.data;
        throw new Error(`Directions API error (${status}): ${error_message}`);
      }
      throw error;
    }
  }
}