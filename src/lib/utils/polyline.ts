export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
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

    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
  ): number {
  const R = 6371;
  const dLat = toRadians(p2.lat - p1.lat);
  const dLng = toRadians(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(p1.lat)) *
      Math.cos(toRadians(p2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function pointToSegmentDistance(
  point: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const cosLat = Math.cos(toRadians((a.lat + b.lat) / 2));
  const ax = a.lng * cosLat;
  const ay = a.lat;
  const bx = b.lng * cosLat;
  const by = b.lat;
  const px = point.lng * cosLat;
  const py = point.lat;

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return haversineDistance(point, a);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  const projLat = projY;
  const projLng = cosLat !== 0 ? projX / cosLat : 0;

  return haversineDistance(point, { lat: projLat, lng: projLng });
}

export function minDistanceToRoute(
  point: { lat: number; lng: number },
  route: Array<{ lat: number; lng: number }>
): number {
  if (route.length === 0) return Infinity;
  if (route.length === 1) return haversineDistance(point, route[0]);

  let minDist = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const dist = pointToSegmentDistance(point, route[i], route[i + 1]);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}