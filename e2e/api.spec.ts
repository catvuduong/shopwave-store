import { test, expect, type APIRequestContext } from '@playwright/test';

const API = process.env.API_URL ?? 'http://localhost:3001';

interface Product {
  id: number;
  slug: string;
  category: string;
  priceCents: number;
  rating: number;
  stock: number;
  name: string;
  description: string;
}

interface Cart {
  id: string;
  couponCode: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  items: { productId: number; quantity: number }[];
}

interface Order {
  id: string;
  status: string;
  couponCode: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

async function getProduct(request: APIRequestContext, slug: string): Promise<Product> {
  const res = await request.get(`${API}/products/${slug}`);
  expect(res.status()).toBe(200);
  return res.json();
}

async function newCart(request: APIRequestContext): Promise<Cart> {
  const res = await request.post(`${API}/carts`);
  expect(res.status()).toBe(201);
  return res.json();
}

test.describe('catalog', () => {
  test('lists the seeded catalog with four categories of four products', async ({ request }) => {
    const res = await request.get(`${API}/products?pageSize=48`);
    expect(res.status()).toBe(200);
    const page = await res.json();
    expect(page.total).toBe(16);

    const categories = await (await request.get(`${API}/categories`)).json();
    expect(categories.map((c: { name: string }) => c.name).sort()).toEqual([
      'Audio',
      'Home Office',
      'Kitchen',
      'Wearables',
    ]);
    for (const category of categories) expect(category.count).toBe(4);
  });

  test('filters by category', async ({ request }) => {
    const page = await (await request.get(`${API}/products?category=Audio&pageSize=48`)).json();
    expect(page.total).toBe(4);
    expect(page.items.every((p: Product) => p.category === 'Audio')).toBe(true);
  });

  test('filters by a price range given in cents', async ({ request }) => {
    const page = await (await request.get(`${API}/products?minPrice=5000&maxPrice=10000&pageSize=48`)).json();
    expect(page.items.length).toBeGreaterThan(0);
    for (const product of page.items as Product[]) {
      expect(product.priceCents).toBeGreaterThanOrEqual(5_000);
      expect(product.priceCents).toBeLessThanOrEqual(10_000);
    }
  });

  test('searches names and descriptions case-insensitively', async ({ request }) => {
    const page = await (await request.get(`${API}/products?q=LAMP`)).json();
    expect(page.items.map((p: Product) => p.slug)).toContain('ember-desk-lamp');
  });

  test('sorts by price ascending and descending', async ({ request }) => {
    const asc = await (await request.get(`${API}/products?sort=price_asc&pageSize=48`)).json();
    const ascPrices = asc.items.map((p: Product) => p.priceCents);
    expect(ascPrices).toEqual([...ascPrices].sort((a, b) => a - b));

    const desc = await (await request.get(`${API}/products?sort=price_desc&pageSize=48`)).json();
    const descPrices = desc.items.map((p: Product) => p.priceCents);
    expect(descPrices).toEqual([...descPrices].sort((a, b) => b - a));
  });

  test('sorts by rating, highest first', async ({ request }) => {
    const page = await (await request.get(`${API}/products?sort=rating&pageSize=48`)).json();
    const ratings = page.items.map((p: Product) => p.rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    expect(page.items[0].slug).toBe('forge-chef-knife');
  });

  test('paginates the results', async ({ request }) => {
    const first = await (await request.get(`${API}/products?pageSize=5&page=1`)).json();
    const last = await (await request.get(`${API}/products?pageSize=5&page=4`)).json();
    expect(first.items).toHaveLength(5);
    expect(last.items).toHaveLength(1);
    expect(last.total).toBe(16);
    expect(first.items[0].slug).not.toBe(last.items[0].slug);
  });

  test('rejects invalid filters with 400', async ({ request }) => {
    expect((await request.get(`${API}/products?sort=cheapest`)).status()).toBe(400);
    expect((await request.get(`${API}/products?minPrice=9000&maxPrice=1000`)).status()).toBe(400);
    expect((await request.get(`${API}/products?minPrice=19.99`)).status()).toBe(400);
  });

  test('returns 404 for an unknown product slug', async ({ request }) => {
    expect((await request.get(`${API}/products/does-not-exist`)).status()).toBe(404);
  });
});

test.describe('cart', () => {
  test('rejects a quantity above stock with 400 and leaves the cart unchanged', async ({ request }) => {
    const product = await getProduct(request, 'halo-wireless-earbuds');
    const cart = await newCart(request);

    const res = await request.put(`${API}/carts/${cart.id}/items/${product.id}`, {
      data: { quantity: product.stock + 1 },
    });
    expect(res.status()).toBe(400);

    const after = (await (await request.get(`${API}/carts/${cart.id}`)).json()) as Cart;
    expect(after.items).toHaveLength(0);
  });

  test('rejects an add that would exceed stock when combined with the existing quantity', async ({ request }) => {
    const product = await getProduct(request, 'halo-wireless-earbuds');
    const cart = await newCart(request);

    const first = await request.post(`${API}/carts/${cart.id}/items`, {
      data: { productId: product.id, quantity: product.stock },
    });
    expect(first.status()).toBe(201);

    const second = await request.post(`${API}/carts/${cart.id}/items`, {
      data: { productId: product.id, quantity: 1 },
    });
    expect(second.status()).toBe(400);
  });

  test('applies a percentage coupon to the cart totals', async ({ request }) => {
    const product = await getProduct(request, 'forge-chef-knife');
    const cart = await newCart(request);
    await request.post(`${API}/carts/${cart.id}/items`, { data: { productId: product.id, quantity: 1 } });

    const res = await request.post(`${API}/carts/${cart.id}/coupon`, { data: { code: 'fall15' } });
    expect(res.status()).toBe(200);
    const applied = (await res.json()) as Cart;

    expect(applied.couponCode).toBe('FALL15');
    expect(applied.subtotalCents).toBe(product.priceCents);
    expect(applied.discountCents).toBe(Math.floor((product.priceCents * 15) / 100));
    expect(applied.totalCents).toBe(
      applied.subtotalCents - applied.discountCents + applied.shippingCents,
    );
  });

  test('rejects an unknown coupon with 400', async ({ request }) => {
    const cart = await newCart(request);
    const res = await request.post(`${API}/carts/${cart.id}/coupon`, { data: { code: 'NOT-A-CODE' } });
    expect(res.status()).toBe(400);
  });

  test('returns 404 for an unknown cart', async ({ request }) => {
    expect((await request.get(`${API}/carts/00000000-0000-4000-8000-000000000000`)).status()).toBe(404);
    expect((await request.get(`${API}/carts/not-a-uuid`)).status()).toBe(404);
  });
});

test.describe('checkout', () => {
  test('decrements stock, records the order and empties the cart', async ({ request }) => {
    const product = await getProduct(request, 'cedar-cutting-board');
    const cart = await newCart(request);
    await request.post(`${API}/carts/${cart.id}/items`, { data: { productId: product.id, quantity: 2 } });

    const res = await request.post(`${API}/carts/${cart.id}/checkout`, {
      data: { email: 'shopper@example.com', name: 'Ada Shopper', address: '1 Analytical Way, London' },
    });
    expect(res.status()).toBe(201);
    const order = (await res.json()) as Order;
    expect(order.status).toBe('paid');
    expect(order.totalCents).toBe(order.subtotalCents - order.discountCents + order.shippingCents);

    const after = await getProduct(request, 'cedar-cutting-board');
    expect(after.stock).toBe(product.stock - 2);

    const emptied = (await (await request.get(`${API}/carts/${cart.id}`)).json()) as Cart;
    expect(emptied.items).toHaveLength(0);
    expect(emptied.totalCents).toBe(0);

    const fetched = await (await request.get(`${API}/orders/${order.id}`)).json();
    expect(fetched.id).toBe(order.id);
    expect(fetched.totalCents).toBe(order.totalCents);
  });

  test('charges the coupon-discounted total and records the code on the order', async ({ request }) => {
    const product = await getProduct(request, 'kestrel-pour-over-kit');
    const cart = await newCart(request);
    await request.post(`${API}/carts/${cart.id}/items`, { data: { productId: product.id, quantity: 1 } });
    await request.post(`${API}/carts/${cart.id}/coupon`, { data: { code: 'WELCOME10' } });

    const before = (await (await request.get(`${API}/carts/${cart.id}`)).json()) as Cart;
    const discounted = before.subtotalCents - before.discountCents;
    expect(before.discountCents).toBe(Math.floor(before.subtotalCents / 10));
    // Shipping is judged on the discounted subtotal, so this $64 cart less 10% ships free.
    expect(before.shippingCents).toBe(discounted > 5_000 ? 0 : 500);

    const res = await request.post(`${API}/carts/${cart.id}/checkout`, {
      data: { email: 'coupon@example.com', name: 'Grace Coupon', address: '2 Compiler Lane' },
    });
    expect(res.status()).toBe(201);
    const order = (await res.json()) as Order;
    expect(order.couponCode).toBe('WELCOME10');
    expect(order.totalCents).toBe(before.totalCents);
  });

  test('refuses to check out an empty cart', async ({ request }) => {
    const cart = await newCart(request);
    const res = await request.post(`${API}/carts/${cart.id}/checkout`, {
      data: { email: 'empty@example.com', name: 'Nobody', address: 'Nowhere' },
    });
    expect(res.status()).toBe(400);
  });

  test('validates the contact details', async ({ request }) => {
    const product = await getProduct(request, 'quill-notebook-set');
    const cart = await newCart(request);
    await request.post(`${API}/carts/${cart.id}/items`, { data: { productId: product.id, quantity: 1 } });

    const res = await request.post(`${API}/carts/${cart.id}/checkout`, {
      data: { email: 'not-an-email', name: 'Ada', address: '1 Way' },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 404 for an unknown order', async ({ request }) => {
    expect((await request.get(`${API}/orders/00000000-0000-4000-8000-000000000000`)).status()).toBe(404);
  });
});
