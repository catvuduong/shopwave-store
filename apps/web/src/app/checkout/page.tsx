'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { EmptyState, ErrorState, LockIcon } from '@/components/ui';
import { api, formatMoney, type CheckoutDetails } from '@/lib/api';
import { useCart } from '@/lib/cart';

const EMPTY_FORM: CheckoutDetails = { email: '', name: '', address: '' };

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, status, loadError, retry, refresh } = useCart();
  const [form, setForm] = useState<CheckoutDetails>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update(field: keyof CheckoutDetails) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await api.checkout(cart.id, form);
      // The server has emptied the cart; reload it so the header count clears before we leave.
      await refresh().catch(() => undefined);
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'We could not place your order. Please try again.');
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <main className="page container" aria-busy="true">
        <div className="skeleton" style={{ height: 40, width: 220, marginBottom: 32 }} />
        <div className="checkout">
          <div className="skeleton" style={{ height: 480, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="page container">
        <ErrorState message={loadError ?? 'Your cart could not be loaded.'} onRetry={retry} />
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="page container">
        <h1 className="page-title" style={{ marginBottom: 28 }}>
          Checkout
        </h1>
        <EmptyState
          title="Your cart is empty"
          action={
            <Link href="/shop" className="btn btn--primary btn--sm">
              Browse products
            </Link>
          }
        >
          Add something you love, then come back to check out.
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="page container">
      <header style={{ marginBottom: 28 }}>
        <span className="eyebrow">Almost there</span>
        <h1 className="page-title" style={{ marginTop: 8 }}>
          Checkout
        </h1>
      </header>

      <div className="checkout">
        <form className="panel" data-testid="checkout-form" onSubmit={onSubmit}>
          <h2>Contact and shipping</h2>
          <div className="form-grid">
            <div className="field wide">
              <label htmlFor="checkout-name">Full name</label>
              <input
                id="checkout-name"
                className="input"
                autoComplete="name"
                required
                maxLength={120}
                value={form.name}
                onChange={update('name')}
              />
            </div>
            <div className="field wide">
              <label htmlFor="checkout-email">Email</label>
              <input
                id="checkout-email"
                type="email"
                className="input"
                autoComplete="email"
                required
                maxLength={254}
                value={form.email}
                onChange={update('email')}
              />
            </div>
            <div className="field wide">
              <label htmlFor="checkout-address">Shipping address</label>
              <textarea
                id="checkout-address"
                className="input"
                autoComplete="street-address"
                required
                maxLength={300}
                value={form.address}
                onChange={update('address')}
              />
            </div>
          </div>

          <div className="notice" style={{ background: 'var(--bg)', color: 'var(--ink-2)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <LockIcon /> Payment is simulated for this demo. No card details are needed and nothing is charged.
          </div>

          {submitError && (
            <div className="notice notice--error" role="alert">
              {submitError}
            </div>
          )}

          <button type="submit" className="btn btn--accent btn--block" disabled={submitting}>
            {submitting ? 'Placing order…' : `Place order · ${formatMoney(cart.totalCents)}`}
          </button>
        </form>

        <aside className="panel" aria-label="Order summary">
          <h2>Order summary</h2>
          <div className="summary-lines">
            {cart.items.map((item) => (
              <div className="summary-line" key={item.productId}>
                <div className="summary-line__thumb">
                  <Image src={item.imageUrl} alt="" fill unoptimized sizes="56px" />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div className="summary-line__qty">Qty {item.quantity}</div>
                </div>
                <span className="price">{formatMoney(item.lineTotalCents)}</span>
              </div>
            ))}
          </div>

          <div className="totals" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div className="totals__row">
              <span>Subtotal</span>
              <span>{formatMoney(cart.subtotalCents)}</span>
            </div>
            {cart.couponCode && (
              <div className="totals__row totals__row--discount">
                <span>Discount ({cart.couponCode})</span>
                <span>−{formatMoney(cart.discountCents)}</span>
              </div>
            )}
            <div className="totals__row">
              <span>Shipping</span>
              <span>{cart.shippingCents === 0 ? 'Free' : formatMoney(cart.shippingCents)}</span>
            </div>
            <div className="totals__row totals__row--total">
              <span>Total</span>
              <span>{formatMoney(cart.totalCents)}</span>
            </div>
          </div>
          <Link href="/shop" className="text-button" style={{ justifySelf: 'start' }}>
            Continue shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}
