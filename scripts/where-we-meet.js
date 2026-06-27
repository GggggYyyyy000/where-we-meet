#!/usr/bin/env node
import { runYuena, toAgentResponse, toAgentText } from "../src/index.js";

const args = process.argv.slice(2);
const full = args.includes("--full");
const json = args.includes("--json");
const inputPath = args.find((arg) => !arg.startsWith("--"));

runYuena(inputPath)
  .then((output) => {
    if (full) {
      console.log(JSON.stringify(output, null, 2));
      return;
    }
    if (json) {
      console.log(JSON.stringify(toAgentResponse(output), null, 2));
      return;
    }
    console.log(toAgentText(output));
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
