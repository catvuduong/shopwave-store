'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyState, ErrorState, QuantityPicker, Rating, TruckIcon } from '@/components/ui';
import { api, formatMoney } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useAsync } from '@/lib/use-async';

const MAX_PER_ORDER = 99;

export function ProductDetailSkeleton() {
  return (
    <div className="product-detail" aria-busy="true">
      <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 24 }} />
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="skeleton" style={{ height: 14, width: '30%' }} />
        <div className="skeleton" style={{ height: 40, width: '85%' }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    </div>
  );
}

function StockLine({ stock }: { stock: number }) {
  if (stock === 0) return <span className="stock-line stock-line--out">Sold out</span>;
  if (stock <= 5) return <span className="stock-line stock-line--low">Only {stock} left</span>;
  return <span className="stock-line">In stock</span>;
}

export function ProductDetail({ slug }: { slug: string }) {
  const { state, retry } = useAsync(() => api.product(slug), [slug]);
  const { addItem, openDrawer, busy } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [addError, setAddError] = useState<string | null>(null);

  if (state.status === 'loading') return <ProductDetailSkeleton />;

  if (state.status === 'error') {
    return (
      <>
        <Breadcrumb />
        {state.error === 'Product not found' ? (
          <EmptyState
            title="We could not find that product"
            action={
              <Link href="/shop" className="btn btn--ghost btn--sm">
                Back to the shop
              </Link>
            }
          >
            It may have been removed, or the link is out of date.
          </EmptyState>
        ) : (
          <ErrorState message={state.error} onRetry={retry} />
        )}
      </>
    );
  }

  const product = state.data;
  const maxQuantity = Math.min(product.stock, MAX_PER_ORDER);
  const selected = Math.min(quantity, Math.max(1, maxQuantity));

  async function onAddToCart() {
    setAddError(null);
    try {
      await addItem(product.id, selected);
      openDrawer();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add to cart.');
    }
  }

  return (
    <>
      <Breadcrumb category={product.category} name={product.name} />
      <div className="product-detail">
        <div className="product-detail__media">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            unoptimized
            priority
            sizes="(max-width: 980px) 100vw, 560px"
          />
        </div>

        <div className="product-detail__info">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="eyebrow">{product.category}</span>
            <Rating value={product.rating} />
          </div>
          <h1>{product.name}</h1>
          <p className="product-detail__price">{formatMoney(product.priceCents)}</p>
          <p className="product-detail__description">{product.description}</p>
          <StockLine stock={product.stock} />

          <div className="purchase">
            <div className="purchase__row">
              <QuantityPicker
                label="Quantity"
                value={selected}
                max={Math.max(1, maxQuantity)}
                disabled={product.stock === 0 || busy}
                onChange={setQuantity}
              />
              <button
                type="button"
                className="btn btn--accent"
                style={{ flex: 1 }}
                data-testid="add-to-cart"
                onClick={onAddToCart}
                disabled={product.stock === 0 || busy}
              >
                {product.stock === 0 ? 'Sold out' : busy ? 'Adding…' : 'Add to cart'}
              </button>
            </div>
            {addError && (
              <div className="notice notice--error" role="alert">
                {addError}
              </div>
            )}
            <div className="perks">
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <TruckIcon /> Free shipping over $50, otherwise $5
              </span>
              <span>30-day returns on every order.</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Breadcrumb({ category, name }: { category?: string; name?: string }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link> / <Link href="/shop">Shop</Link>
      {category && (
        <>
          {' '}
          / <Link href={`/shop?category=${encodeURIComponent(category)}`}>{category}</Link>
        </>
      )}
      {name && <> / <span aria-current="page">{name}</span></>}
    </nav>
  );
}
