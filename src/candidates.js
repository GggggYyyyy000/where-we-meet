import { centroid, pairMidpoints } from "./geo.js";

export async function buildCandidates(client, input, peoplePoints) {
  const radii = input.searchRadii || [1500, 3000, 5000];
  const seeds = [centroid(peoplePoints), ...pairMidpoints(peoplePoints)];
  const raw = [];

  for (const keyword of input.poiKeywords) {
    for (const seed of seeds) {
      for (const radius of radii) {
        const pois = await client.searchAround({
          point: seed,
          keyword,
          city: input.city,
          radius,
          offset: 25,
          page: 1
        });
        raw.push(...pois.map((poi) => ({
          ...poi,
          matchedKeyword: keyword,
          matchedKeywords: [keyword]
        })));
      }
    }
  }

  const candidates = dedupePois(raw)
    .filter((poi) => poi.location && poi.name)
    .filter((poi) => matchesRequiredTerms(poi, input.poiTypeIncludes))
    .sort(comparePoiQuality)
    .slice(0, input.candidateLimit || 100);

  if (!candidates.length) {
    throw new Error("没有找到候选 POI，请更换 poiKeyword/poiKeywords 或扩大 searchRadii");
  }

  return candidates;
}

function dedupePois(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = item.id || item.location;
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    const matchedKeywords = new Set([
      ...(existing.matchedKeywords || []),
      ...(item.matchedKeywords || [])
    ]);
    existing.matchedKeywords = [...matchedKeywords];
    existing.matchedKeyword ||= item.matchedKeyword;
  }
  return [...byKey.values()];
}

function matchesRequiredTerms(poi, requiredTerms) {
  if (!Array.isArray(requiredTerms) || requiredTerms.length === 0) return true;
  const haystack = `${poi.name || ""} ${poi.type || ""}`.toLowerCase();
  return requiredTerms.some((term) => haystack.includes(String(term).toLowerCase()));
}

function comparePoiQuality(a, b) {
  const ratingDelta = (b.rating || 0) - (a.rating || 0);
  if (Math.abs(ratingDelta) > 1e-9) return ratingDelta;
  return (a.distance || 0) - (b.distance || 0);
}
