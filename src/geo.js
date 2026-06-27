export function centroid(points) {
  const sum = points.reduce(
    (acc, point) => {
      acc.lng += point.lng;
      acc.lat += point.lat;
      return acc;
    },
    { lng: 0, lat: 0 }
  );

  return {
    lng: sum.lng / points.length,
    lat: sum.lat / points.length
  };
}

export function distanceMeters(a, b) {
  const earthRadius = 6371000;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

export function pairMidpoints(points) {
  const result = [];
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      result.push({
        lng: (points[i].lng + points[j].lng) / 2,
        lat: (points[i].lat + points[j].lat) / 2
      });
    }
  }
  return result;
}

export function formatLocation(point) {
  return `${point.lng},${point.lat}`;
}

export function parseLocation(location) {
  const [lng, lat] = location.split(",").map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new Error(`非法坐标：${location}`);
  }
  return { lng, lat };
}

export function dedupeByLocation(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.location;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
