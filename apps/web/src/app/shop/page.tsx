import { Suspense } from 'react';
import { LoadingGrid } from '@/components/ui';
import { CatalogView } from './catalog-view';

export default function ShopPage() {
  return (
    <main className="page container">
      <header style={{ marginBottom: 28 }}>
        <span className="eyebrow">The catalog</span>
        <h1 className="page-title" style={{ marginTop: 8 }}>
          Everything in the shop
        </h1>
      </header>
      {/* useSearchParams needs a Suspense boundary so the shell can prerender. */}
      <Suspense fallback={<LoadingGrid count={12} />}>
        <CatalogView />
      </Suspense>
    </main>
  );
}
