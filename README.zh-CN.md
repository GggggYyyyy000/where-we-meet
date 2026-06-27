# WhereWeMeet（约哪儿）

约哪儿，谁都不远。

这是一个解决群聊里经典难题的 Agent Skill：大家住得分散，到底约在哪儿才不亏待某一个人？

给它一个城市、几个人的出发地、想吃什么或想去哪，它会先推荐几个相对公平的区域，再告诉你每个人过去要多久、附近还有多少同类店、手机怎么扫码打开高德地图，以及 PC 上怎么横向比对。

## 为什么做

很多工具一上来就在找“那家店”。但真实约饭通常不是这样。

更自然的顺序是：先确定一个大家都能接受的片区，再在片区里挑具体店。WhereWeMeet 也是这个思路。它默认不把“店多”当硬门槛，而是先看谁会不会跑太远，再把附近同类店数量摆出来，方便你判断这个区域有没有兜底选择。

## 能做什么

- 默认给 5 个候选区域。
- 支持多个类型一起找，比如 `湘菜 / 川菜`。
- 调用高德地理编码、POI 搜索和路径规划。
- 默认按公交/地铁估算。
- 支持驾车/打车、步行，也支持每个人单独设置交通方式。
- 输出手机端高德个人地图二维码/schema 链接和 PC 端 HTML 地图。

## 准备

需要：

- Node.js 18+
- 高德 Web 服务 Key
- 可选：高德 JSAPI Key 和安全密钥，用来自动加载 PC 端 HTML 地图

创建 `.env`：

```bash
cp .env.example .env
```

填写：

```bash
AMAP_KEY=你的高德Web服务Key
AMAP_JSAPI_KEY=你的高德JSAPI Key
AMAP_SECURITY_JS_CODE=你的高德JSAPI安全密钥
```

`AMAP_KEY` 必填。JSAPI 两项可以不填；不填时，打开 HTML 会在浏览器里提示手动输入。

## 快速开始

```bash
npm install
node scripts/where-we-meet.js examples/beijing.json
```

也可以临时传 key：

```bash
AMAP_KEY=你的Key node scripts/where-we-meet.js examples/beijing.json
```

默认 stdout 就是可以直接发给用户的结果。如果成功生成二维码，第一行会是 `MEDIA:<path>`，支持这个指令的平台会自动渲染成图片。

## 输入示例

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

混合交通方式：

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

交通方式：

- `transit`：公交/地铁
- `driving`：驾车/打车
- `walking`：步行

## 输出

默认写到 `output/`：

- `*.html`：PC 端对比地图
- `*-summary.md`：自然语言摘要
- `*-personal-map.json`：高德个人地图 schema 结果
- `*-personal-map-qr.png`：手机端高德地图二维码

需要结构化输出：

```bash
node scripts/where-we-meet.js examples/beijing.json --json
```

需要完整调试结果：

```bash
node scripts/where-we-meet.js examples/beijing.json --full
```

## 作为 Agent Skill 使用

项目采用通用 Agent Skills 目录结构。`SKILL.md` 是 skill 入口，`scripts/where-we-meet.js` 是执行脚本。

这些说法应该触发它：

- “约哪儿，A 在团结湖，B 在工体，C 在龙湖蓝海引擎，D 在金台路，吃重庆火锅”
- “帮我们找个谁都不远的地方吃日料”
- “找一个谁都不远的地方，第一个人在管庄，第二个人在北苑路北，第三个人在望京，湘菜或者川菜。”

## 隐私

- 输入地址、POI 搜索和路线请求会发送到高德。
- 生成的地图和摘要默认保存在本地 `output/`。
- 不要提交 `.env` 和 `output/`。
- 公开示例里不要放真实私人地址。

## License

MIT-0
