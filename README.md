# WhereWeMeet（约哪儿）

[中文 README](README.zh-CN.md)

Where should we meet when everyone lives in a different direction?

WhereWeMeet is an Agent Skill for that very common group-chat problem: pick a place that does not quietly punish one person with a terrible trip. Give it a city, a few starting points, and what the group wants to eat or do. It returns a short list of meetup areas, travel times for each person, nearby backup choices, a mobile AMap link/QR code, and a desktop map for comparison.

## Why

Most meetup planning tools start with places. This one starts with people.

It is not trying to find the single perfect restaurant on the first pass. It finds a few fair areas first, then shows whether each area has enough similar places nearby. That usually matches how people actually decide: pick the neighborhood, then choose the exact place.

## What It Does

- Recommends 5 meetup areas by default.
- Handles multiple place types, such as `湘菜 / 川菜`.
- Uses AMap geocoding, POI search, and route time estimates.
- Defaults to public transit.
- Supports driving/taxi, walking, and per-person travel modes.
- Generates a mobile AMap personal-map QR/schema link and a desktop HTML map.

## Requirements

- Node.js 18+
- An AMap Web Service key
- Optional AMap JSAPI key/security code for the desktop HTML map

Create `.env`:

```bash
cp .env.example .env
```

Fill in:

```bash
AMAP_KEY=your_amap_web_service_key
AMAP_JSAPI_KEY=your_amap_jsapi_key
AMAP_SECURITY_JS_CODE=your_amap_security_js_code
```

`AMAP_KEY` is required. The JSAPI values are optional. If they are missing, the generated HTML will ask for map credentials in the browser.

## Quick Start

```bash
npm install
node scripts/where-we-meet.js examples/beijing.json
```

Or pass the key inline:

```bash
AMAP_KEY=your_key node scripts/where-we-meet.js examples/beijing.json
```

The default output is meant to be sent directly to a user. If a QR code is generated, stdout starts with one `MEDIA:<path>` line for clients that support media directives.

## Example Input

```json
{
  "city": "北京",
  "people": [
    { "name": "A", "address": "管庄地铁站" },
    { "name": "B", "address": "北苑路北地铁站" },
    { "name": "C", "address": "望京" }
  ],
  "poiKeywords": ["湘菜", "川菜"]
}
```

Mixed travel modes:

```json
{
  "city": "天津市",
  "people": [
    { "name": "A", "address": "津塘路地铁站", "mode": "driving" },
    { "name": "B", "address": "西青区青吉里小区", "mode": "driving" },
    { "name": "C", "address": "路劲太阳城", "mode": "transit" }
  ],
  "poiKeywords": ["日料"]
}
```

Travel modes:

- `transit`: public transit
- `driving`: driving or taxi
- `walking`: walking

## Outputs

Files are written to `output/` by default:

- `*.html`: desktop comparison map
- `*-summary.md`: readable answer
- `*-personal-map.json`: AMap personal-map schema result
- `*-personal-map-qr.png`: QR code for mobile AMap

For integration:

```bash
node scripts/where-we-meet.js examples/beijing.json --json
```

For debugging:

```bash
node scripts/where-we-meet.js examples/beijing.json --full
```

## Use as an Agent Skill

This repo follows the Agent Skills folder format. `SKILL.md` is the skill entry, and `scripts/where-we-meet.js` is the runner.

Prompts that should trigger it:

- “约哪儿，A 在团结湖，B 在工体，C 在龙湖蓝海引擎，D 在金台路，吃重庆火锅”
- “Find somewhere fair for three people in Beijing to eat Japanese food.”
- “找一个谁都不远的地方，第一个人在管庄，第二个人在北苑路北，第三个人在望京，湘菜或者川菜。”

## Privacy

- Addresses, POI searches, and routing requests are sent to AMap.
- Generated maps and summaries are written locally under `output/`.
- Do not commit `.env` or generated `output/` files.
- Do not put real private addresses in public examples.

## License

MIT
