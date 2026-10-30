'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { CartIcon } from './ui';

const NAV = [
  { href: '/shop', label: 'Shop all' },
  { href: '/shop?category=Audio', label: 'Audio' },
  { href: '/shop?category=Wearables', label: 'Wearables' },
  { href: '/shop?category=Home+Office', label: 'Home office' },
  { href: '/shop?category=Kitchen', label: 'Kitchen' },
];

export function SiteHeader() {
  const { cart, openDrawer } = useCart();
  const count = cart?.itemCount ?? 0;

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="logo" aria-label="Shopwave home">
          <span className="logo__mark" aria-hidden />
          Shopwave
        </Link>

        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <button type="button" className="cart-button nav-keep" onClick={openDrawer} aria-label={`Open cart, ${count} items`}>
          <CartIcon />
          <span>Cart</span>
          <span className="badge" data-testid="cart-count">
            {count}
          </span>
        </button>
      </div>
    </header>
  );
}
