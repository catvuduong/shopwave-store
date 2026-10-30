import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

// Add new tables here as extra statements; they are all created once, behind a lock.
const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS items (id SERIAL PRIMARY KEY, title TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now())',
  `CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    image_url TEXT NOT NULL,
    category TEXT NOT NULL,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    rating NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS coupons (
    code TEXT PRIMARY KEY,
    percent_off INT NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
    active BOOLEAN NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_code TEXT REFERENCES coupons(code),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS cart_items (
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (cart_id, product_id)
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_snapshot JSONB NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    total_cents INT NOT NULL CHECK (total_cents >= 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'shipped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

/** Runs a statement on the connection that owns the current transaction. */
export type Sql = <T = unknown>(sql: string, params?: unknown[]) => Promise<T[]>;

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
    : null;
  private ready: Promise<void> | null = null;

  get enabled(): boolean {
    return this.pool !== null;
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.pool) throw new Error('DATABASE_URL is not set');
    await this.ensureSchema();
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  /** Runs `work` in one transaction: it commits if `work` resolves and rolls back if it throws. */
  async transaction<T>(work: (sql: Sql) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('DATABASE_URL is not set');
    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const sql: Sql = async (text, params = []) => (await client.query(text, params)).rows;
      const result = await work(sql);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  private ensureSchema(): Promise<void> {
    this.ready ??= (async () => {
      // Concurrent instances (serverless cold starts, parallel test files) race on CREATE TABLE IF NOT EXISTS,
      // so serialize schema setup behind a transaction-scoped advisory lock.
      const client = await this.pool!.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(727274)');
        for (const statement of SCHEMA) await client.query(statement);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        this.ready = null;
        throw err;
      } finally {
        client.release();
      }
    })();
    return this.ready;
  }
}
