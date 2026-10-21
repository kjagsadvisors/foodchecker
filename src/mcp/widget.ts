/**
 * The inline score card shown in ChatGPT and Claude (MCP Apps standard).
 *
 * Self-contained on purpose: no bundler, no CDN. It speaks the MCP Apps
 * postMessage protocol directly (ui/initialize, ui/notifications/tool-result,
 * tools/call, ui/message, ui/open-link) and falls back to window.openai.
 */
export const WIDGET_URI = "ui://foodchecker/score-card-v1.html";

/**
 * @param preview Data to render immediately (standalone web preview, no chat host).
 * @param apiPath Endpoint the standalone preview posts tool calls to.
 */
export function widgetHtml(preview?: unknown, apiPath?: string): string {
  const injected =
    preview === undefined
      ? ""
      : `<script>window.__FOODCHECKER_DATA__=${JSON.stringify(preview).replace(/</g, "\\u003c")};window.__FOODCHECKER_API__=${JSON.stringify(apiPath ?? null)};</script>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FoodChecker score</title>
<style>
:root {
  --bg: #ffffff; --fg: #17181c; --muted: #6b6f7b; --line: #e8e9ee; --soft: #f5f6f8;
  --excellent: #1e9e57; --good: #79b94a; --poor: #ef8f2f; --bad: #e5484d; --unknown: #9aa0ab;
  --radius: 14px;
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color-scheme: light;
}
:root[data-theme="dark"] {
  --bg: #1c1d21; --fg: #f1f2f4; --muted: #a0a4ae; --line: #2e3036; --soft: #25272c; color-scheme: dark;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #1c1d21; --fg: #f1f2f4; --muted: #a0a4ae; --line: #2e3036; --soft: #25272c; color-scheme: dark; }
}
* { box-sizing: border-box; }
html, body { margin: 0; background: transparent; color: var(--fg); }
body { font-size: 14px; line-height: 1.4; }
.card { background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; max-width: 640px; }
.head { display: flex; gap: 12px; align-items: center; }
.thumb { width: 56px; height: 56px; border-radius: 10px; object-fit: contain; background: var(--soft); flex: none; }
.thumb.empty { display: grid; place-items: center; color: var(--muted); font-size: 22px; }
.title { font-weight: 650; font-size: 16px; margin: 0; }
.sub { color: var(--muted); font-size: 13px; margin-top: 2px; }
.hero { display: flex; gap: 16px; align-items: center; margin: 14px 0 6px; }
.dial { position: relative; width: 112px; height: 112px; flex: none; }
.dial svg { transform: rotate(-90deg); }
.dial .num { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
.dial .num b { font-size: 34px; line-height: 1; display: block; }
.dial .num span { font-size: 11px; color: var(--muted); }
.rating { font-weight: 700; font-size: 20px; }
.headline { color: var(--fg); margin-top: 4px; }
.scale { margin: 12px 0 4px; }
.bar { position: relative; height: 10px; border-radius: 6px; display: grid; grid-template-columns: 25fr 25fr 25fr 25fr; overflow: visible; }
.bar i { display: block; height: 10px; }
.bar i:nth-child(1) { background: var(--bad); border-radius: 6px 0 0 6px; }
.bar i:nth-child(2) { background: var(--poor); }
.bar i:nth-child(3) { background: var(--good); }
.bar i:nth-child(4) { background: var(--excellent); border-radius: 0 6px 6px 0; }
.marker { position: absolute; top: -5px; width: 4px; height: 20px; border-radius: 2px; background: var(--fg); box-shadow: 0 0 0 2px var(--bg); transform: translateX(-2px); }
.ticks { display: grid; grid-template-columns: repeat(4, 1fr); font-size: 11px; color: var(--muted); margin-top: 4px; text-align: center; }
.badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 4px; }
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; background: var(--soft); font-size: 12px; }
.ns { display: inline-flex; border-radius: 6px; overflow: hidden; }
.ns s { text-decoration: none; width: 16px; text-align: center; font-weight: 700; font-size: 11px; color: #fff; opacity: .35; }
.ns s.on { opacity: 1; transform: scale(1.08); }
.ns .a { background: #038141; } .ns .b { background: #85bb2f; } .ns .c { background: #fecb02; color: #333; } .ns .d { background: #ee8100; } .ns .e { background: #e63e11; }
h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin: 16px 0 6px; font-weight: 650; }
.rows { border-top: 1px solid var(--line); }
.row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.row .grow { flex: 1; min-width: 0; }
.row .val { color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.row small { color: var(--muted); display: block; }
details.row { display: block; }
details.row summary { display: flex; align-items: center; gap: 10px; cursor: pointer; list-style: none; }
details.row summary::-webkit-details-marker { display: none; }
details.row p { margin: 6px 0 2px 20px; color: var(--muted); font-size: 13px; }
.pill { font-size: 11px; font-weight: 650; padding: 2px 8px; border-radius: 999px; color: #fff; white-space: nowrap; }
.r-high { background: var(--bad); } .r-moderate { background: var(--poor); } .r-limited { background: #d5b500; color: #222; } .r-none { background: var(--excellent); } .r-unknown { background: var(--unknown); }
.math { margin-top: 14px; padding: 10px 12px; background: var(--soft); border-radius: 10px; font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.math b { color: var(--fg); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
button, .btn { font: inherit; font-size: 13px; padding: 7px 12px; border-radius: 9px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; }
button.primary { background: var(--fg); color: var(--bg); border-color: var(--fg); }
button:disabled { opacity: .5; cursor: default; }
.foot { margin-top: 12px; font-size: 11px; color: var(--muted); }
.foot a { color: inherit; }
.list .item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); cursor: pointer; }
.list .item:hover { background: var(--soft); }
.score-pill { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 700; flex: none; }
.list .thumb { width: 42px; height: 42px; }
.empty-state { color: var(--muted); padding: 24px 0; text-align: center; }
.flag-danger { background: var(--bad); } .flag-warning { background: var(--poor); } .flag-info { background: var(--unknown); }
</style>
${injected}
</head>
<body>
<div id="root" class="card"><div class="empty-state">Checking the label...</div></div>
<script>
(function () {
  "use strict";
  var COLORS = { excellent: "var(--excellent)", good: "var(--good)", poor: "var(--poor)", bad: "var(--bad)", unknown: "var(--unknown)" };
  var LABELS = { excellent: "Excellent", good: "Good", poor: "Poor", bad: "Bad", unknown: "Not enough data" };
  var NOVA = { 1: "Unprocessed", 2: "Culinary ingredient", 3: "Processed", 4: "Ultra-processed" };
  var root = document.getElementById("root");
  var history = [];
  var current = null;

  // ---------- MCP Apps bridge (JSON-RPC over postMessage) ----------
  var nextId = 1, pending = {}, connected = false, embedded = window.parent !== window;
  function post(msg) { if (embedded) { try { window.parent.postMessage(msg, "*"); } catch (e) {} } }
  function request(method, params) {
    if (!embedded) return Promise.reject(new Error("not embedded"));
    var id = nextId++;
    post({ jsonrpc: "2.0", id: id, method: method, params: params || {} });
    return new Promise(function (resolve, reject) {
      pending[id] = { resolve: resolve, reject: reject };
      setTimeout(function () { if (pending[id]) { delete pending[id]; reject(new Error("timeout")); } }, 60000);
    });
  }
  function notify(method, params) { post({ jsonrpc: "2.0", method: method, params: params || {} }); }
  var handlers = {
    "ui/notifications/tool-result": function (p) { if (p && p.structuredContent) show(p.structuredContent, true); },
    "ui/notifications/tool-input": function () { if (!current) root.innerHTML = '<div class="empty-state">Checking the label...</div>'; },
    "ui/notifications/tool-cancelled": function () { if (!current) root.innerHTML = '<div class="empty-state">Cancelled.</div>'; },
    "ui/notifications/host-context-changed": function (ctx) { applyContext(ctx); },
    "ui/resource-teardown": function () { return {}; },
    "ping": function () { return {}; }
  };
  window.addEventListener("message", function (e) {
    if (e.source === window) return;
    var m = e.data;
    if (!m || m.jsonrpc !== "2.0") return;
    if (m.method === undefined && m.id !== undefined) {
      var p = pending[m.id];
      if (p) { delete pending[m.id]; m.error ? p.reject(m.error) : p.resolve(m.result); }
      return;
    }
    var h = handlers[m.method], out;
    try { out = h ? h(m.params) : undefined; } catch (err) { console.error(err); }
    if (m.id !== undefined) post({ jsonrpc: "2.0", id: m.id, result: out || {} });
  });
  function applyContext(ctx) {
    if (ctx && (ctx.theme === "dark" || ctx.theme === "light")) document.documentElement.setAttribute("data-theme", ctx.theme);
  }
  request("ui/initialize", {
    appInfo: { name: "foodchecker", version: "0.1.0" },
    appCapabilities: {},
    protocolVersion: "2026-01-26"
  }).then(function (res) {
    connected = true;
    applyContext(res && res.hostContext);
    notify("ui/notifications/initialized", {});
  }).catch(function () {});

  // ChatGPT globals fallback.
  function fromOpenAI() {
    var o = window.openai;
    if (!o) return;
    if (o.theme) applyContext({ theme: o.theme });
    if (o.toolOutput && o.toolOutput.kind) show(o.toolOutput, true);
  }
  window.addEventListener("openai:set_globals", fromOpenAI);

  function reportSize() {
    var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    notify("ui/notifications/size-changed", { height: h });
    if (window.openai && window.openai.notifyIntrinsicHeight) { try { window.openai.notifyIntrinsicHeight(h); } catch (e) {} }
  }
  if (window.ResizeObserver) new ResizeObserver(reportSize).observe(document.documentElement);

  function callTool(name, args) {
    if (window.__FOODCHECKER_API__) {
      return fetch(window.__FOODCHECKER_API__, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name, arguments: args }) })
        .then(function (r) { return r.json(); });
    }
    if (connected) return request("tools/call", { name: name, arguments: args });
    if (window.openai && window.openai.callTool) return window.openai.callTool(name, args);
    return Promise.reject(new Error("not connected"));
  }
  function sendMessage(text) {
    if (connected) return request("ui/message", { role: "user", content: [{ type: "text", text: text }] });
    if (window.openai && window.openai.sendFollowUpMessage) return window.openai.sendFollowUpMessage({ prompt: text });
    return Promise.resolve();
  }
  function openLink(url) {
    if (connected) return request("ui/open-link", { url: url }).catch(function () { window.open(url, "_blank", "noopener"); });
    if (window.openai && window.openai.openExternal) return window.openai.openExternal({ href: url });
    window.open(url, "_blank", "noopener");
  }

  // ---------- Rendering ----------
  function sentence(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function codeLabel(c) { return c === "e14xx" ? "E14xx" : "E" + c.slice(1); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function thumb(url, cls) {
    return url ? '<img class="thumb ' + (cls || "") + '" src="' + esc(url) + '" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement(\\'div\\'),{className:\\'thumb empty\\',textContent:\\'🛒\\'}))">'
               : '<div class="thumb empty ' + (cls || "") + '">🛒</div>';
  }
  function dial(score, rating) {
    var r = 48, c = 2 * Math.PI * r, pct = score == null ? 0 : score / 100;
    return '<div class="dial"><svg width="112" height="112" viewBox="0 0 112 112">' +
      '<circle cx="56" cy="56" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="10"/>' +
      '<circle cx="56" cy="56" r="' + r + '" fill="none" stroke="' + COLORS[rating] + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (c * pct) + ' ' + c + '"/>' +
      '</svg><div class="num"><div><b>' + (score == null ? "?" : score) + '</b><span>/ 100</span></div></div></div>';
  }
  function scaleBar(score) {
    if (score == null) return "";
    return '<div class="scale"><div class="bar"><i></i><i></i><i></i><i></i><div class="marker" style="left:' + score + '%"></div></div>' +
      '<div class="ticks"><span>Bad</span><span>Poor</span><span>Good</span><span>Excellent</span></div></div>';
  }
  function nutriBadge(grade) {
    if (!grade) return "";
    var s = "abcde".split("").map(function (g) { return '<s class="' + g + (g === grade ? " on" : "") + '">' + g.toUpperCase() + "</s>"; }).join("");
    return '<span class="badge">Nutri-Score <span class="ns">' + s + "</span></span>";
  }
  function levelColor(level, positive) {
    if (positive) return level === "high" ? "var(--excellent)" : "var(--good)";
    return level === "high" ? "var(--bad)" : "var(--poor)";
  }
  function nutrientRows(lines, positive) {
    return lines.map(function (l) {
      return '<div class="row"><span class="dot" style="background:' + levelColor(l.level, positive) + '"></span>' +
        '<div class="grow"><b>' + esc(l.label) + "</b><small>" + esc(l.verdict) + "</small></div>" +
        '<span class="val">' + esc(l.value) + " " + esc(l.unit) + "</span></div>";
    }).join("");
  }
  function additiveRows(items) {
    return items.map(function (a) {
      var risk = a.risk === "none" ? "no risk" : a.risk === "unknown" ? "not rated" : a.risk + " risk";
      return '<details class="row"><summary><span class="pill r-' + a.risk + '">' + esc(risk) + "</span>" +
        '<div class="grow"><b>' + esc(codeLabel(a.code)) + "</b> " + esc(a.name) + "<small>" + esc(a.function) + "</small></div></summary>" +
        (a.why ? "<p>" + esc(a.why) + (a.sources && a.sources.length ? "<br><i>Sources: " + esc(a.sources.join("; ")) + "</i>" : "") + "</p>" : "<p>No known health concern at normal intake.</p>") +
        "</details>";
    }).join("");
  }
  function flagRows(flags) {
    return flags.map(function (f) {
      return '<details class="row"><summary><span class="pill flag-' + f.severity + '">' + (f.severity === "danger" ? "avoid" : f.severity === "warning" ? "watch" : "note") + "</span>" +
        '<div class="grow"><b>' + esc(f.label) + "</b></div></summary><p>" + esc(f.detail) + "</p></details>";
    }).join("");
  }

  function renderProduct(d) {
    var p = d.product, r = d.result, color = COLORS[r.rating];
    var sub = [p.brand, p.quantity].filter(Boolean).join(" · ");
    var html = '<div class="head">' + thumb(p.imageUrl) + '<div><p class="title">' + esc(p.name) + "</p>" +
      (sub ? '<div class="sub">' + esc(sub) + "</div>" : "") + "</div></div>";
    html += '<div class="hero">' + dial(r.score, r.rating) + '<div><div class="rating" style="color:' + color + '">' + LABELS[r.rating] + "</div>" +
      '<div class="headline">' + esc(sentence(r.headline.replace(/^[^:]+:\\s*/, ""))) + "</div></div></div>";
    html += scaleBar(r.score);
    var badges = nutriBadge(r.nutrition.grade);
    if (r.processing.novaGroup) badges += '<span class="badge">NOVA ' + r.processing.novaGroup + " · " + NOVA[r.processing.novaGroup] + (r.processing.estimated ? " (est.)" : "") + "</span>";
    (p.labels || []).filter(function (l) { return /organic|bio/i.test(l); }).slice(0, 1).forEach(function (l) { badges += '<span class="badge">🌱 ' + esc(l) + "</span>"; });
    if (badges) html += '<div class="badges">' + badges + "</div>";

    var neg = r.negatives || [], pos = r.positives || [];
    var badAdd = r.additives.items.filter(function (a) { return a.risk === "high" || a.risk === "moderate"; });
    if (neg.length || badAdd.length) {
      html += "<h3>Negatives</h3><div class=\\"rows\\">";
      if (badAdd.length) html += '<div class="row"><span class="dot" style="background:var(--bad)"></span><div class="grow"><b>Additives</b><small>' + badAdd.length + " to watch</small></div></div>";
      html += nutrientRows(neg, false) + "</div>";
    }
    if (pos.length || r.additives.items.length === 0) {
      html += "<h3>Positives</h3><div class=\\"rows\\">";
      if (r.additives.items.length === 0 && r.missing.indexOf("ingredients") < 0) html += '<div class="row"><span class="dot" style="background:var(--excellent)"></span><div class="grow"><b>No additives</b><small>Nothing added beyond ingredients</small></div></div>';
      html += nutrientRows(pos, true) + "</div>";
    }
    if (r.additives.items.length) html += "<h3>Additives (" + r.additives.items.length + ')</h3><div class="rows">' + additiveRows(r.additives.items) + "</div>";
    if (r.flags.length) html += '<h3>Ingredient notes</h3><div class="rows">' + flagRows(r.flags) + "</div>";
    if (r.processing.markers && r.processing.markers.length && r.processing.novaGroup === 4) {
      html += '<h3>Why ultra-processed</h3><div class="sub">' + esc(r.processing.markers.slice(0, 6).join(" · ")) + "</div>";
    }

    if (r.score != null) {
      html += '<div class="math">How we got <b>' + r.score + "</b>: nutrition <b>" + r.nutrition.points + "</b>" +
        (r.additives.penaltyPct ? " − <b>" + r.additives.penaltyPct + "%</b> for additives" : "") +
        (r.processing.penaltyPct ? " − <b>" + r.processing.penaltyPct + "%</b> for processing" : "") +
        (r.caps.length ? " · " + esc(r.caps[0]) : "") + "</div>";
    } else if (r.missing.length) {
      html += '<div class="math">Missing: ' + esc(r.missing.join(", ")) + ". Share a photo of the nutrition panel to get a full score.</div>";
    }

    html += '<div class="actions">';
    if (history.length) html += '<button data-act="back">← Back</button>';
    if (p.barcode && p.source === "openfoodfacts") html += '<button class="primary" data-act="alts">Find healthier alternatives</button>';
    if (p.url) html += '<button data-act="link" data-url="' + esc(p.url) + '">Open Food Facts page</button>';
    html += "</div>";
    html += '<div class="foot">Score by FoodChecker (open source). ' + (p.source === "openfoodfacts" ? 'Product data © <a href="https://world.openfoodfacts.org" data-act="link" data-url="https://world.openfoodfacts.org">Open Food Facts</a> contributors, ODbL. ' : "From the label you shared. ") + "Not medical advice.</div>";
    return html;
  }

  function renderList(d) {
    var html = '<p class="title">' + esc(d.title) + "</p>" + (d.subtitle ? '<div class="sub">' + esc(d.subtitle) + "</div>" : "");
    if (!d.items.length) return html + '<div class="empty-state">' + esc(d.emptyMessage || "No products found.") + "</div>";
    html += '<div class="list" style="margin-top:10px">';
    d.items.forEach(function (it) {
      var sub = [it.brand, it.quantity].filter(Boolean).join(" · ");
      html += '<div class="item" data-act="open" data-barcode="' + esc(it.barcode) + '">' +
        '<div class="score-pill" style="background:' + COLORS[it.rating] + '">' + (it.score == null ? "?" : it.score) + "</div>" + thumb(it.imageUrl) +
        '<div class="grow" style="flex:1;min-width:0"><b>' + esc(it.name) + "</b>" + (sub ? '<div class="sub">' + esc(sub) + "</div>" : "") +
        '<div class="sub">' + esc(LABELS[it.rating]) + (it.nutriGrade ? " · Nutri-Score " + it.nutriGrade.toUpperCase() : "") + (it.novaGroup ? " · NOVA " + it.novaGroup : "") + "</div></div></div>";
    });
    html += "</div>";
    html += '<div class="actions">' + (history.length ? '<button data-act="back">← Back</button>' : "") + "</div>";
    html += '<div class="foot">Tap a product for the full breakdown. Data © Open Food Facts contributors, ODbL.</div>';
    return html;
  }

  function renderAdditive(d) {
    var a = d.additive;
    return '<p class="title">' + esc(codeLabel(a.code)) + " · " + esc(a.name) + '</p><div class="sub">' + esc(a.function) + "</div>" +
      '<div class="rows" style="margin-top:10px">' + additiveRows([a]) + "</div>" +
      '<div class="foot">Risk levels are an open, sourced editorial table. Not medical advice.</div>';
  }

  function show(data, fresh) {
    if (!data || !data.kind) return;
    if (fresh && current && JSON.stringify(current) === JSON.stringify(data)) return;
    if (fresh) history = [];
    current = data;
    root.innerHTML = data.kind === "product" ? renderProduct(data) : data.kind === "list" ? renderList(data) : data.kind === "additive" ? renderAdditive(data) : "";
    reportSize();
  }

  function navigate(promise, btn) {
    if (btn) btn.disabled = true;
    var prev = current;
    promise.then(function (res) {
      var sc = res && (res.structuredContent || res);
      if (sc && sc.kind) { if (prev) history.push(prev); current = null; show(sc, false); }
    }).catch(function () { if (btn) btn.disabled = false; });
  }

  root.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var act = el.getAttribute("data-act");
    if (act === "link") { e.preventDefault(); openLink(el.getAttribute("data-url")); }
    else if (act === "back") { var prev = history.pop(); if (prev) { current = null; show(prev, false); } }
    else if (act === "open") navigate(callTool("check_food", { barcode: el.getAttribute("data-barcode") }), null);
    else if (act === "alts" && current && current.product) {
      var bc = current.product.barcode;
      navigate(callTool("find_healthier_alternatives", { barcode: bc }), el);
    }
  });

  if (window.__FOODCHECKER_DATA__) show(window.__FOODCHECKER_DATA__, true);
  else fromOpenAI();
})();
</script>
</body>
</html>`;
}
