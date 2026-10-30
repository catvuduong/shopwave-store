export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  category: string;
  stock: number;
  rating: number;
  createdAt: string;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Category {
  name: string;
  count: number;
}

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  imageUrl: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  stock: number;
}

export interface Totals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

export interface Cart extends Totals {
  id: string;
  couponCode: string | null;
  itemCount: number;
  items: CartItem[];
}

export interface CheckoutDetails {
  email: string;
  name: string;
  address: string;
}

export interface Order extends Totals {
  id: string;
  status: string;
  email: string;
  name: string;
  address: string;
  couponCode: string | null;
  createdAt: string;
  items: CartItem[];
}

export interface ProductQuery {
  q?: string;
  category?: string;
  /** Cents, matching the API. */
  minPrice?: number;
  /** Cents, matching the API. */
  maxPrice?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'We could not reach the store. Check your connection and try again.');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(res.status, message ?? `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  health: () => request<{ status: string; db: string }>('/health'),

  products(query: ProductQuery = {}): Promise<ProductPage> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    return request<ProductPage>(`/products?${params}`);
  },

  product: (slug: string) => request<Product>(`/products/${encodeURIComponent(slug)}`),

  categories: () => request<Category[]>('/categories'),

  createCart: () => request<Cart>('/carts', { method: 'POST' }),

  getCart: (cartId: string) => request<Cart>(`/carts/${cartId}`),

  addItem: (cartId: string, productId: number, quantity: number) =>
    request<Cart>(`/carts/${cartId}/items`, json('POST', { productId, quantity })),

  setQuantity: (cartId: string, productId: number, quantity: number) =>
    request<Cart>(`/carts/${cartId}/items/${productId}`, json('PUT', { quantity })),

  removeItem: (cartId: string, productId: number) =>
    request<Cart>(`/carts/${cartId}/items/${productId}`, { method: 'DELETE' }),

  applyCoupon: (cartId: string, code: string) => request<Cart>(`/carts/${cartId}/coupon`, json('POST', { code })),

  checkout: (cartId: string, details: CheckoutDetails) =>
    request<Order>(`/carts/${cartId}/checkout`, json('POST', details)),

  order: (orderId: string) => request<Order>(`/orders/${orderId}`),
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Formats integer cents for display only. All arithmetic stays in cents. */
export function formatMoney(cents: number): string {
  return currency.format(cents / 100);
}

/** Converts a dollar input from the form into integer cents, or undefined when blank. */
export function dollarsToCents(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return undefined;
  return Math.round(dollars * 100);
}
