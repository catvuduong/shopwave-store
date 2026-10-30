'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CheckIcon, ErrorState } from '@/components/ui';
import { api, formatMoney } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export function OrderViewSkeleton() {
  return (
    <div aria-busy="true" style={{ display: 'grid', gap: 18, justifyItems: 'center', padding: '48px 0' }}>
      <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
      <div className="skeleton" style={{ width: 320, height: 36 }} />
      <div className="skeleton" style={{ width: '100%', maxWidth: 640, height: 280, borderRadius: 16 }} />
    </div>
  );
}

export function OrderView({ orderId }: { orderId: string }) {
  const { state, retry } = useAsync(() => api.order(orderId), [orderId]);

  if (state.status === 'loading') return <OrderViewSkeleton />;

  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.error === 'Order not found' ? 'We could not find that order.' : state.error}
        onRetry={retry}
      />
    );
  }

  const order = state.data;
  const reference = order.id.slice(0, 8).toUpperCase();

  return (
    <section data-testid="order-success" aria-labelledby="order-heading">
      <div className="order-hero">
        <span className="order-hero__check">
          <CheckIcon size={30} />
        </span>
        <span className="eyebrow">Order {reference}</span>
        <h1 id="order-heading">Thank you, {order.name.split(' ')[0]}.</h1>
        <p className="muted" style={{ maxWidth: '44ch' }}>
          Your order is confirmed. This demo store does not send email, so keep this page for your records.
        </p>
      </div>

      <div className="order-layout">
        <div className="panel">
          <h2>Items</h2>
          <div className="summary-lines">
            {order.items.map((item) => (
              <div className="summary-line" key={item.productId}>
                <div className="summary-line__thumb">
                  <Image src={item.imageUrl} alt="" fill unoptimized sizes="56px" />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div className="summary-line__qty">
                    {item.quantity} × {formatMoney(item.unitPriceCents)}
                  </div>
                </div>
                <span className="price">{formatMoney(item.lineTotalCents)}</span>
              </div>
            ))}
          </div>
          <div className="totals" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div className="totals__row">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotalCents)}</span>
            </div>
            {order.discountCents > 0 && (
              <div className="totals__row totals__row--discount">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                <span>−{formatMoney(order.discountCents)}</span>
              </div>
            )}
            <div className="totals__row">
              <span>Shipping</span>
              <span>{order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents)}</span>
            </div>
            <div className="totals__row totals__row--total">
              <span>Paid</span>
              <span>{formatMoney(order.totalCents)}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Shipping to</h2>
          <dl className="definition">
            <div>
              <dt>Name</dt>
              <dd>{order.name}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd style={{ whiteSpace: 'pre-line' }}>{order.address}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd style={{ textTransform: 'capitalize' }}>{order.status}</dd>
            </div>
          </dl>
          <Link href="/shop" className="btn btn--primary">
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
