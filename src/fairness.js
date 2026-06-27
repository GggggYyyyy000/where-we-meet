import { parseLocation } from "./geo.js";

export async function rankCandidates(client, input, people, candidates) {
  const evaluated = [];

  for (const candidate of candidates) {
    const destination = parseLocation(candidate.location);
    const travelTimes = {};

    for (const person of people) {
      const minutes = await client.routeDuration(person, destination, person.mode || input.mode, input.city);
      travelTimes[person.name] = round(minutes, 1);
    }

    evaluated.push({
      candidate,
      travelTimes
    });
  }

  const bestByPerson = computeBestByPerson(people, evaluated);

  return evaluated
    .map((item) => withFairnessMetrics(item, people, bestByPerson))
    .sort(compareScore);
}

export async function rankRegions(client, input, people, regions) {
  const evaluated = [];

  for (const region of regions) {
    const travelTimes = {};

    for (const person of people) {
      const minutes = await client.routeDuration(person, region.center, person.mode || input.mode, input.city);
      travelTimes[person.name] = round(minutes, 1);
    }

    evaluated.push({
      region,
      travelTimes
    });
  }

  const bestByPerson = computeBestByPerson(people, evaluated);

  return evaluated
    .map((item) => withRegionFairnessMetrics(item, people, bestByPerson, input))
    .sort(compareScore);
}

function computeBestByPerson(people, evaluated) {
  const best = {};
  for (const person of people) {
    const times = evaluated.map((item) => item.travelTimes[person.name]);
    best[person.name] = Math.min(...times);
  }
  return best;
}

function withFairnessMetrics(item, people, bestByPerson) {
  const times = people.map((person) => item.travelTimes[person.name]);
  const regrets = people.map((person) => {
    const best = bestByPerson[person.name];
    return best <= 0 ? 0 : (item.travelTimes[person.name] - best) / best;
  });

  const meanTime = mean(times);
  const stdTime = std(times, meanTime);
  const maxRelativeRegret = Math.max(...regrets);
  const poiQuality = item.candidate.rating || 0;

  return {
    ...item,
    metrics: {
      maxRelativeRegret: round(maxRelativeRegret, 4),
      stdTravelTime: round(stdTime, 2),
      meanTravelTime: round(meanTime, 2),
      poiQuality
    },
    score: [
      maxRelativeRegret,
      stdTime,
      meanTime,
      -poiQuality
    ]
  };
}

function withRegionFairnessMetrics(item, people, bestByPerson) {
  const times = people.map((person) => item.travelTimes[person.name]);
  const regrets = people.map((person) => {
    const best = bestByPerson[person.name];
    return best <= 0 ? 0 : (item.travelTimes[person.name] - best) / best;
  });

  const meanTime = mean(times);
  const stdTime = std(times, meanTime);
  const maxTravelTime = Math.max(...times);
  const maxRelativeRegret = Math.max(...regrets);
  const quality = item.region.averageRating || item.region.bestRating || 0;

  return {
    ...item.region,
    travelTimes: item.travelTimes,
    metrics: {
      maxRelativeRegret: round(maxRelativeRegret, 4),
      maxTravelTime: round(maxTravelTime, 1),
      stdTravelTime: round(stdTime, 2),
      meanTravelTime: round(meanTime, 2),
      shopCount: item.region.shopCount,
      averageRating: round(item.region.averageRating || 0, 2),
      bestRating: round(item.region.bestRating || 0, 2)
    },
    score: [
      maxTravelTime,
      stdTime,
      meanTime,
      -item.region.shopCount,
      -quality
    ]
  };
}

function compareScore(a, b) {
  for (let i = 0; i < a.score.length; i += 1) {
    const delta = a.score[i] - b.score[i];
    if (Math.abs(delta) > 1e-9) return delta;
  }
  return itemName(a).localeCompare(itemName(b), "zh-Hans-CN");
}

function itemName(item) {
  return item.candidate?.name || item.name || item.shops?.[0]?.name || "";
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values, avg) {
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function round(value, digits) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}
