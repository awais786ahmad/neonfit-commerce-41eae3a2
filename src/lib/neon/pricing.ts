import {
  ACCESSORIES,
  getBackingColor,
  getBackboard,
  getColor,
  getFont,
  getShape,
  getTier,
} from "./catalog";
import type { DesignPrice, NeonDesign, PriceLine } from "./types";

const PER_CHAR = 190;
const OUTDOOR_UPLIFT = 0.12;

/**
 * Client-side pricing engine. Prices are calculated from the design's
 * structured configuration (size tier, elements, backboard, accessories),
 * never from the visual preview alone.
 */
export function priceDesign(design: NeonDesign): DesignPrice {
  const tier = getTier(design.tierId);
  const lines: PriceLine[] = [
    { label: `${tier.name} sign · ${tier.widthIn}" wide`, amount: tier.base },
  ];

  let elementsCost = 0;
  for (const el of design.elements) {
    if (el.type === "text") {
      const font = getFont(el.fontId ?? "dancing");
      const chars = Math.max((el.text ?? "").replace(/\s/g, "").length, 1);
      const scale = Math.max(0.35, el.scale);
      elementsCost += Math.round(PER_CHAR * font.factor * chars * scale * scale ** 0.3);
    } else {
      const shape = getShape(el.shapeId ?? "heart");
      const scale = Math.max(0.4, el.scale);
      elementsCost += Math.round(shape.base * scale * scale ** 0.3);
    }
  }
  if (elementsCost > 0) {
    lines.push({ label: `Neon tube · ${design.elements.length} element${design.elements.length > 1 ? "s" : ""}`, amount: elementsCost });
  }

  const board = getBackboard(design.backboardId);
  if (board.cost > 0) {
    lines.push({ label: `Backboard · ${board.name}`, amount: board.cost });
  }

  const backing = getBackingColor(design.backingColorId);
  if (backing.surcharge > 0) {
    lines.push({ label: `Backing finish · ${backing.name}`, amount: backing.surcharge });
  }

  for (const id of design.accessories) {
    const acc = ACCESSORIES.find((a) => a.id === id);
    if (acc && acc.cost > 0) {
      lines.push({ label: acc.name, amount: acc.cost });
    }
  }

  let total = lines.reduce((sum, l) => sum + l.amount, 0);

  if (design.outdoor) {
    const uplift = Math.round(total * OUTDOOR_UPLIFT);
    lines.push({ label: "Weatherproof (outdoor) build", amount: uplift });
    total += uplift;
  }

  // color surcharges are folded in for transparency
  const usedColors = new Set(design.elements.map((e) => e.color));
  for (const id of usedColors) {
    const c = getColor(id);
    if (c.surcharge > 0) {
      lines.push({ label: `Premium color · ${c.name}`, amount: c.surcharge });
      total += c.surcharge;
    }
  }

  return { total, lines };
}

export function formatPrice(amount: number): string {
  return "Rs " + Math.round(amount).toLocaleString("en-US");
}

export const SHIPPING_FLAT = 900;
export const FREE_SHIPPING_THRESHOLD = 15000;
export const COUPON_CODES: Record<string, number> = {
  NEON15: 0.15,
};

export function shippingFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
}
