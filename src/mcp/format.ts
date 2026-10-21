/** Plain-text summaries returned next to the widget data, for the model and for hosts without UI. */
import { RATING_LABEL } from "../core/score.js";
import type { AdditiveInfo, ScoredProduct } from "../core/types.js";

const NOVA_LABEL = { 1: "unprocessed or minimally processed", 2: "processed culinary ingredient", 3: "processed", 4: "ultra-processed" } as const;

export function productText(sp: ScoredProduct): string {
  const { product: p, result: r } = sp;
  const lines: string[] = [];
  const by = p.brand ? ` (${p.brand})` : "";
  lines.push(`**${p.name}**${by}: **${r.score === null ? "no score" : `${r.score}/100`} · ${RATING_LABEL[r.rating]}**`);
  lines.push(r.headline);
  if (r.score !== null) {
    const parts = [`nutrition ${r.nutrition.points}`];
    if (r.additives.penaltyPct) parts.push(`additives −${r.additives.penaltyPct}%`);
    if (r.processing.penaltyPct) parts.push(`processing −${r.processing.penaltyPct}%`);
    lines.push(`Score math: ${parts.join(", ")} = ${r.score}${r.caps.length ? ` (${r.caps.join("; ")})` : ""}.`);
  }
  if (r.nutrition.grade) lines.push(`Nutri-Score: ${r.nutrition.grade.toUpperCase()} (${r.nutrition.source === "official" ? "Open Food Facts" : "computed from the label"}).`);
  if (r.processing.novaGroup) {
    lines.push(
      `Processing: NOVA ${r.processing.novaGroup}, ${NOVA_LABEL[r.processing.novaGroup]}${r.processing.estimated ? " (estimated from ingredients)" : ""}.`,
    );
  }
  if (r.negatives.length) lines.push(`Negatives: ${r.negatives.map((l) => `${l.verdict} (${l.label.toLowerCase()} ${l.value} ${l.unit}/100)`).join("; ")}.`);
  if (r.positives.length) lines.push(`Positives: ${r.positives.map((l) => `${l.verdict} (${l.value} ${l.unit})`).join("; ")}.`);
  if (r.additives.items.length) {
    lines.push("Additives:");
    for (const a of r.additives.items) lines.push(`- ${additiveLine(a)}`);
  } else if (!r.missing.includes("ingredients")) {
    lines.push("Additives: none found.");
  }
  for (const f of r.flags) lines.push(`Note: ${f.label}. ${f.detail}`);
  if (r.missing.length) lines.push(`Missing data: ${r.missing.join(", ")}. A photo of the label would fill the gaps.`);
  if (p.source === "openfoodfacts") {
    lines.push(`Barcode ${p.barcode}. Data from Open Food Facts (ODbL)${p.url ? `: ${p.url}` : ""}.`);
  }
  return lines.join("\n");
}

export function additiveLine(a: AdditiveInfo): string {
  const risk = a.risk === "unknown" ? "not rated" : a.risk === "none" ? "no known risk" : `${a.risk} risk`;
  const code = a.code === "e14xx" ? "E14xx" : `E${a.code.slice(1)}`;
  return `${code} ${a.name} (${a.function}): ${risk}${a.why ? `. ${a.why}` : ""}`;
}

