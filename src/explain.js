export function toRecommendations(ranked, people, limit) {
  return ranked.slice(0, limit).map((item, index) => {
    const worstExtraPercent = Math.round(item.metrics.maxRelativeRegret * 100);
    const timeText = people
      .map((person) => `${person.name} ${Math.round(item.travelTimes[person.name])} 分钟`)
      .join("，");

    return {
      rank: index + 1,
      name: item.candidate.name,
      address: item.candidate.address,
      location: item.candidate.location,
      type: item.candidate.type,
      rating: item.candidate.rating || null,
      averageMinutes: item.metrics.meanTravelTime,
      stdMinutes: item.metrics.stdTravelTime,
      maxRelativeRegret: item.metrics.maxRelativeRegret,
      travelTimes: item.travelTimes,
      fairnessReason: `推荐这里，因为最吃亏的人相对个人最优选择额外通勤不超过 ${worstExtraPercent}%，平均通勤 ${Math.round(item.metrics.meanTravelTime)} 分钟；${timeText}。`
    };
  });
}

export function toRegionRecommendations(regions, people) {
  return regions.map((region, index) => {
    const worstExtraPercent = Math.round(region.metrics.maxRelativeRegret * 100);
    const timeText = people
      .map((person) => `${person.name} ${Math.round(region.travelTimes[person.name])} 分钟`)
      .join("，");

    return {
      rank: index + 1,
      name: region.name || `区域 ${index + 1}`,
      center: `${region.center.lng},${region.center.lat}`,
      addressHint: region.area?.formattedAddress || "",
      shopCount: region.shopCount,
      averageMinutes: region.metrics.meanTravelTime,
      maxMinutes: region.metrics.maxTravelTime,
      stdMinutes: region.metrics.stdTravelTime,
      maxRelativeRegret: region.metrics.maxRelativeRegret,
      averageRating: region.metrics.averageRating || null,
      bestRating: region.metrics.bestRating || null,
      travelTimes: region.travelTimes,
      regionReason: `这个区域最吃亏的人相对个人最优区域额外通勤不超过 ${worstExtraPercent}%，平均通勤 ${Math.round(region.metrics.meanTravelTime)} 分钟；${timeText}。区域内找到 ${region.shopCount} 个匹配店铺。`,
      shops: region.shops.map((shop) => ({
        id: shop.id,
        name: shop.name,
        address: shop.address,
        location: shop.location,
        type: shop.type,
        rating: shop.rating || null,
        cost: shop.cost || null,
        tel: shop.tel || ""
      }))
    };
  });
}
