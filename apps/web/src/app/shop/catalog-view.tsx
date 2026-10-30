'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ProductCard } from '@/components/product-card';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/ui';
import { api, dollarsToCents } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export function CatalogView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const [searchText, setSearchText] = useState(q);
  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryString = searchParams.toString();

  const categories = useAsync(() => api.categories(), []);
  const products = useAsync(
    () =>
      api.products({
        q: q || undefined,
        category: category || undefined,
        sort,
        minPrice: dollarsToCents(minPrice),
        maxPrice: dollarsToCents(maxPrice),
        page,
        pageSize: PAGE_SIZE,
      }),
    [queryString],
  );

  // Every filter change is a URL change, so the page can be shared and reloaded as-is.
  function updateParams(patch: Record<string, string | undefined>, resetPage = true) {
    const params = new URLSearchParams(queryString);
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (resetPage) params.delete('page');
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParams({ q: searchText.trim() || undefined });
  }

  function onPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParams({ minPrice: minInput.trim() || undefined, maxPrice: maxInput.trim() || undefined });
  }

  function clearAll() {
    setSearchText('');
    setMinInput('');
    setMaxInput('');
    router.replace(pathname, { scroll: false });
  }

  const hasFilters = Boolean(q || category || minPrice || maxPrice || sort !== 'newest');
  const data = products.state.status === 'ready' ? products.state.data : null;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="catalog">
      <aside className={`filters${filtersOpen ? ' is-open' : ''}`} aria-label="Filters">
        <div>
          <p className="filters__title">Category</p>
          <div className="filters__list">
            <button
              type="button"
              className="filter-option"
              aria-pressed={!category}
              onClick={() => updateParams({ category: undefined })}
            >
              All products
            </button>
            {categories.state.status === 'ready' &&
              categories.state.data.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className="filter-option"
                  aria-pressed={category === option.name}
                  onClick={() => updateParams({ category: option.name })}
                >
                  {option.name}
                  <small>{option.count}</small>
                </button>
              ))}
          </div>
        </div>

        <form onSubmit={onPrice} aria-label="Price range">
          <p className="filters__title">Price</p>
          <div className="price-fields">
            <div className="field">
              <label htmlFor="min-price">Min $</label>
              <input
                id="min-price"
                className="input"
                inputMode="decimal"
                placeholder="0"
                value={minInput}
                onChange={(event) => setMinInput(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="max-price">Max $</label>
              <input
                id="max-price"
                className="input"
                inputMode="decimal"
                placeholder="No limit"
                value={maxInput}
                onChange={(event) => setMaxInput(event.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn--ghost btn--block btn--sm" style={{ marginTop: 10 }}>
            Apply price
          </button>
        </form>

        {hasFilters && (
          <button type="button" className="text-button" style={{ justifySelf: 'start' }} onClick={clearAll}>
            Clear all filters
          </button>
        )}
      </aside>

      <div>
        <div className="catalog__toolbar">
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <form onSubmit={onSearch} className="input-row search" role="search">
              <input
                type="search"
                className="input"
                name="q"
                placeholder="Search products"
                aria-label="Search products"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <button type="submit" className="btn btn--primary">
                Search
              </button>
            </form>
            <button
              type="button"
              className="btn btn--ghost btn--sm filters-toggle"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              {filtersOpen ? 'Hide filters' : 'Filters'}
            </button>
          </div>
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            className="select"
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value === 'newest' ? undefined : event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="catalog__meta" aria-live="polite">
          <span>
            {data
              ? `${data.total} ${data.total === 1 ? 'product' : 'products'}${category ? ` in ${category}` : ''}`
              : 'Loading products'}
          </span>
        </div>

        {products.state.status === 'loading' && <LoadingGrid count={PAGE_SIZE} />}

        {products.state.status === 'error' && (
          <ErrorState message={products.state.error} onRetry={products.retry} />
        )}

        {data && data.items.length === 0 && (
          <EmptyState
            title="No products match these filters"
            action={
              hasFilters ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll}>
                  Clear filters
                </button>
              ) : undefined
            }
          >
            Try a different search term or widen the price range.
          </EmptyState>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="product-grid">
              {data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <nav className="pagination" aria-label="Pagination">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) }, false)}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) }, false)}
              >
                Next
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
