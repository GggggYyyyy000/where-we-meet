import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { parseLocation } from "./geo.js";

export async function writePersonalMap(client, output, config = {}) {
  if (!config?.enabled) return null;

  const pointLimit = config.pointLimit ?? 5;
  const maxRegions = config.maxRegions ?? output.regions.length;
  const shopsPerRegion = config.shopsPerRegion ?? 1;
  const sceneType = config.sceneType ?? 2;
  const orgName = config.orgName || `WhereWeMeet：${output.poiKeyword}`;
  const lineList = buildLineList(output, { pointLimit, maxRegions, shopsPerRegion });

  const result = await client.createPersonalMap({ orgName, lineList, sceneType });
  const personalMap = {
    orgName,
    sceneType,
    schemaUrl: result.schemaUrl,
    lineList
  };

  if (config.qrImage) {
    personalMap.qrImage = await writeQrPng(result.schemaUrl, config.qrImage);
  }

  if (config.outputJson) {
    writeJson(config.outputJson, personalMap);
  }

  return personalMap;
}

function buildLineList(output, options) {
  const points = [];

  for (const region of output.regions.slice(0, options.maxRegions)) {
    for (const shop of region.shops.slice(0, options.shopsPerRegion)) {
      if (!shop.id) {
        throw new Error(`个人地图生成失败：候选店缺少 poiId（${shop.name}）`);
      }
      const shopLocation = parseLocation(shop.location);
      points.push({
        name: `候选 ${region.rank} · ${shop.name}`,
        lon: shopLocation.lng,
        lat: shopLocation.lat,
        poiId: shop.id
      });
    }
  }

  return [
    {
      title: `WhereWeMeet · ${output.poiKeyword}`,
      pointInfoList: points.slice(0, options.pointLimit)
    }
  ];
}

function writeJson(filePath, data) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeQrPng(text, filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  await QRCode.toFile(absolutePath, text, {
    type: "png",
    width: 480,
    margin: 2,
    errorCorrectionLevel: "M"
  });
  return absolutePath;
}
