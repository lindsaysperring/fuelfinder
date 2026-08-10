import {
  Client,
  LatLng,
  TravelMode,
  TravelRestriction
} from '@googlemaps/google-maps-services-js';

interface DirectionsParams {
  origin: LatLng;
  destination: LatLng;
  mode: TravelMode;
  key: string;
  waypoints?: LatLng[];
  avoid?: TravelRestriction[];
}

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

export function computeDetourAndDistanceKm(
  legs: Array<{ distance: { value: number } }>,
  originalDistanceKm: number
): { detourKm: number; distanceToDestinationKm: number } {
  const waypointDistanceKm =
    legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000;
  const lastLeg = legs[legs.length - 1];
  const distanceToDestinationKm = lastLeg ? lastLeg.distance.value / 1000 : 0;
  return {
    detourKm: Math.max(0, waypointDistanceKm - originalDistanceKm),
    distanceToDestinationKm
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
    destination: Coordinates,
    avoidTolls: boolean
  ): Promise<RouteResult | null> {
    try {
      const client = this.getClient();
      const params: DirectionsParams = {
        origin: { lat: origin.latitude, lng: origin.longitude },
        destination: { lat: destination.latitude, lng: destination.longitude },
        mode: TravelMode.driving,
        key: this.apiKey!
      };
      if (avoidTolls) params.avoid = [TravelRestriction.tolls];
      const response = await client.directions({ params });

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

  static async getStationRoute(
    origin: Coordinates,
    station: Coordinates,
    destination: Coordinates,
    originalDistanceKm: number,
    avoidTolls: boolean
  ): Promise<{ detourKm: number; distanceToDestinationKm: number } | null> {
    try {
      const client = this.getClient();
      const params: DirectionsParams = {
        origin: { lat: origin.latitude, lng: origin.longitude },
        destination: { lat: destination.latitude, lng: destination.longitude },
        waypoints: [{ lat: station.latitude, lng: station.longitude }],
        mode: TravelMode.driving,
        key: this.apiKey!
      };
      if (avoidTolls) params.avoid = [TravelRestriction.tolls];
      const waypointRoute = await client.directions({ params });

      if (!waypointRoute.data.routes?.length) {
        return null;
      }

      return computeDetourAndDistanceKm(
        waypointRoute.data.routes[0].legs,
        originalDistanceKm
      );
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