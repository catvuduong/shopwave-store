'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { formatMoney } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { CartIcon, CloseIcon, EmptyState, ErrorState, QuantityPicker } from './ui';

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

export function CartDrawer() {
  const { cart, status, loadError, busy, drawerOpen, closeDrawer, retry, setQuantity, removeItem, applyCoupon } =
    useCart();
  const [actionError, setActionError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  // Escape closes the drawer and the page underneath stops scrolling while it is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen, closeDrawer]);

  async function run(action: () => Promise<void>): Promise<boolean> {
    setActionError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setActionError(errorText(err));
      return false;
    }
  }

  async function onApplyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    const applied = await run(() => applyCoupon(couponInput));
    setCouponBusy(false);
    if (applied) setCouponInput('');
  }

  const items = cart?.items ?? [];
  const showFooter = status === 'ready' && items.length > 0;

  return (
    <>
      <div className={`drawer-scrim${drawerOpen ? ' is-open' : ''}`} onClick={closeDrawer} aria-hidden />
      <aside
        className={`cart-drawer${drawerOpen ? ' is-open' : ''}`}
        data-testid="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!drawerOpen}
      >
        <div className="cart-drawer__head">
          <h2>Your cart{cart && cart.itemCount > 0 ? ` (${cart.itemCount})` : ''}</h2>
          <button type="button" className="icon-button" onClick={closeDrawer} aria-label="Close cart">
            <CloseIcon />
          </button>
        </div>

        <div className="cart-drawer__body">
          {status === 'loading' && (
            <div style={{ display: 'grid', gap: 14, padding: '20px 0' }} aria-busy="true">
              <div className="skeleton" style={{ height: 76 }} />
              <div className="skeleton" style={{ height: 76 }} />
            </div>
          )}

          {status === 'error' && (
            <div style={{ padding: '24px 0' }}>
              <ErrorState message={loadError ?? 'Your cart could not be loaded.'} onRetry={retry} />
            </div>
          )}

          {status === 'ready' && items.length === 0 && (
            <div style={{ padding: '24px 0' }}>
              <EmptyState
                title="Your cart is empty"
                action={
                  <button type="button" className="btn btn--ghost btn--sm" onClick={closeDrawer}>
                    Keep browsing
                  </button>
                }
              >
                Items you add will appear here.
              </EmptyState>
            </div>
          )}

          {showFooter &&
            items.map((item) => (
              <div className="cart-line" key={item.productId}>
                <Link href={`/products/${item.slug}`} className="cart-line__thumb" onClick={closeDrawer}>
                  <Image src={item.imageUrl} alt="" fill unoptimized sizes="76px" />
                </Link>
                <div className="cart-line__body">
                  <div className="cart-line__title">
                    <Link href={`/products/${item.slug}`} onClick={closeDrawer}>
                      {item.name}
                    </Link>
                    <span className="price">{formatMoney(item.lineTotalCents)}</span>
                  </div>
                  <div className="cart-line__controls">
                    <QuantityPicker
                      compact
                      label={`Quantity for ${item.name}`}
                      value={item.quantity}
                      max={item.stock}
                      disabled={busy}
                      onChange={(next) => run(() => setQuantity(item.productId, next))}
                    />
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => run(() => removeItem(item.productId))}
                    >
                      Remove
                    </button>
                  </div>
                  {item.quantity >= item.stock && (
                    <span className="hint">Maximum available: {item.stock}</span>
                  )}
                </div>
              </div>
            ))}
        </div>

        {showFooter && cart && (
          <div className="cart-drawer__foot">
            {actionError && (
              <div className="notice notice--error" role="alert">
                {actionError}
              </div>
            )}

            {cart.couponCode ? (
              <p className="notice notice--success">
                Code <strong>{cart.couponCode}</strong> applied.
              </p>
            ) : (
              <form onSubmit={onApplyCoupon} className="input-row" aria-label="Coupon">
                <input
                  className="input"
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value)}
                  autoComplete="off"
                />
                <button type="submit" className="btn btn--ghost" disabled={couponBusy || !couponInput.trim()}>
                  Apply
                </button>
              </form>
            )}

            <div className="totals">
              <div className="totals__row">
                <span>Subtotal</span>
                <span>{formatMoney(cart.subtotalCents)}</span>
              </div>
              {cart.discountCents > 0 && (
                <div className="totals__row totals__row--discount">
                  <span>Discount</span>
                  <span>−{formatMoney(cart.discountCents)}</span>
                </div>
              )}
              <div className="totals__row">
                <span>Shipping</span>
                <span>{cart.shippingCents === 0 ? 'Free' : formatMoney(cart.shippingCents)}</span>
              </div>
              <div className="totals__row totals__row--total">
                <span>Total</span>
                <span data-testid="cart-total">{formatMoney(cart.totalCents)}</span>
              </div>
            </div>
            <Link href="/checkout" className="btn btn--primary btn--block" onClick={closeDrawer}>
              <CartIcon size={16} /> Checkout
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
