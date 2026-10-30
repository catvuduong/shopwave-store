'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, type Cart } from './api';

const CART_STORAGE_KEY = 'shopwave.cartId';

type CartStatus = 'loading' | 'ready' | 'error';

interface CartContextValue {
  cart: Cart | null;
  status: CartStatus;
  /** Message for a failed load; mutation errors are thrown to the caller instead. */
  loadError: string | null;
  busy: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  retry: () => void;
  refresh: () => Promise<void>;
  addItem: (productId: number, quantity: number) => Promise<void>;
  setQuantity: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

// localStorage can be blocked (private mode, disabled storage); the cart then lives for the page only.
function readStoredCartId(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredCartId(cartId: string): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, cartId);
  } catch {
    // Ignored: the cart still works for this page visit.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [status, setStatus] = useState<CartStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const initRef = useRef<Promise<string> | null>(null);

  // Loads the stored cart, or starts a new one when there is none or the stored one no longer exists.
  const ensureCartId = useCallback((): Promise<string> => {
    initRef.current ??= (async () => {
      const stored = readStoredCartId();
      if (stored) {
        try {
          const existing = await api.getCart(stored);
          setCart(existing);
          return existing.id;
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) throw err;
        }
      }
      const created = await api.createCart();
      writeStoredCartId(created.id);
      setCart(created);
      return created.id;
    })().catch((err: unknown) => {
      initRef.current = null;
      throw err;
    });
    return initRef.current;
  }, []);

  useEffect(() => {
    let active = true;
    ensureCartId().then(
      () => {
        if (!active) return;
        setLoadError(null);
        setStatus('ready');
      },
      (err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Your cart could not be loaded.');
        setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [ensureCartId, attempt]);

  const mutate = useCallback(
    async (change: (cartId: string) => Promise<Cart>) => {
      const cartId = await ensureCartId();
      setBusy(true);
      try {
        setCart(await change(cartId));
      } finally {
        setBusy(false);
      }
    },
    [ensureCartId],
  );

  const refresh = useCallback(async () => {
    const cartId = await ensureCartId();
    setCart(await api.getCart(cartId));
  }, [ensureCartId]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      status,
      loadError,
      busy,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      retry: () => {
        initRef.current = null;
        setStatus('loading');
        setAttempt((n) => n + 1);
      },
      refresh,
      addItem: (productId, quantity) => mutate((id) => api.addItem(id, productId, quantity)),
      setQuantity: (productId, quantity) => mutate((id) => api.setQuantity(id, productId, quantity)),
      removeItem: (productId) => mutate((id) => api.removeItem(id, productId)),
      applyCoupon: (code) => mutate((id) => api.applyCoupon(id, code)),
    }),
    [cart, status, loadError, busy, drawerOpen, refresh, mutate],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
