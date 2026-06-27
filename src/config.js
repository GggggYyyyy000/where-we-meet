import fs from "node:fs";
import path from "node:path";
import { normalizeInput } from "./normalize-request.js";

export const MODE_LABELS = {
  transit: "公交/地铁",
  driving: "驾车/打车",
  walking: "步行",
  mixed: "混合交通"
};

export function loadEnv(cwd = process.cwd()) {
  const envPath = path.join(cwd, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

export function readInput(filePath) {
  if (!filePath) {
    throw new Error("缺少输入文件。用法：node scripts/where-we-meet.js examples/beijing.json");
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  const input = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  normalizeInput(input);
  validateInput(input);
  return input;
}

function validateInput(input) {
  if (!input.city) throw new Error("输入缺少 city");
  if (!Array.isArray(input.people) || input.people.length < 2) {
    throw new Error("people 至少需要 2 个人");
  }
  for (const person of input.people) {
    if (!person.name || !person.address) {
      throw new Error("每个 person 都需要 name 和 address");
    }
    if (!["transit", "driving", "walking"].includes(person.mode)) {
      throw new Error("person.mode 只支持 transit / driving / walking，或包含开车/打车/公交/步行等自然语言描述");
    }
  }
  if (!Array.isArray(input.poiKeywords) || !input.poiKeywords.length) {
    throw new Error("输入缺少 poiKeyword 或 poiKeywords");
  }
  if (!["transit", "driving", "walking"].includes(input.mode)) {
    throw new Error("mode 只支持 transit / driving / walking，或包含开车/打车/公交/步行等自然语言描述");
  }
}
