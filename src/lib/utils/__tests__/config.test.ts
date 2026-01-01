import { describe, it, expect } from 'vitest';
import { calculateBoundingBox } from '../config';

describe('calculateBoundingBox', () => {
  it('should calculate bounding box with 20km radius', () => {
    // Adelaide CBD coordinates
    const center = {
      latitude: -34.9285,
      longitude: 138.6007
    };

    const bbox = calculateBoundingBox(center, 20);

    // Check that the bounding box is approximately correct
    // At this latitude, 20km is roughly 0.18 degrees latitude
    const latDelta = Math.abs(bbox.neLat - center.latitude);
    const lngDelta = Math.abs(bbox.neLng - center.longitude);

    // Latitude should be approximately 0.18 degrees (20km / 111km per degree)
    expect(latDelta).toBeCloseTo(0.18, 1);
    
    // Longitude delta will be larger due to latitude correction
    // At -34.9285 latitude, 1 degree longitude is approximately 92km
    // So 20km should be roughly 0.217 degrees
    expect(lngDelta).toBeCloseTo(0.217, 1);

    // Check that southwest corner is opposite
    expect(bbox.swLat).toBeLessThan(center.latitude);
    expect(bbox.swLng).toBeLessThan(center.longitude);
    
    // Check that northeast corner is opposite
    expect(bbox.neLat).toBeGreaterThan(center.latitude);
    expect(bbox.neLng).toBeGreaterThan(center.longitude);
  });

  it('should calculate bounding box with custom radius', () => {
    const center = {
      latitude: -34.9285,
      longitude: 138.6007
    };

    const bbox10 = calculateBoundingBox(center, 10);
    const bbox20 = calculateBoundingBox(center, 20);

    // 20km radius should be roughly double the 10km radius
    const latDelta10 = Math.abs(bbox10.neLat - center.latitude);
    const latDelta20 = Math.abs(bbox20.neLat - center.latitude);

    expect(latDelta20 / latDelta10).toBeCloseTo(2, 1);
  });

  it('should handle locations at different latitudes', () => {
    // Test at equator
    const equator = {
      latitude: 0,
      longitude: 0
    };

    const bboxEquator = calculateBoundingBox(equator, 20);
    
    // At the equator, latitude and longitude deltas should be similar
    const latDeltaEquator = Math.abs(bboxEquator.neLat - equator.latitude);
    const lngDeltaEquator = Math.abs(bboxEquator.neLng - equator.longitude);
    
    expect(latDeltaEquator).toBeCloseTo(lngDeltaEquator, 1);

    // Test at higher latitude (Sydney)
    const sydney = {
      latitude: -33.8688,
      longitude: 151.2093
    };

    const bboxSydney = calculateBoundingBox(sydney, 20);
    
    // At higher latitudes, longitude delta should be larger than latitude delta
    const latDeltaSydney = Math.abs(bboxSydney.neLat - sydney.latitude);
    const lngDeltaSydney = Math.abs(bboxSydney.neLng - sydney.longitude);
    
    expect(lngDeltaSydney).toBeGreaterThan(latDeltaSydney);
  });
});
