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
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}