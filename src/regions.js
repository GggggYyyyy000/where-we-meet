import { centroid, distanceMeters, parseLocation } from "./geo.js";

export function buildRegions(candidates, input) {
  const clusterRadiusMeters = input.clusterRadiusMeters || 1200;
  const sorted = candidates
    .map((candidate) => ({
      ...candidate,
      point: parseLocation(candidate.location)
    }))
    .sort(compareShopQuality);

  const regions = [];

  for (const shop of sorted) {
    const region = regions.find((item) => distanceMeters(item.center, shop.point) <= clusterRadiusMeters);
    if (region) {
      region.shops.push(shop);
      region.center = centroid(region.shops.map((item) => item.point));
    } else {
      regions.push({
        id: `region_${regions.length + 1}`,
        center: shop.point,
        shops: [shop]
      });
    }
  }

  return regions
    .map((region) => ({
      ...region,
      shops: region.shops.sort(compareShopQuality),
      shopCount: region.shops.length,
      bestRating: Math.max(...region.shops.map((shop) => shop.rating || 0)),
      averageRating: average(region.shops.map((shop) => shop.rating || 0).filter((rating) => rating > 0))
    }))
    .sort((a, b) => b.shopCount - a.shopCount || b.bestRating - a.bestRating);
}

export function selectDiverseRegions(rankedRegions, input) {
  const limit = input.regionLimit || input.limit || 5;
  const minDistanceMeters = input.minRegionDistanceMeters || 2000;
  const minShopCount = input.minRegionShopCount || 1;
  const selected = [];

  for (const region of rankedRegions) {
    if (region.shopCount < minShopCount) continue;
    const tooClose = selected.some((item) => distanceMeters(item.center, region.center) < minDistanceMeters);
    if (tooClose) continue;
    selected.push(region);
    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    for (const region of rankedRegions) {
      if (region.shopCount < minShopCount) continue;
      if (selected.some((item) => item.id === region.id)) continue;
      selected.push(region);
      if (selected.length >= limit) break;
    }
  }

  return selected;
}

export async function labelRegions(client, regions) {
  for (const region of regions) {
    const label = await client.reverseGeocode(region.center);
    region.area = label;
    region.name = inferRegionName(region, label);
  }
  return regions;
}

function inferRegionName(region, label) {
  const areaName = label.businessArea || label.township || label.district;
  const anchor = nearestShop(region);
  const anchorName = anchor?.name || region.shops[0]?.name || "候选店";
  if (areaName) return `${areaName} · ${anchorName}附近`;
  return `${anchorName}附近`;
}

function nearestShop(region) {
  return region.shops
    .slice()
    .sort((a, b) => distanceMeters(region.center, a.point) - distanceMeters(region.center, b.point))[0];
}

function compareShopQuality(a, b) {
  const ratingDelta = (b.rating || 0) - (a.rating || 0);
  if (Math.abs(ratingDelta) > 1e-9) return ratingDelta;
  return a.name.localeCompare(b.name, "zh-Hans-CN");
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
