import { BadRequestException } from '@nestjs/common';
import { parseProductQuery, requireInt } from './shop.input.js';

describe('parseProductQuery', () => {
  it('uses newest-first sorting and the first page by default', () => {
    expect(parseProductQuery({})).toEqual({ sort: 'newest', page: 1, pageSize: 12 });
  });

  it('reads filters, sort and pagination', () => {
    expect(
      parseProductQuery({
        q: ' lamp ',
        category: 'Home Office',
        minPrice: '1000',
        maxPrice: '9000',
        sort: 'price_desc',
        page: '2',
        pageSize: '5',
      }),
    ).toEqual({
      q: 'lamp',
      category: 'Home Office',
      minPrice: 1_000,
      maxPrice: 9_000,
      sort: 'price_desc',
      page: 2,
      pageSize: 5,
    });
  });

  it('rejects an unknown sort', () => {
    expect(() => parseProductQuery({ sort: 'cheapest' })).toThrow(BadRequestException);
  });

  it('rejects prices that are not whole cents', () => {
    expect(() => parseProductQuery({ minPrice: '19.99' })).toThrow(BadRequestException);
    expect(() => parseProductQuery({ maxPrice: '-5' })).toThrow(BadRequestException);
  });

  it('rejects a minimum price above the maximum', () => {
    expect(() => parseProductQuery({ minPrice: '5000', maxPrice: '4000' })).toThrow(BadRequestException);
  });

  it('rejects a page below 1 and a page size outside 1-48', () => {
    expect(() => parseProductQuery({ page: '0' })).toThrow(BadRequestException);
    expect(() => parseProductQuery({ pageSize: '0' })).toThrow(BadRequestException);
    expect(() => parseProductQuery({ pageSize: '49' })).toThrow(BadRequestException);
  });

  it('rejects a parameter repeated in the query string', () => {
    expect(() => parseProductQuery({ category: ['Audio', 'Kitchen'] })).toThrow(BadRequestException);
  });
});

describe('requireInt', () => {
  it('accepts whole numbers at or above the minimum', () => {
    expect(requireInt(3, 'quantity')).toBe(3);
  });

  it('rejects numeric strings, fractions and values below the minimum', () => {
    expect(() => requireInt('3', 'quantity')).toThrow(BadRequestException);
    expect(() => requireInt(1.5, 'quantity')).toThrow(BadRequestException);
    expect(() => requireInt(0, 'quantity')).toThrow(BadRequestException);
    expect(() => requireInt(undefined, 'quantity')).toThrow(BadRequestException);
  });
});
