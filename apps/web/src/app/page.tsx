'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { EmptyState, ErrorState, LoadingGrid, LockIcon, RefreshIcon, TruckIcon } from '@/components/ui';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

const CATEGORY_CLASS: Record<string, string> = {
  Audio: 'audio',
  Wearables: 'wearables',
  'Home Office': 'home-office',
  Kitchen: 'kitchen',
};

const CATEGORY_BLURB: Record<string, string> = {
  Audio: 'Sound that fills the room',
  Wearables: 'Track every mile and night',
  'Home Office': 'A desk built for deep work',
  Kitchen: 'Slow mornings, sharper coffee',
};

function Hero() {
  return (
    <section className="hero">
      <div className="container hero__inner">
        <div>
          <span className="eyebrow">Spring collection · 16 new arrivals</span>
          <h1>Considered objects for a better everyday.</h1>
          <p>
            Audio, wearables and desk and kitchen essentials, built to last and priced honestly. Free shipping on
            orders over $50.
          </p>
          <div className="hero__actions">
            <Link href="/shop" className="btn btn--accent">
              Shop all products
            </Link>
            <Link href="/shop?category=Audio" className="btn btn--light">
              Explore audio
            </Link>
          </div>
          <dl className="hero__stats">
            <div>
              <dt>16</dt>
              <dd>Curated products</dd>
            </div>
            <div>
              <dt>30 days</dt>
              <dd>Easy returns</dd>
            </div>
            <div>
              <dt>$50+</dt>
              <dd>Free shipping</dd>
            </div>
          </dl>
        </div>

        <div className="hero__visual" aria-hidden>
          <div className="hero__tile hero__tile--a">
            <Image src="/product-images/aurora-anc-headphones.svg" alt="" fill unoptimized sizes="300px" />
          </div>
          <div className="hero__tile hero__tile--b">
            <Image src="/product-images/meridian-smartwatch.svg" alt="" fill unoptimized sizes="260px" />
          </div>
          <div className="hero__tile hero__tile--c">
            <Image src="/product-images/ridge-75-keyboard.svg" alt="" fill unoptimized sizes="260px" />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <div className="trust-strip">
      <div className="container trust-strip__inner">
        <div>
          <span className="trust-strip__icon">
            <TruckIcon />
          </span>
          Free shipping over $50, otherwise $5
        </div>
        <div>
          <span className="trust-strip__icon">
            <RefreshIcon />
          </span>
          30-day returns, no questions asked
        </div>
        <div>
          <span className="trust-strip__icon">
            <LockIcon />
          </span>
          Secure checkout, simulated for this demo
        </div>
      </div>
    </div>
  );
}

function Categories() {
  const { state, retry } = useAsync(() => api.categories(), []);

  return (
    <section className="section" aria-labelledby="categories-heading">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Browse</span>
            <h2 id="categories-heading">Shop by category</h2>
          </div>
        </div>

        {state.status === 'loading' && (
          <div className="category-grid" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div className="skeleton" style={{ minHeight: 150, borderRadius: 16 }} key={i} />
            ))}
          </div>
        )}
        {state.status === 'error' && <ErrorState message={state.error} onRetry={retry} />}
        {state.status === 'ready' && (
          <div className="category-grid">
            {state.data.map((category) => (
              <Link
                key={category.name}
                href={`/shop?category=${encodeURIComponent(category.name)}`}
                className={`category-tile category-tile--${CATEGORY_CLASS[category.name] ?? 'kitchen'}`}
              >
                <strong>{category.name}</strong>
                <span>
                  {CATEGORY_BLURB[category.name] ?? `${category.count} products`} · {category.count} items
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Featured() {
  const { state, retry } = useAsync(() => api.products({ sort: 'rating', pageSize: 8 }), []);

  return (
    <section className="section" style={{ paddingTop: 0 }} aria-labelledby="featured-heading">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Customer favourites</span>
            <h2 id="featured-heading">Featured this week</h2>
            <p>The highest-rated pieces in the store, picked by the people who own them.</p>
          </div>
          <Link href="/shop?sort=rating" className="btn btn--ghost btn--sm">
            View all top rated
          </Link>
        </div>

        {state.status === 'loading' && <LoadingGrid count={8} columns="four" />}
        {state.status === 'error' && <ErrorState message={state.error} onRetry={retry} />}
        {state.status === 'ready' && state.data.items.length === 0 && (
          <EmptyState title="No products yet">Check back soon, new arrivals are on the way.</EmptyState>
        )}
        {state.status === 'ready' && state.data.items.length > 0 && (
          <div className="product-grid product-grid--four">
            {state.data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PromiseBlock() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="panel" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="eyebrow">Our promise</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 650, letterSpacing: '-0.02em', marginTop: 6 }}>
              Honest prices, straightforward returns.
            </h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Free shipping on orders over $50, otherwise a flat $5. Send anything back within 30 days.
            </p>
          </div>
          <Link href="/shop" className="btn btn--primary">
            Start shopping
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main style={{ flex: 1 }}>
      <Hero />
      <TrustStrip />
      <Categories />
      <Featured />
      <PromiseBlock />
    </main>
  );
}
