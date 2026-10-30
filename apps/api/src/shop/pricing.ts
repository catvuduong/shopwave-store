// Money is always integer cents. Everything here is pure so the rules can be unit-tested without a database.

export const FREE_SHIPPING_OVER_CENTS = 5_000;
export const FLAT_SHIPPING_CENTS = 500;

export interface PricedLine {
  unitPriceCents: number;
  quantity: number;
}

export interface CartTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

/** Percent-off discount on a subtotal, rounded down to the whole cent. */
export function couponDiscountCents(subtotalCents: number, percentOff: number): number {
  if (!Number.isInteger(percentOff) || percentOff < 0 || percentOff > 100) {
    throw new RangeError(`percentOff must be a whole number from 0 to 100, got ${percentOff}`);
  }
  return Math.floor((subtotalCents * percentOff) / 100);
}

/**
 * Flat shipping, waived once the discounted subtotal is over $50.
 * An empty cart has nothing to ship, so it costs nothing.
 */
export function shippingCents(discountedSubtotalCents: number): number {
  if (discountedSubtotalCents === 0) return 0;
  return discountedSubtotalCents > FREE_SHIPPING_OVER_CENTS ? 0 : FLAT_SHIPPING_CENTS;
}

export function calculateTotals(lines: PricedLine[], percentOff = 0): CartTotals {
  let subtotalCents = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) {
      throw new RangeError(`unitPriceCents must be a non-negative integer, got ${line.unitPriceCents}`);
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new RangeError(`quantity must be a positive integer, got ${line.quantity}`);
    }
    subtotalCents += line.unitPriceCents * line.quantity;
  }

  const discountCents = couponDiscountCents(subtotalCents, percentOff);
  const discountedSubtotalCents = subtotalCents - discountCents;
  const shipping = shippingCents(discountedSubtotalCents);

  return {
    subtotalCents,
    discountCents,
    shippingCents: shipping,
    totalCents: discountedSubtotalCents + shipping,
  };
}
