/**
 * Configuration utilities for environment variables
 * This file centralizes access to environment variables and provides defaults
 */

import type { Coordinates } from './google-maps';

export interface BoundingBox {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
}

/**
 * Get the default home center coordinates from environment variables
 * Falls back to a default location if not configured
 */
export function getHomeCenter(): Coordinates {
  const latitude = process.env.NEXT_PUBLIC_HOME_LATITUDE 
    ? Number.parseFloat(process.env.NEXT_PUBLIC_HOME_LATITUDE)
    : -34.9285; // Default: Adelaide, Australia

  const longitude = process.env.NEXT_PUBLIC_HOME_LONGITUDE
    ? Number.parseFloat(process.env.NEXT_PUBLIC_HOME_LONGITUDE)
    : 138.6007;

  return {
    latitude,
    longitude
  };
}

/**
 * Calculate a bounding box around a center point with a given radius
 * @param center - The center coordinates
 * @param radiusKm - The radius in kilometers (default: 20km)
 * @returns BoundingBox object with northeast and southwest corners
 */
export function calculateBoundingBox(center: Coordinates, radiusKm: number = 20): BoundingBox {
  // Earth's radius in kilometers
  const earthRadiusKm = 6371;
  
  // Convert radius to angular distance in radians
  const angularDistance = radiusKm / earthRadiusKm;
  
  // Convert center latitude to radians
  const latRad = (center.latitude * Math.PI) / 180;
  
  // Calculate the latitude delta (same in all directions)
  const latDelta = (angularDistance * 180) / Math.PI;
  
  // Calculate the longitude delta (varies with latitude)
  // At higher latitudes, longitude lines are closer together
  const lngDelta = (angularDistance * 180) / (Math.PI * Math.cos(latRad));
  
  // Calculate bounding box corners
  const neLat = center.latitude + latDelta;
  const neLng = center.longitude + lngDelta;
  const swLat = center.latitude - latDelta;
  const swLng = center.longitude - lngDelta;
  
  return {
    neLat,
    neLng,
    swLat,
    swLng
  };
}
