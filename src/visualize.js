import fs from "node:fs";
import path from "node:path";

export function writeVisualization(output, filePath, options = {}) {
  if (!filePath) return null;

  const absolutePath = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, renderHtml(output, options), "utf8");
  return absolutePath;
}

function renderHtml(output, options) {
  const mapConfig = {
    viewMode: "2D",
    pitch: 0,
    initialZoom: 11,
    focusZoom: 14,
    mapStyle: "amap://styles/whitesmoke",
    features: ["bg", "road", "building"],
    circleRadiusMeters: 1200,
    circleFillOpacity: 0.08,
    circleStrokeWeight: 2,
    showRegionCircles: true,
    showPeopleMarkers: true,
    showShopMarkers: "all",
    maxVisibleShopsPerRegion: 999,
    showRouteLinesToSelectedRegion: true,
    showRouteTimeLabels: true,
    ...(output.map || {})
  };
  const payload = {
    output,
    mapConfig
  };

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WhereWeMeet，谁都不远</title>
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; max-width: 100%; overflow: hidden; }
    body { margin: 0; color: #172033; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f7fb; }
    .app { width: 100vw; height: 100vh; overflow: hidden; display: flex; }
    #map { flex: 1 1 auto; min-width: 0; height: 100vh; overflow: hidden; }
    #map .amap-layer,
    #map .amap-tile,
    #map .amap-labels,
    #map canvas {
      filter: grayscale(1) saturate(.16) brightness(1.08) contrast(.9);
    }
    .sidebar { flex: 0 0 420px; width: 420px; max-width: 100vw; overflow-y: auto; overflow-x: hidden; border-right: 1px solid #dfe4ee; background: #f6f8fc; }
    .header { width: 100%; padding: 20px 20px 14px; border-bottom: 1px solid #edf0f5; position: sticky; top: 0; background: rgba(246,248,252,.96); z-index: 5; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .tagline { margin: -2px 0 8px; color: #155dfc; font-size: 14px; font-weight: 800; }
    .meta { color: #667085; font-size: 13px; line-height: 1.5; }
    .warning { margin-top: 10px; padding: 10px 12px; border-radius: 8px; background: #fff3cd; color: #664d03; font-size: 13px; }
    .key-form { display: grid; gap: 8px; margin-top: 10px; }
    .key-form input { width: 100%; border: 1px solid #d0d5dd; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
    .key-form button { border: 0; border-radius: 8px; background: #155dfc; color: #fff; padding: 9px 12px; cursor: pointer; font-weight: 700; }
    .region-list { width: 100%; padding: 14px 16px 24px; display: grid; gap: 14px; overflow: hidden; }
    .card { width: 100%; min-width: 0; overflow: hidden; padding: 15px 16px; border: 1px solid #e3e8f2; border-radius: 14px; background: #fff; cursor: pointer; box-shadow: 0 8px 20px rgba(15,23,42,.06); }
    .card:hover { background: #fbfdff; border-color: #cfdaf0; }
    .card.active { background: #f7fbff; border-color: #155dfc; box-shadow: 0 12px 26px rgba(21,93,252,.13); }
    .title { min-width: 0; display: flex; align-items: flex-start; gap: 10px; margin: 0; font-size: 17px; line-height: 1.35; overflow: hidden; }
    .rank { flex: 0 0 24px; width: 24px; height: 24px; border-radius: 7px; transform: rotate(45deg); display: inline-flex; align-items: center; justify-content: center; background: #155dfc; color: #fff; font-size: 13px; font-weight: 800; margin-top: 2px; }
    .rank span { transform: rotate(-45deg); }
    .region-name { min-width: 0; flex: 1 1 auto; overflow: hidden; }
    .region-name-main { display: block; color: #172033; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .region-name-sub { display: block; color: #667085; font-size: 13px; font-weight: 500; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .collapsed { display: block; }
    .expanded { display: none; }
    .card.active .collapsed { display: none; }
    .card.active .expanded { display: block; }
    .collapsed-row { margin-left: 34px; margin-top: 10px; display: flex; align-items: center; gap: 10px; color: #475467; font-size: 13px; overflow: hidden; }
    .collapsed-times { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .collapsed-shops { flex: 0 0 auto; color: #24447a; background: #eef4ff; border: 1px solid #d8e6ff; border-radius: 999px; padding: 4px 8px; font-weight: 800; }
    .region-subtitle { color: #667085; font-size: 13px; margin: 8px 0 0 34px; }
    .time-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 14px 0 12px; overflow: hidden; }
    .time-chip { min-width: 0; padding: 8px 9px; border-radius: 10px; background: #eef4ff; border: 1px solid #d8e6ff; color: #24447a; font-size: 12px; overflow: hidden; }
    .time-chip strong { display: block; color: #172033; font-size: 18px; line-height: 1.1; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .time-origin { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.35; }
    .divider { height: 1px; background: #edf0f5; margin: 12px 0; }
    .shops { margin: 0; padding: 0; list-style: none; color: #303847; font-size: 13px; }
    .shops li { margin: 5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .shops li::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: rgba(21,93,252,.55); display: inline-block; margin-right: 8px; vertical-align: 1px; }
    .shop-more { color: #667085; font-size: 13px; margin-top: 6px; }
    .marker-person { position: relative; width: 44px; height: 44px; }
    .person-letter { width: 44px; height: 44px; color: #fff; background: #e5484d; border: 3px solid #fff; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 900; box-shadow: 0 8px 22px rgba(144, 24, 28, .30); }
    .person-caption { position: absolute; left: 50px; top: 9px; width: calc(4em + 16px); white-space: nowrap; overflow: hidden; background: rgba(255,255,255,.96); color: #9f1d21; border: 1px solid rgba(229,72,77,.22); border-radius: 999px; padding: 4px 8px; font-size: 12px; font-weight: 800; text-align: center; box-shadow: 0 4px 12px rgba(30,41,59,.12); }
    .marker-region { width: 38px; height: 38px; border-radius: 10px; transform: rotate(45deg); display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; font-weight: 900; border: 3px solid #fff; box-shadow: 0 10px 24px rgba(21,93,252,.28); }
    .marker-region span { transform: rotate(-45deg); }
    .marker-shop { width: 10px; height: 10px; border-radius: 50%; background: rgba(30, 64, 175, .38); border: 1px solid rgba(255,255,255,.8); box-shadow: 0 2px 8px rgba(30,64,175,.18); }
    .route-label { white-space: nowrap; border-radius: 999px; background: rgba(255,255,255,.94); border: 1px solid #cbd5e1; color: #334155; padding: 2px 7px; font-size: 12px; font-weight: 800; box-shadow: 0 3px 10px rgba(15,23,42,.12); }
    .info { max-width: 280px; line-height: 1.5; }
    .info h3 { margin: 0 0 8px; font-size: 15px; }
    .info p { margin: 5px 0; }
    .info ol { padding-left: 18px; margin: 7px 0 0; }
    .info li { margin: 3px 0; }
    @media (max-width: 640px) {
      html, body { overflow-y: auto; }
      .app { display: block; height: auto; min-height: 100vh; overflow: visible; }
      .sidebar { width: 100vw; max-width: 100vw; height: auto; border-right: 0; border-bottom: 1px solid #dfe4ee; }
      #map { width: 100vw; height: 60vh; min-height: 420px; }
    }
  </style>
  <script>
    window.__FAIR_MEET_DATA__ = ${JSON.stringify(payload)};
  </script>
  <script src="https://webapi.amap.com/loader.js"></script>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="header">
        <h1>WhereWeMeet</h1>
        <div class="tagline">谁都不远</div>
        <div class="meta" id="meta"></div>
        <div class="warning" id="warning">
          请输入高德 JSAPI Web Key 和安全密钥。它们只保存在当前浏览器会话，不写入本文件。
          <div class="key-form">
            <input id="amap-key" placeholder="AMAP_JSAPI_KEY / Web端Key">
            <input id="amap-security" placeholder="AMAP_SECURITY_JS_CODE">
            <button id="load-map" type="button">加载高德地图</button>
          </div>
        </div>
      </div>
      <div id="regions" class="region-list"></div>
    </aside>
    <div id="map"></div>
  </div>
  <script>
    const payload = window.__FAIR_MEET_DATA__;
    const output = payload.output;
    const mapConfig = payload.mapConfig;
    const regionColor = "#155dfc";
    window.__YUENA_MAP_READY__ = false;

    document.getElementById("meta").textContent =
      output.city + " · " + output.poiKeyword + " · " + (output.modeLabel || output.mode) + " · 候选 POI " + output.candidateCount + " 个";

    renderSidebar();
    restoreSessionKeys();
    document.getElementById("load-map").addEventListener("click", () => {
      const key = document.getElementById("amap-key").value.trim();
      const securityJsCode = document.getElementById("amap-security").value.trim();
      sessionStorage.setItem("fairMeetAmapKey", key);
      sessionStorage.setItem("fairMeetAmapSecurity", securityJsCode);
      initMap(key, securityJsCode);
    });

    function initMap(amapKey, securityJsCode) {
      const warning = document.getElementById("warning");
      if (!amapKey) {
        return;
      }
      warning.style.display = "none";

      window._AMapSecurityConfig = securityJsCode
        ? { securityJsCode }
        : {};

      AMapLoader.load({
        key: amapKey,
        version: "2.0",
        plugins: ["AMap.Scale", "AMap.ToolBar", "AMap.ControlBar"]
      }).then((AMap) => {
        AMap.getConfig().appname = "where-we-meet";

        const map = new AMap.Map("map", {
          viewMode: mapConfig.viewMode,
          zoom: mapConfig.initialZoom,
          pitch: mapConfig.pitch,
          center: centerOf(allCoreLngLats()),
          mapStyle: mapConfig.mapStyle,
          features: mapConfig.features
        });
        map.on("complete", () => {
          if (mapConfig.mapStyle && typeof map.setMapStyle === "function") {
            map.setMapStyle(mapConfig.mapStyle);
          }
          setTimeout(() => {
            window.__YUENA_MAP_READY__ = true;
          }, mapConfig.screenshotReadyDelayMs || 2500);
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: { top: "16px", right: "16px" } }));
        map.addControl(new AMap.ControlBar({ position: { top: "90px", right: "16px" } }));

        const overlays = [];
        const infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -18), closeWhenClickMap: true });
        const regionMarkers = new Map();
        const regionShopMarkers = new Map();
        const routeLines = [];
        const routeLabels = [];

        if (mapConfig.showPeopleMarkers) output.people.forEach((person) => {
          const position = toLngLat(person.location);
          const label = originLabel(person);
          const shortLabel = truncateOriginLabel(label);
          const marker = new AMap.Marker({
            map,
            position,
            content: '<div class="marker-person" title="' + escapeHtml(label) + '"><span class="person-letter">出发</span><span class="person-caption" title="' + escapeHtml(label) + '">' + escapeHtml(shortLabel) + '</span></div>',
            offset: new AMap.Pixel(-22, -22),
            zIndex: 300
          });
          overlays.push(marker);
        });

        output.regions.forEach((region, index) => {
          const position = toLngLat(region.center);
          const color = regionColor;

          let circle = null;
          if (mapConfig.showRegionCircles) {
            circle = new AMap.Circle({
              map,
              center: position,
              radius: mapConfig.circleRadiusMeters,
              strokeColor: color,
              strokeWeight: mapConfig.circleStrokeWeight,
              strokeOpacity: 0.95,
              fillColor: color,
              fillOpacity: mapConfig.circleFillOpacity,
              zIndex: 120
            });
          }

          const marker = new AMap.Marker({
            map,
            position,
            content: '<div class="marker-region" style="background:' + color + '"><span>' + region.rank + '</span></div>',
            offset: new AMap.Pixel(-19, -19),
            zIndex: 260
          });

          regionMarkers.set(region.rank, { marker, position });
          overlays.push(...[circle, marker].filter(Boolean));

          const markers = [];
          region.shops.slice(0, mapConfig.maxVisibleShopsPerRegion).forEach((shop) => {
            const shopPosition = toLngLat(shop.location);
            const shopMarker = new AMap.Marker({
              map,
              position: shopPosition,
              title: shop.name,
              content: '<div class="marker-shop"></div>',
              offset: new AMap.Pixel(-5, -5),
              anchor: "center",
              zIndex: 90
            });
            shopMarker.on("click", () => {
              infoWindow.setContent(renderShopInfo(shop));
              infoWindow.open(map, shopPosition);
            });
            markers.push(shopMarker);
          });
          regionShopMarkers.set(region.rank, markers);
          marker.on("click", () => selectRegion(AMap, map, region.rank, position));
          if (circle) circle.on("click", () => selectRegion(AMap, map, region.rank, position));
        });

        document.querySelectorAll("[data-region-rank]").forEach((card) => {
          card.addEventListener("click", () => {
            const rank = Number(card.dataset.regionRank);
            const item = regionMarkers.get(rank);
            if (!item) return;
            selectRegion(AMap, map, rank, item.position);
          });
        });

        map.setFitView(overlays, false, [70, 450, 70, 70]);
        selectRegion(AMap, map, output.regions[0].rank, regionMarkers.get(output.regions[0].rank).position, { fit: false });
        if (mapConfig.mapStyle && typeof map.setMapStyle === "function") {
          map.setMapStyle(mapConfig.mapStyle);
        }
        setTimeout(() => {
          window.__YUENA_MAP_READY__ = true;
        }, mapConfig.screenshotReadyDelayMs || 5000);

        function selectRegion(AMap, map, rank, position, options = {}) {
          document.querySelectorAll(".card").forEach((node) => node.classList.toggle("active", Number(node.dataset.regionRank) === rank));
          for (const [regionRank, markers] of regionShopMarkers.entries()) {
            markers.forEach((marker) => marker.setMap(regionRank === rank || mapConfig.showShopMarkers === "all" ? map : null));
          }
          routeLines.forEach((line) => line.setMap(null));
          routeLines.length = 0;
          routeLabels.forEach((label) => label.setMap(null));
          routeLabels.length = 0;
          if (mapConfig.showRouteLinesToSelectedRegion) {
            const region = output.regions.find((item) => item.rank === rank);
            output.people.forEach((person) => {
              const origin = toLngLat(person.location);
              const line = new AMap.Polyline({
                map,
                path: [origin, position],
                strokeColor: "#64748b",
                strokeWeight: 2,
                strokeOpacity: 0.42,
                strokeStyle: "dashed",
                zIndex: 80
              });
              routeLines.push(line);
              if (mapConfig.showRouteTimeLabels && region?.travelTimes?.[person.name] != null) {
                const labelPosition = midpoint(origin, position);
                const label = new AMap.Marker({
                  map,
                  position: labelPosition,
                  content: '<div class="route-label">' + person.name + ' ' + Math.round(region.travelTimes[person.name]) + '分钟' + routeModeSuffix(person) + '</div>',
                  offset: new AMap.Pixel(-26, -12),
                  zIndex: 180
                });
                routeLabels.push(label);
              }
            });
          }
          if (options.fit !== false) {
            map.setZoomAndCenter(mapConfig.focusZoom, position);
          }
        }
      }).catch((error) => {
        warning.style.display = "block";
        warning.innerHTML = "高德地图加载失败：" + escapeHtml(error.message || String(error));
      });
    }

    function restoreSessionKeys() {
      const key = sessionStorage.getItem("fairMeetAmapKey") || mapConfig.amapKey || "";
      const security = sessionStorage.getItem("fairMeetAmapSecurity") || mapConfig.amapSecurityJsCode || "";
      document.getElementById("amap-key").value = key;
      document.getElementById("amap-security").value = security;
      if (key) initMap(key, security);
    }

    function renderSidebar() {
      document.getElementById("regions").innerHTML = output.regions.map((region) => {
        const collapsedTimes = output.people.map((person) => person.name + ' ' + person.address + ' ' + Math.round(region.travelTimes[person.name]) + '分' + routeModeSuffix(person)).join(' · ');
        return '<section class="card" data-region-rank="' + region.rank + '">' +
          '<h2 class="title"><span class="rank"><span>' + region.rank + '</span></span><span class="region-name"><span class="region-name-main">' + escapeHtml(region.name) + '</span><span class="region-name-sub">' + region.shopCount + ' 家候选店 · 最高评分 ' + (region.bestRating || "-") + '</span></span></h2>' +
          '<div class="collapsed">' +
            '<div class="collapsed-row">' +
              '<span class="collapsed-times" title="' + escapeHtml(collapsedTimes) + '">' + escapeHtml(collapsedTimes) + '</span>' +
              '<span class="collapsed-shops">' + region.shopCount + '家</span>' +
            '</div>' +
          '</div>' +
          '<div class="expanded">' +
            '<div class="time-row">' + output.people.map((person) => {
              const modeText = routeModeSuffix(person);
              const originText = person.name + ' · ' + person.address;
              const fullText = originText + ' · ' + Math.round(region.travelTimes[person.name]) + '分钟' + modeText;
              return '<span class="time-chip" title="' + escapeHtml(fullText) + '"><strong>' + Math.round(region.travelTimes[person.name]) + '分钟</strong><span class="time-origin">' + escapeHtml(originText + modeText) + '</span></span>';
            }).join("") + '</div>' +
            '<div class="divider"></div>' +
            '<ul class="shops">' + region.shops.slice(0, 5).map((shop) =>
              '<li>' + escapeHtml(shop.name) + (shop.rating ? ' · ' + shop.rating + '分' : '') + (shop.cost ? ' · 人均' + shop.cost : '') + '</li>'
            ).join("") + '</ul>' +
            (region.shopCount > 5 ? '<div class="shop-more">另有 ' + (region.shopCount - 5) + ' 家候选店</div>' : '') +
          '</div>' +
        '</section>';
      }).join("");
    }

    function renderShopInfo(shop) {
      return '<div class="info"><h3>' + escapeHtml(shop.name) + '</h3>' +
        '<p>' + escapeHtml(shop.address || "") + '</p>' +
        '<p>' + (shop.rating ? shop.rating + '分' : '暂无评分') + (shop.cost ? ' · 人均' + shop.cost : '') + '</p></div>';
    }

    function routeModeSuffix(person) {
      return output.mode === "mixed" && person.modeLabel ? "（" + person.modeLabel + "）" : "";
    }

    function originLabel(person) {
      return person.address || person.formattedAddress || person.name || "出发地";
    }

    function truncateOriginLabel(label) {
      const chars = Array.from(String(label || ""));
      return chars.length > 3 ? chars.slice(0, 3).join("") + "…" : chars.join("");
    }

    function allCoreLngLats() {
      return [
        ...output.people.map((person) => person.location),
        ...output.regions.map((region) => region.center)
      ].map(toLngLat);
    }

    function centerOf(points) {
      const lng = points.reduce((sum, point) => sum + point[0], 0) / points.length;
      const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length;
      return [lng, lat];
    }

    function midpoint(a, b) {
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    }

    function toLngLat(location) {
      return location.split(",").map(Number);
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }
  </script>
</body>
</html>`;
}
