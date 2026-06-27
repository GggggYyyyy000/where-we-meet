import fs from "node:fs";
import path from "node:path";

export function buildAnswerSummary(output, options = {}) {
  const limit = options.limit ?? Math.min(5, output.regions.length);
  const lines = [
    `WhereWeMeet：${output.poiKeyword}`,
    "",
    `本次按${output.modeLabel || output.mode}时间估算。`,
    "",
    "我会优先看“最远的人别太远”，再看这一片有没有足够多同类店可以兜底。下面这几个更值得先看：",
    ""
  ];

  for (const region of output.regions.slice(0, limit)) {
    const leadShop = region.shops[0];
    const timeText = output.people
      .map((person) => {
        const modeText = output.mode === "mixed" && person.modeLabel ? `（${person.modeLabel}）` : "";
        return `${person.name} ${Math.round(region.travelTimes[person.name])} 分钟${modeText}`;
      })
      .join(" · ");
    const extraShopCount = Math.max(0, region.shopCount - 1);
    const shopText = leadShop
      ? `代表店可以先看 ${leadShop.name}${leadShop.rating ? `，评分 ${leadShop.rating}` : ""}${leadShop.cost ? `，人均 ${leadShop.cost}` : ""}。`
      : "这一区域还需要再补一轮店铺核验。";
    const nearbyText = extraShopCount > 0
      ? `附近还有 ${extraShopCount} 家同类店，临时换一家也有余地。`
      : "附近还有 0 家同类店兜底，选择余地少一些，但路程上还算均衡。";

    lines.push(`${region.rank}. ${region.name}`);
    lines.push(`${timeText}。${shopText}${nearbyText}`);
    lines.push("");
  }

  lines.push("");
  lines.push(output.personalMap?.schemaUrl
    ? `手机看地图：可扫描二维码或者点击链接，即可跳转高德地图（如未跳转，请用默认浏览器打开）。\n${output.personalMap.schemaUrl}`
    : "手机直接打开：未生成 schemaUrl。");
  lines.push(output.visualizationPath
    ? `PC 端打开 HTML 会更方便横向比对：${output.visualizationPath}`
    : "PC 端 HTML：未生成，请检查 outputHtml。");

  return lines.join("\n").trimEnd();
}

export function writeAnswerSummary(output, filePath, options = {}) {
  if (!filePath) return null;

  const absolutePath = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const text = buildAnswerSummary(output, options);
  fs.writeFileSync(absolutePath, `${text}\n`, "utf8");
  return { path: absolutePath, text };
}
