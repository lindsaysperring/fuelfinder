declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: HTMLElement, opts?: MapOptions);
      fitBounds(bounds: LatLngBounds, padding?: number): void;
      panTo(latLng: LatLng | LatLngLiteral): void;
    }

    interface MapOptions {
      mapId?: string;
      zoom?: number;
      center?: LatLng | LatLngLiteral;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor();
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      getCenter(): LatLng;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    class Polyline {
      constructor(opts?: PolylineOptions);
      setMap(map: Map | null): void;
    }

    interface PolylineOptions {
      path?: LatLng[];
      geodesic?: boolean;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      map?: Map;
    }

    namespace places {
      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
        addListener(eventName: string, handler: () => void): void;
        getPlace(): PlaceResult;
      }

      interface AutocompleteOptions {
        fields?: string[];
      }

      interface PlaceResult {
        formatted_address?: string;
        geometry?: {
          location?: LatLng;
        };
      }

      class PlaceAutocompleteElement extends HTMLElement {
        constructor(opts?: PlaceAutocompleteOptions);
        setAttribute(qualifiedName: string, value: string): void;
        value: string;
      }

      interface PlaceAutocompleteOptions {
        includedRegionCodes?: string[];
      }

      class Place {
        fetchFields(opts: { fields: string[] }): Promise<void>;
        formattedAddress?: string;
        location?: LatLng;
      }

      interface PlacePrediction {
        toPlace(): Place;
      }

      interface PlacePredictionSelectEvent extends Event {
        placePrediction: PlacePrediction;
      }
    }

    namespace marker {
      class AdvancedMarkerElement {
        constructor(opts?: AdvancedMarkerElementOptions);
        setMap(map: Map | null): void;
      }

      interface AdvancedMarkerElementOptions {
        position?: LatLng | LatLngLiteral;
        map?: Map;
        content?: HTMLElement;
        title?: string;
      }

      class PinElement {
        constructor(opts?: PinElementOptions);
        element: HTMLElement;
      }

      interface PinElementOptions {
        scale?: number;
        background?: string;
        borderColor?: string;
        glyphColor?: string;
      }
    }

    class Geocoder {
      constructor();
      geocode(request: GeocoderRequest): Promise<GeocoderResponse>;
    }

    interface GeocoderRequest {
      location?: LatLng | LatLngLiteral;
    }

    interface GeocoderResponse {
      results: GeocoderResult[];
    }

    interface GeocoderResult {
      formatted_address?: string;
      geometry?: {
        location?: LatLng;
      };
    }

    namespace event {
      function clearInstanceListeners(instance: unknown): void;
    }
  }
}

interface Window {
  google?: typeof google;
}