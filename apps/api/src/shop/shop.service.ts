import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DbService, type Sql } from '../db.service.js';
import { COUPON_SEEDS, PRODUCT_SEEDS, seedCreatedAt } from './catalog.seed.js';
import { calculateTotals, type CartTotals } from './pricing.js';
import type { ProductQuery, SortKey } from './shop.input.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ORDER_BY: Record<SortKey, string> = {
  price_asc: 'price_cents ASC, id ASC',
  price_desc: 'price_cents DESC, id ASC',
  rating: 'rating DESC, id ASC',
  newest: 'created_at DESC, id DESC',
};

const PRODUCT_COLUMNS = 'id, slug, name, description, price_cents, image_url, category, stock, rating, created_at';

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

export interface Cart extends CartTotals {
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

export interface Order extends CartTotals {
  id: string;
  status: string;
  email: string;
  name: string;
  address: string;
  couponCode: string | null;
  createdAt: string;
  items: CartItem[];
}

interface ProductRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  category: string;
  stock: number;
  rating: string;
  created_at: Date;
}

interface CartRow {
  coupon_code: string | null;
  percent_off: number | null;
  active: boolean | null;
}

interface CartItemRow {
  product_id: number;
  slug: string;
  name: string;
  image_url: string;
  price_cents: number;
  stock: number;
  quantity: number;
}

interface OrderSnapshot {
  items: CartItem[];
  couponCode: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
}

interface OrderRow {
  id: string;
  cart_snapshot: OrderSnapshot;
  email: string;
  name: string;
  address: string;
  total_cents: number;
  status: string;
  created_at: Date;
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    imageUrl: row.image_url,
    category: row.category,
    stock: row.stock,
    rating: Number(row.rating),
    createdAt: row.created_at.toISOString(),
  };
}

function toCartItem(row: CartItemRow): CartItem {
  return {
    productId: row.product_id,
    slug: row.slug,
    name: row.name,
    imageUrl: row.image_url,
    unitPriceCents: row.price_cents,
    quantity: row.quantity,
    lineTotalCents: row.price_cents * row.quantity,
    stock: row.stock,
  };
}

function toOrder(row: OrderRow): Order {
  const snapshot = row.cart_snapshot;
  return {
    id: row.id,
    status: row.status,
    email: row.email,
    name: row.name,
    address: row.address,
    couponCode: snapshot.couponCode,
    createdAt: row.created_at.toISOString(),
    items: snapshot.items,
    subtotalCents: snapshot.subtotalCents,
    discountCents: snapshot.discountCents,
    shippingCents: snapshot.shippingCents,
    totalCents: row.total_cents,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function assertCartId(cartId: string): void {
  if (!UUID.test(cartId)) throw new NotFoundException('Cart not found');
}

function requiredText(value: unknown, name: string, max: number): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) throw new BadRequestException(`${name} is required`);
  if (trimmed.length > max) throw new BadRequestException(`${name} must be at most ${max} characters`);
  return trimmed;
}

function validateCheckout(input: Record<string, unknown>): CheckoutDetails {
  const email = requiredText(input.email, 'email', 254);
  if (!EMAIL.test(email)) throw new BadRequestException('email must be a valid email address');
  return {
    email,
    name: requiredText(input.name, 'name', 120),
    address: requiredText(input.address, 'address', 300),
  };
}

@Injectable()
export class ShopService implements OnModuleInit {
  private readonly logger = new Logger(ShopService.name);

  constructor(private readonly db: DbService) {}

