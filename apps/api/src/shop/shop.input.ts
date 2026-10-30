import { BadRequestException } from '@nestjs/common';

export const SORT_KEYS = ['price_asc', 'price_desc', 'rating', 'newest'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

export interface ProductQuery {
  q?: string;
  category?: string;
  /** Inclusive lower bound, in cents. */
  minPrice?: number;
  /** Inclusive upper bound, in cents. */
  maxPrice?: number;
  sort: SortKey;
  page: number;
  pageSize: number;
}

/** A query parameter may appear once; `?sort=a&sort=b` parses to an array and is rejected. */
function single(raw: Record<string, unknown>, key: string): string | undefined {
  const value = raw[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new BadRequestException(`${key} may only be given once`);
  return value;
}

function wholeNumber(raw: Record<string, unknown>, key: string): number | undefined {
  const value = single(raw, key);
  if (value === undefined || value === '') return undefined;
  if (!/^\d+$/.test(value)) throw new BadRequestException(`${key} must be a whole number`);
  return Number(value);
}

export function parseProductQuery(raw: Record<string, unknown>): ProductQuery {
  const sort = single(raw, 'sort') ?? 'newest';
  if (!(SORT_KEYS as readonly string[]).includes(sort)) {
    throw new BadRequestException(`sort must be one of ${SORT_KEYS.join(', ')}`);
  }

  const minPrice = wholeNumber(raw, 'minPrice');
  const maxPrice = wholeNumber(raw, 'maxPrice');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new BadRequestException('minPrice cannot be greater than maxPrice');
  }

  const page = wholeNumber(raw, 'page') ?? 1;
  const pageSize = wholeNumber(raw, 'pageSize') ?? DEFAULT_PAGE_SIZE;
  if (page < 1) throw new BadRequestException('page must be at least 1');
  if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new BadRequestException(`pageSize must be between 1 and ${MAX_PAGE_SIZE}`);
  }

  return {
    q: single(raw, 'q')?.trim() || undefined,
    category: single(raw, 'category')?.trim() || undefined,
    minPrice,
    maxPrice,
    sort: sort as SortKey,
    page,
    pageSize,
  };
}

/** Validates a JSON body field that must be a whole number (not a numeric string) of at least `min`. */
export function requireInt(value: unknown, name: string, min = 1): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    throw new BadRequestException(`${name} must be a whole number of at least ${min}`);
  }
  return value;
}
