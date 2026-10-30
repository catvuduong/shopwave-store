import type { ReactNode } from 'react';

export function CartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 4h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L21 8H6.2" strokeLinejoin="round" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </svg>
  );
}

export function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TruckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z" strokeLinejoin="round" />
      <circle cx="6" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

export function RefreshIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="rating" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="rating__star" aria-hidden>
        ★
      </span>
      {value.toFixed(1)}
      {count !== undefined && <span className="muted">({count})</span>}
    </span>
  );
}

export function LoadingGrid({ count = 8, columns }: { count?: number; columns?: 'four' }) {
  return (
    <div className={`product-grid${columns === 'four' ? ' product-grid--four' : ''}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton-card" key={i} aria-hidden>
          <div className="skeleton skeleton-card__media" />
          <div className="skeleton-card__body">
            <div className="skeleton" style={{ height: 12, width: '30%' }} />
            <div className="skeleton" style={{ height: 16, width: '80%' }} />
            <div className="skeleton" style={{ height: 16, width: '40%' }} />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading products</span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="state">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon" aria-hidden>
        !
      </span>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          <RefreshIcon /> Try again
        </button>
      )}
    </div>
  );
}

export function QuantityPicker({
  value,
  max,
  onChange,
  disabled,
  label,
  compact,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={`qty${compact ? ' qty--compact' : ''}`} role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        +
      </button>
    </div>
  );
}
