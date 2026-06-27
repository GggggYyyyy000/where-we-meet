import { AmapClient } from "./amap.js";
import { buildCandidates } from "./candidates.js";
import { loadEnv, MODE_LABELS, readInput } from "./config.js";
import { toRegionRecommendations } from "./explain.js";
import { rankRegions } from "./fairness.js";
import { writePersonalMap } from "./personal-map.js";
import { buildRegions, labelRegions, selectDiverseRegions } from "./regions.js";
import { writeAnswerSummary } from "./summary.js";
import { writeVisualization } from "./visualize.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function runYuena(inputPath) {
  loadEnv();
  loadEnv(projectRoot);

  const input = readInput(inputPath);
  const client = new AmapClient(process.env.AMAP_KEY, {
    requestIntervalMs: input.requestIntervalMs
  });

  const people = [];
  for (const person of input.people) {
    const point = await client.geocode(person.address, input.city);
    people.push({
      ...person,
      ...point
    });
  }

  const candidates = await buildCandidates(client, input, people);
  const regionCandidates = buildRegions(candidates, input);
  const rankedRegions = await rankRegions(client, input, people, regionCandidates);
  const selectedRegions = selectDiverseRegions(rankedRegions, input);
  await labelRegions(client, selectedRegions);
  const regions = toRegionRecommendations(selectedRegions, people);

  const output = {
    city: input.city,
    mode: input.effectiveMode || input.mode,
    defaultMode: input.mode,
    modeLabel: MODE_LABELS[input.effectiveMode] || MODE_LABELS[input.mode] || input.mode,
    poiKeyword: input.poiKeyword,
    poiKeywords: input.poiKeywords,
    map: {
      ...(input.map || {}),
      amapKey: input.map?.amapKey || process.env.AMAP_JSAPI_KEY || "",
      amapSecurityJsCode: input.map?.amapSecurityJsCode || process.env.AMAP_SECURITY_JS_CODE || ""
    },
    people: people.map((person) => ({
      name: person.name,
      address: person.address,
      mode: person.mode,
      modeLabel: MODE_LABELS[person.mode] || person.mode,
      formattedAddress: person.formattedAddress,
      location: person.location
    })),
    candidateCount: candidates.length,
    regionCandidateCount: regionCandidates.length,
    regions
  };

  const visualizationPath = writeVisualization(output, input.outputHtml);
  if (visualizationPath) {
    output.visualizationPath = visualizationPath;
  }

  const personalMap = await writePersonalMap(client, output, input.outputPersonalMap);
  if (personalMap) {
    output.personalMap = personalMap;
  }

  const answerSummary = writeAnswerSummary(output, input.outputSummary, input.summary);
  if (answerSummary) {
    output.answerSummary = answerSummary;
  }

  output.reply = {
    markdown: answerSummary?.text || "",
    qrImage: personalMap?.qrImage || "",
    schemaUrl: personalMap?.schemaUrl || "",
    htmlPath: visualizationPath || "",
    summaryPath: answerSummary?.path || ""
  };

  return output;
}

export function toAgentText(output) {
  const lines = [];
  if (output.reply?.qrImage) {
    lines.push(`MEDIA:${output.reply.qrImage}`);
    lines.push("");
  }
  if (output.reply?.markdown) {
    lines.push(output.reply.markdown);
  }
  return lines.join("\n").trimEnd();
}

export function toAgentResponse(output) {
  return {
    ok: true,
    reply: {
      markdown: output.reply?.markdown || "",
      mediaDirective: output.reply?.qrImage ? `MEDIA:${output.reply.qrImage}` : "",
      links: {
        mobileMap: output.reply?.schemaUrl || "",
        pcHtml: output.reply?.htmlPath || ""
      },
      files: {
        summary: output.reply?.summaryPath || ""
      }
    },
    meta: {
      city: output.city,
      poiKeyword: output.poiKeyword,
      modeLabel: output.modeLabel,
      regionCount: output.regions?.length || 0,
      candidateCount: output.candidateCount || 0
    }
  };
}

async function main() {
  const output = await runYuena(process.argv[2]);
  console.log(JSON.stringify(output, null, 2));
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentPath = fileURLToPath(import.meta.url);
if (entryPath === currentPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
