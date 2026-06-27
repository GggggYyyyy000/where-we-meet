export function normalizeInput(input) {
  const rawText = input.query || input.request || input.prompt || "";

  input.poiKeywords = normalizePoiKeywords(input.poiKeywords ?? input.poiKeyword, rawText);
  input.poiKeyword = input.poiKeywords.join(" / ");

  input.mode = normalizeMode(input.mode, rawText);
  input.regionLimit = normalizeRegionLimit(input.regionLimit ?? input.limit, rawText);
  for (const person of input.people || []) {
    person.mode = normalizePersonMode(person, input.mode);
  }

  const personModes = new Set((input.people || []).map((person) => person.mode));
  input.effectiveMode = personModes.size > 1 ? "mixed" : input.mode;

  applyOutputDefaults(input);
}

export function normalizeMode(mode, text = "") {
  const source = `${mode || ""} ${text || ""}`.toLowerCase();
  if (!source.trim()) return "transit";

  if (/(driving|drive|car|taxi|cab|打车|叫车|网约车|开车|驾车|自驾|出租车)/i.test(source)) {
    return "driving";
  }
  if (/(walking|walk|步行|走路)/i.test(source)) {
    return "walking";
  }
  if (/(transit|public|subway|metro|bus|公交|公共交通|地铁)/i.test(source)) {
    return "transit";
  }
  return mode || "transit";
}

function normalizePoiKeywords(value, text) {
  const keywords = [];
  const append = (item) => {
    const keyword = String(item || "").trim();
    if (keyword) keywords.push(keyword);
  };

  if (Array.isArray(value)) {
    value.forEach(append);
  } else if (typeof value === "string") {
    splitKeywordText(value).forEach(append);
  }

  if (!keywords.length && text) {
    const match = text.match(/(?:想吃|吃个|吃|找个|找一家|找一个)([^，。,.；;]+)/);
    if (match?.[1]) splitKeywordText(match[1]).forEach(append);
  }

  return [...new Set(keywords)];
}

function splitKeywordText(text) {
  return String(text)
    .split(/\s*(?:或者|或|以及|与|和|都行|都可以|、|\/|\||,|，)\s*/u)
    .map((item) => item.replace(/^(个|一家|一个)/u, "").trim())
    .filter(Boolean);
}

function normalizeRegionLimit(value, text) {
  const limit = Number(value);
  if (!Number.isFinite(limit) || limit <= 0) return 5;
  const rounded = Math.floor(limit);
  if (rounded >= 5) return rounded;
  return mentionsExplicitRegionLimit(text, rounded) ? rounded : 5;
}

function mentionsExplicitRegionLimit(text, limit) {
  if (!text) return false;
  const labels = [String(limit), chineseNumber(limit)].filter(Boolean);
  return labels.some((label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `(?:只(?:要|给|看)?\\s*${escaped}\\s*(?:个|处|家)?|` +
      `${escaped}\\s*(?:个|处|家)?\\s*(?:候选|区域|地方|选项)|` +
      `(?:候选|区域|地方|选项)\\s*(?:给|要|看)?\\s*${escaped}\\s*(?:个|处|家)?)`
    ).test(text);
  });
}

function chineseNumber(value) {
  return {
    1: "一",
    2: "二",
    3: "三",
    4: "四"
  }[value] || "";
}

function normalizePersonMode(person, defaultMode) {
  if (person.mode || person.transportMode || person.transport || person.travelMode) {
    return normalizeMode(person.mode || person.transportMode || person.transport || person.travelMode);
  }

  const explicitMode = detectExplicitMode(`${person.address || ""} ${person.note || ""} ${person.description || ""}`);
  return explicitMode || defaultMode;
}

function detectExplicitMode(text) {
  if (/(driving|drive|car|taxi|cab|打车|叫车|网约车|开车|驾车|自驾|出租车)/i.test(text)) {
    return "driving";
  }
  if (/(walking|walk|步行|走路)/i.test(text)) {
    return "walking";
  }
  if (/(transit|public|subway|metro|bus|公交|公共交通|坐地铁|乘地铁|地铁出行)/i.test(text)) {
    return "transit";
  }
  return "";
}

function applyOutputDefaults(input) {
  const slug = input.outputStem || buildOutputStem(input);

  if (input.outputHtml === undefined) {
    input.outputHtml = `output/${slug}.html`;
  }
  if (input.outputSummary === undefined) {
    input.outputSummary = `output/${slug}-summary.md`;
  }

  if (input.outputPersonalMap === undefined) {
    input.outputPersonalMap = {};
  }
  if (input.outputPersonalMap && input.outputPersonalMap.enabled !== false) {
    input.outputPersonalMap.enabled = true;
    input.outputPersonalMap.orgName ||= `WhereWeMeet：${input.poiKeyword}`;
    input.outputPersonalMap.sceneType ??= 2;
    input.outputPersonalMap.maxRegions ??= input.regionLimit;
    input.outputPersonalMap.shopsPerRegion ??= 1;
    input.outputPersonalMap.pointLimit ??= Math.min(16, input.outputPersonalMap.maxRegions || 5);
    input.outputPersonalMap.outputJson ||= `output/${slug}-personal-map.json`;
    input.outputPersonalMap.qrImage ||= `output/${slug}-personal-map-qr.png`;
  }
}

function buildOutputStem(input) {
  const source = [input.city, input.poiKeywords?.join("-") || input.poiKeyword || "result"]
    .filter(Boolean)
    .join("-");
  const slug = source
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `where-we-meet-${Date.now()}`;
}
