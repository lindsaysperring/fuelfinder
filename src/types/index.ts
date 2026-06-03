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

export interface RouteStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  location: { lat: number; lng: number };
  pricePerLiter: number;
  discount: number;
  approxDetour: number;
  exactDetour: number | null;
  travelCost: number;
  totalCost: number;
}

export interface RouteData {
  polyline: string;
  distance: number;
  duration: number;
  bounds: BoundingBox;
}

export interface BoundingBox {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
}

export type SearchTab = 'nearby' | 'route';

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
  activeTab?: SearchTab;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}