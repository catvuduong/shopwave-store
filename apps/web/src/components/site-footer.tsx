'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Health = { state: 'checking' | 'ok' | 'down'; text: string };

export function SiteFooter() {
  const [health, setHealth] = useState<Health>({ state: 'checking', text: 'checking...' });

  useEffect(() => {
    let active = true;
    api.health().then(
      (data) => {
        if (active) setHealth({ state: 'ok', text: `api ${data.status} / db ${data.db}` });
      },
      () => {
        if (active) setHealth({ state: 'down', text: 'api unreachable' });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <strong className="logo" style={{ color: 'var(--ink)' }}>
            Shopwave
          </strong>
          <p style={{ marginTop: 8, maxWidth: '36ch' }}>
            Considered objects for everyday life. Free shipping on orders over $50.
          </p>
        </div>
        <nav className="site-footer__links" aria-label="Footer">
          <Link href="/shop">Shop</Link>
          <Link href="/shop?sort=rating">Top rated</Link>
          <Link href="/shop?sort=newest">New arrivals</Link>
        </nav>
        <p className="health" data-state={health.state} data-testid="health">
          {health.text}
        </p>
      </div>
    </footer>
  );
}
