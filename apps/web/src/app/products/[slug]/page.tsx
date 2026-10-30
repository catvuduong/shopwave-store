import { Suspense } from 'react';
import { ProductDetail, ProductDetailSkeleton } from './product-detail';

// Reading `params` is request-time data, so it sits behind Suspense to let the page shell prerender.
export default function ProductPage({ params }: PageProps<'/products/[slug]'>) {
  return (
    <main className="page container">
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductFromParams params={params} />
      </Suspense>
    </main>
  );
}

async function ProductFromParams({ params }: { params: PageProps<'/products/[slug]'>['params'] }) {
  const { slug } = await params;
  return <ProductDetail slug={slug} />;
}
