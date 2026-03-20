export interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  location: {
    x: number;
    y: number;
  };
  prices: Record<string, {
    amount: number;
    type: string;
  }>;
}

export interface StationWithDistance extends Station {
  distance: number;
  travelCost: number;
  totalCost: number;
  pricePerLiter: number;
  discount: number;
}

export interface BrandDiscount {
  brand: string;
  discount: number; // in cents per litre
}

export interface UserSettings {
  fuelEconomy: number;
  selectedFuelType: string;
  lastLocation: Coordinates;
  fillAmount: number;
  brandDiscounts: BrandDiscount[];
  tankSizeLitres: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ── Route Planner types ────────────────────────────────────────────────────────

export type LocationType = 'current' | 'home' | 'address';

export interface RouteEndpoint {
  type: LocationType;
  coordinates?: Coordinates;
  address?: string;
  placeId?: string;
}

export interface RouteSettings {
  start: RouteEndpoint;
  end: RouteEndpoint;
  detourToleranceKm: number;
  arriveFullEnabled: boolean;
}

export interface DirectionsResult {
  encodedPolyline: string;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  waypointCoords: Coordinates[];
}

export interface RouteStation extends StationWithDistance {
  detourKm: number;
  distanceFromStart: number;
  distanceToEnd: number;
  fillAmount: number;
  fillCost: number;
  detourCost: number;
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}