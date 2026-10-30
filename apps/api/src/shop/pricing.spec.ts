import { calculateTotals, couponDiscountCents, shippingCents } from './pricing.js';

describe('calculateTotals', () => {
  it('sums line totals without a coupon', () => {
    expect(
      calculateTotals([
        { unitPriceCents: 1_999, quantity: 2 },
        { unitPriceCents: 500, quantity: 3 },
      ]),
    ).toEqual({ subtotalCents: 5_498, discountCents: 0, shippingCents: 0, totalCents: 5_498 });
  });

  it('applies the coupon to the subtotal and then charges shipping on the discounted amount', () => {
    expect(calculateTotals([{ unitPriceCents: 5_500, quantity: 1 }], 20)).toEqual({
      subtotalCents: 5_500,
      discountCents: 1_100,
      shippingCents: 500,
      totalCents: 4_400 + 500,
    });
  });

  it('returns all zeros for an empty cart', () => {
    expect(calculateTotals([], 10)).toEqual({
      subtotalCents: 0,
      discountCents: 0,
      shippingCents: 0,
      totalCents: 0,
    });
  });

  it('rejects prices that are not whole non-negative cents', () => {
    expect(() => calculateTotals([{ unitPriceCents: 9.5, quantity: 1 }])).toThrow(RangeError);
    expect(() => calculateTotals([{ unitPriceCents: -1, quantity: 1 }])).toThrow(RangeError);
  });

  it('rejects quantities below one', () => {
    expect(() => calculateTotals([{ unitPriceCents: 100, quantity: 0 }])).toThrow(RangeError);
    expect(() => calculateTotals([{ unitPriceCents: 100, quantity: 1.5 }])).toThrow(RangeError);
  });
});

describe('couponDiscountCents', () => {
  it('takes the percentage of the subtotal', () => {
    expect(couponDiscountCents(4_000, 10)).toBe(400);
  });

  it('rounds the discount down to the whole cent', () => {
    // 1999 * 15% = 299.85 cents
    expect(couponDiscountCents(1_999, 15)).toBe(299);
  });

  it('accepts 0% and 100%', () => {
    expect(couponDiscountCents(1_234, 0)).toBe(0);
    expect(couponDiscountCents(1_234, 100)).toBe(1_234);
  });

  it('rejects percentages outside 0-100 or not whole', () => {
    expect(() => couponDiscountCents(1_000, 101)).toThrow(RangeError);
    expect(() => couponDiscountCents(1_000, -5)).toThrow(RangeError);
    expect(() => couponDiscountCents(1_000, 10.5)).toThrow(RangeError);
  });
});

describe('shippingCents', () => {
  it('charges $5 on a subtotal under $50', () => {
    expect(shippingCents(499)).toBe(500);
  });

  it('charges $5 at exactly $50, because free shipping starts above $50', () => {
    expect(shippingCents(5_000)).toBe(500);
  });

  it('is free once the subtotal is over $50', () => {
    expect(shippingCents(5_001)).toBe(0);
  });

  it('is zero for an empty cart', () => {
    expect(shippingCents(0)).toBe(0);
  });
});
