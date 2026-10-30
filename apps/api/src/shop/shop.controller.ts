import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { parseProductQuery, requireInt } from './shop.input.js';
import { ShopService } from './shop.service.js';

function parseProductId(value: string): number {
  if (!/^\d+$/.test(value)) throw new NotFoundException('Product not found');
  return Number(value);
}

// Missing JSON bodies arrive as undefined; treat them as an empty object so the field checks report what is missing.
function bodyOf(body: Record<string, unknown> | undefined): Record<string, unknown> {
  return body ?? {};
}

@Controller()
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  /** Money query params (minPrice, maxPrice) are in cents, like every other amount in the API. */
  @Get('products')
  listProducts(@Query() query: Record<string, unknown>) {
    return this.shop.listProducts(parseProductQuery(query));
  }

  @Get('products/:slug')
  getProduct(@Param('slug') slug: string) {
    return this.shop.getProduct(slug);
  }

  @Get('categories')
  listCategories() {
    return this.shop.listCategories();
  }

  @Post('carts')
  createCart() {
    return this.shop.createCart();
  }

  @Get('carts/:id')
  getCart(@Param('id') id: string) {
    return this.shop.getCart(id);
  }

  /** Adds to the quantity already in the cart. */
  @Post('carts/:id/items')
  addItem(@Param('id') id: string, @Body() body: Record<string, unknown> | undefined) {
    const input = bodyOf(body);
    return this.shop.addItem(id, requireInt(input.productId, 'productId'), requireInt(input.quantity, 'quantity'));
  }

  /** Sets the absolute quantity. Use DELETE to remove a line. */
  @Put('carts/:id/items/:productId')
  setItemQuantity(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    const quantity = requireInt(bodyOf(body).quantity, 'quantity');
    return this.shop.setItemQuantity(id, parseProductId(productId), quantity);
  }

  @Delete('carts/:id/items/:productId')
  removeItem(@Param('id') id: string, @Param('productId') productId: string) {
    return this.shop.removeItem(id, parseProductId(productId));
  }

  @Post('carts/:id/coupon')
  @HttpCode(200)
  applyCoupon(@Param('id') id: string, @Body() body: Record<string, unknown> | undefined) {
    const code = bodyOf(body).code;
    if (typeof code !== 'string' || !code.trim()) throw new BadRequestException('code is required');
    return this.shop.applyCoupon(id, code);
  }

  @Post('carts/:id/checkout')
  checkout(@Param('id') id: string, @Body() body: Record<string, unknown> | undefined) {
    return this.shop.checkout(id, bodyOf(body));
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.shop.getOrder(id);
  }
}