  /** Inserts the demo catalog. Rows that already exist are left alone, so restarts are harmless. */
  async onModuleInit(): Promise<void> {
    if (!this.db.enabled) return;
    try {
      await this.db.transaction(async (sql) => {
        for (const [index, product] of PRODUCT_SEEDS.entries()) {
          await sql(
            `INSERT INTO products (slug, name, description, price_cents, image_url, category, stock, rating, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (slug) DO NOTHING`,
            [
              product.slug,
              product.name,
              product.description,
              product.priceCents,
              `/product-images/${product.slug}.svg`,
              product.category,
              product.stock,
              product.rating,
              seedCreatedAt(index),
            ],
          );
        }
        for (const coupon of COUPON_SEEDS) {
          await sql('INSERT INTO coupons (code, percent_off) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING', [
            coupon.code,
            coupon.percentOff,
          ]);
        }
      });
    } catch (err) {
      // The API still starts without a seeded catalog; /health reports the database state.
      this.logger.error('Could not seed the catalog', err instanceof Error ? err.stack : String(err));
    }
  }

  async listProducts(query: ProductQuery): Promise<ProductPage> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.q) {
      params.push(`%${escapeLike(query.q)}%`);
      where.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    if (query.category) {
      params.push(query.category);
      where.push(`category = $${params.length}`);
    }
    if (query.minPrice !== undefined) {
      params.push(query.minPrice);
      where.push(`price_cents >= $${params.length}`);
    }
    if (query.maxPrice !== undefined) {
      params.push(query.maxPrice);
      where.push(`price_cents <= $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [count] = await this.db.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM products ${whereSql}`,
      params,
    );
    const rows = await this.db.query<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM products ${whereSql}
       ORDER BY ${ORDER_BY[query.sort]} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );

    return { items: rows.map(toProduct), total: count.total, page: query.page, pageSize: query.pageSize };
  }

  async getProduct(slug: string): Promise<Product> {
    const [row] = await this.db.query<ProductRow>(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE slug = $1`, [slug]);
    if (!row) throw new NotFoundException('Product not found');
    return toProduct(row);
  }

  listCategories(): Promise<Category[]> {
    return this.db.query<Category>(
      'SELECT category AS name, COUNT(*)::int AS count FROM products GROUP BY category ORDER BY category',
    );
  }

  async createCart(): Promise<Cart> {
    const [row] = await this.db.query<{ id: string }>('INSERT INTO carts DEFAULT VALUES RETURNING id');
    return this.getCart(row.id);
  }

  getCart(cartId: string): Promise<Cart> {
    assertCartId(cartId);
    return this.db.transaction((sql) => this.readCart(sql, cartId));
  }

  addItem(cartId: string, productId: number, quantity: number): Promise<Cart> {
    return this.changeItem(cartId, productId, (current) => current + quantity);
  }

  setItemQuantity(cartId: string, productId: number, quantity: number): Promise<Cart> {
    return this.changeItem(cartId, productId, () => quantity);
  }

  removeItem(cartId: string, productId: number): Promise<Cart> {
    assertCartId(cartId);
    return this.db.transaction(async (sql) => {
      await this.lockCart(sql, cartId);
      await sql('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cartId, productId]);
      return this.readCart(sql, cartId);
    });
  }

  applyCoupon(cartId: string, rawCode: string): Promise<Cart> {
    assertCartId(cartId);
    const code = rawCode.trim().toUpperCase();
    return this.db.transaction(async (sql) => {
      await this.lockCart(sql, cartId);
      const [coupon] = await sql<{ code: string }>('SELECT code FROM coupons WHERE code = $1 AND active', [code]);
      if (!coupon) throw new BadRequestException('That coupon code is not valid');
      await sql('UPDATE carts SET coupon_code = $2 WHERE id = $1', [cartId, coupon.code]);
      return this.readCart(sql, cartId);
    });
  }

  /**
   * Fake payment: the order is recorded as paid straight away.
   * Stock is decremented only where enough remains, and the cart is emptied, all in one transaction.
   */
  checkout(cartId: string, input: Record<string, unknown>): Promise<Order> {
    assertCartId(cartId);
    const details = validateCheckout(input);
    return this.db.transaction(async (sql) => {
      await this.lockCart(sql, cartId);
      const cart = await this.readCart(sql, cartId);
      if (cart.items.length === 0) throw new BadRequestException('Your cart is empty');

      for (const item of cart.items) {
        const decremented = await sql(
          'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id',
          [item.quantity, item.productId],
        );
        if (decremented.length === 0) throw new BadRequestException(`Not enough stock for ${item.name}`);
      }

      const snapshot: OrderSnapshot = {
        items: cart.items,
        couponCode: cart.couponCode,
        subtotalCents: cart.subtotalCents,
        discountCents: cart.discountCents,
        shippingCents: cart.shippingCents,
      };
      const [row] = await sql<OrderRow>(
        `INSERT INTO orders (cart_snapshot, email, name, address, total_cents, status)
         VALUES ($1, $2, $3, $4, $5, 'paid')
         RETURNING id, cart_snapshot, email, name, address, total_cents, status, created_at`,
        [JSON.stringify(snapshot), details.email, details.name, details.address, cart.totalCents],
      );

      await sql('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
      await sql('UPDATE carts SET coupon_code = NULL WHERE id = $1', [cartId]);
      return toOrder(row);
    });
  }

  async getOrder(orderId: string): Promise<Order> {
    if (!UUID.test(orderId)) throw new NotFoundException('Order not found');
    const [row] = await this.db.query<OrderRow>(
      'SELECT id, cart_snapshot, email, name, address, total_cents, status, created_at FROM orders WHERE id = $1',
      [orderId],
    );
    if (!row) throw new NotFoundException('Order not found');
    return toOrder(row);
  }

  private changeItem(cartId: string, productId: number, next: (current: number) => number): Promise<Cart> {
    assertCartId(cartId);
    return this.db.transaction(async (sql) => {
      await this.lockCart(sql, cartId);
      const [product] = await sql<{ name: string; stock: number }>(
        'SELECT name, stock FROM products WHERE id = $1',
        [productId],
      );
      if (!product) throw new NotFoundException('Product not found');

      const [line] = await sql<{ quantity: number }>(
        'SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
        [cartId, productId],
      );
      const quantity = next(line?.quantity ?? 0);
      if (quantity > product.stock) {
        throw new BadRequestException(
          product.stock === 0 ? `${product.name} is out of stock` : `Only ${product.stock} left of ${product.name}`,
        );
      }

      await sql(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)
         ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
        [cartId, productId, quantity],
      );
      return this.readCart(sql, cartId);
    });
  }

  /** Locks the cart row so concurrent edits and checkouts on the same cart run one at a time. */
  private async lockCart(sql: Sql, cartId: string): Promise<void> {
    const rows = await sql('SELECT id FROM carts WHERE id = $1 FOR UPDATE', [cartId]);
    if (rows.length === 0) throw new NotFoundException('Cart not found');
  }

  private async readCart(sql: Sql, cartId: string): Promise<Cart> {
    const [cart] = await sql<CartRow>(
      `SELECT c.coupon_code, co.percent_off, co.active
       FROM carts c LEFT JOIN coupons co ON co.code = c.coupon_code
       WHERE c.id = $1`,
      [cartId],
    );
    if (!cart) throw new NotFoundException('Cart not found');

    const rows = await sql<CartItemRow>(
      `SELECT p.id AS product_id, p.slug, p.name, p.image_url, p.price_cents, p.stock, ci.quantity
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       ORDER BY p.id`,
      [cartId],
    );
    const items = rows.map(toCartItem);

    // An expired coupon stops applying to the cart without being removed from it.
    const couponCode = cart.active ? cart.coupon_code : null;
    const totals = calculateTotals(
      items.map((item) => ({ unitPriceCents: item.unitPriceCents, quantity: item.quantity })),
      couponCode ? (cart.percent_off ?? 0) : 0,
    );

    return {
      id: cartId,
      couponCode,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
      ...totals,
    };
  }
}
