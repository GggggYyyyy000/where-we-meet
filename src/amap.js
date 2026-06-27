import { distanceMeters, formatLocation, parseLocation } from "./geo.js";

const BASE_URL = "https://restapi.amap.com";

export class AmapClient {
  constructor(key, options = {}) {
    if (!key) {
      throw new Error(
        [
          "缺少 AMAP_KEY。",
          "",
          "请在项目根目录创建 .env，并配置高德 Web 服务 Key：",
          "",
          "AMAP_KEY=你的高德Web服务Key",
          "",
          "如果还想让 HTML 打开后自动加载地图，也可以继续配置：",
          "AMAP_JSAPI_KEY=你的高德JSAPI Web端Key",
          "AMAP_SECURITY_JS_CODE=你的高德JSAPI安全密钥"
        ].join("\n")
      );
    }
    this.key = key;
    this.requestIntervalMs = options.requestIntervalMs ?? 600;
    this.nextRequestAt = 0;
  }

  async geocode(address, city) {
    const data = await this.#request("/v3/geocode/geo", {
      address,
      city
    });

    if (!data.geocodes?.length) {
      throw new Error(`地理编码失败：${address}`);
    }

    const best = data.geocodes[0];
    return {
      address,
      formattedAddress: best.formatted_address,
      location: best.location,
      ...parseLocation(best.location)
    };
  }

  async searchAround({ point, keyword, city, radius, offset = 25, page = 1 }) {
    const data = await this.#request("/v3/place/around", {
      location: formatLocation(point),
      keywords: keyword,
      city,
      radius,
      offset,
      page,
      extensions: "all",
      sortrule: "weight"
    });

    return (data.pois || []).map((poi) => ({
      id: poi.id,
      name: poi.name,
      type: poi.type,
      address: Array.isArray(poi.address) ? poi.address.join("") : poi.address,
      location: poi.location,
      distance: Number(poi.distance || 0),
      tel: Array.isArray(poi.tel) ? poi.tel.join(";") : poi.tel,
      rating: Number(poi.biz_ext?.rating || 0),
      cost: Number(poi.biz_ext?.cost || 0)
    }));
  }

  async createPersonalMap({ orgName, lineList, sceneType = 2 }) {
    await this.#throttle();

    const url = new URL("/rest/wia/mcp/schema", BASE_URL);
    url.searchParams.set("key", this.key);
    url.searchParams.set("source", "personal-map");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: "60000001",
        orgName,
        lineList,
        sceneType
      })
    });

    if (!response.ok) {
      throw new Error(`高德个人地图 HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 1 || data.result !== true) {
      throw new Error(`高德个人地图生成失败：${data.message || data.info || "unknown"}`);
    }

    const schemaUrl = data.data?.schemaUrl;
    if (!schemaUrl) {
      throw new Error("高德个人地图生成失败：未返回 schemaUrl");
    }

    return { schemaUrl, raw: data };
  }

  async reverseGeocode(point) {
    const data = await this.#request("/v3/geocode/regeo", {
      location: formatLocation(point),
      extensions: "base"
    });

    const component = data.regeocode?.addressComponent || {};
    const businessArea = Array.isArray(component.businessAreas)
      ? component.businessAreas.find((area) => area?.name)?.name
      : "";

    return {
      formattedAddress: data.regeocode?.formatted_address || "",
      province: component.province || "",
      city: component.city || "",
      district: component.district || "",
      township: component.township || "",
      businessArea: businessArea || ""
    };
  }

  async routeDuration(origin, destination, mode, city) {
    if (mode === "transit") {
      return this.#transitDuration(origin, destination, city);
    }
    if (mode === "driving") {
      return this.#pathDuration("/v3/direction/driving", origin, destination);
    }
    if (mode === "walking") {
      return this.#pathDuration("/v3/direction/walking", origin, destination);
    }
    throw new Error(`不支持的交通方式：${mode}`);
  }

  async #transitDuration(origin, destination, city) {
    if (distanceMeters(origin, destination) < 1200) {
      return this.#pathDuration("/v3/direction/walking", origin, destination);
    }

    const data = await this.#request("/v3/direction/transit/integrated", {
      origin: formatLocation(origin),
      destination: formatLocation(destination),
      city,
      cityd: city,
      strategy: 0
    });

    const transits = data.route?.transits || [];
    const durations = transits
      .map((route) => Number(route.duration))
      .filter((duration) => Number.isFinite(duration) && duration > 0);

    if (!durations.length) {
      throw new Error(`公交路径规划失败：${formatLocation(origin)} -> ${formatLocation(destination)}`);
    }

    return Math.min(...durations) / 60;
  }

  async #pathDuration(path, origin, destination) {
    const data = await this.#request(path, {
      origin: formatLocation(origin),
      destination: formatLocation(destination),
      strategy: 0
    });

    const durations = (data.route?.paths || [])
      .map((route) => Number(route.duration))
      .filter((duration) => Number.isFinite(duration) && duration > 0);

    if (!durations.length) {
      throw new Error(`路径规划失败：${formatLocation(origin)} -> ${formatLocation(destination)}`);
    }

    return Math.min(...durations) / 60;
  }

  async #request(path, params) {
    await this.#throttle();

    const url = new URL(path, BASE_URL);
    url.searchParams.set("key", this.key);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`高德 API HTTP ${response.status}: ${url.pathname}`);
    }

    const data = await response.json();
    if (data.status !== "1") {
      throw new Error(`高德 API 错误：${data.info || "unknown"} (${data.infocode || "no infocode"})`);
    }
    return data;
  }

  async #throttle() {
    const now = Date.now();
    const waitMs = Math.max(0, this.nextRequestAt - now);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.nextRequestAt = Date.now() + this.requestIntervalMs;
  }
}
