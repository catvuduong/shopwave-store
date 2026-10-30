import { Suspense } from 'react';
import { OrderView, OrderViewSkeleton } from './order-view';

// Reading `params` is request-time data, so it sits behind Suspense to let the page shell prerender.
export default function OrderPage({ params }: PageProps<'/orders/[id]'>) {
  return (
    <main className="page container">
      <Suspense fallback={<OrderViewSkeleton />}>
        <OrderFromParams params={params} />
      </Suspense>
    </main>
  );
}

async function OrderFromParams({ params }: { params: PageProps<'/orders/[id]'>['params'] }) {
  const { id } = await params;
  return <OrderView orderId={id} />;
}
