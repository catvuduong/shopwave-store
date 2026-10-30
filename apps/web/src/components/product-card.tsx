import Image from 'next/image';
import Link from 'next/link';
import { formatMoney, type Product } from '@/lib/api';
import { Rating } from './ui';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="product-card" data-testid="product-card">
      <div className="product-card__media">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          unoptimized
          sizes="(max-width: 720px) 50vw, (max-width: 980px) 33vw, 25vw"
        />
      </div>
      <div className="product-card__body">
        <span className="eyebrow">{product.category}</span>
        <h3>{product.name}</h3>
        <div className="product-card__price-row">
          <span className="price">{formatMoney(product.priceCents)}</span>
          <Rating value={product.rating} />
        </div>
      </div>
    </Link>
  );
}
