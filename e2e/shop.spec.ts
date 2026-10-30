import { test, expect } from '@playwright/test';

test('home page shows the hero and featured products on load', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('product-card')).toHaveCount(8);
});

test('filters the catalog from the sidebar', async ({ page }) => {
  await page.goto('/shop');
  await expect(page.getByTestId('product-card')).toHaveCount(12);

  await page.getByRole('button', { name: /^Kitchen/ }).click();
  await expect(page).toHaveURL(/category=Kitchen/);
  await expect(page.getByTestId('product-card')).toHaveCount(4);
  await expect(page.getByTestId('product-card').first()).toContainText('Kitchen');
});

test('browse, add to cart and check out', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Shop all products' }).click();
  await expect(page).toHaveURL(/\/shop$/);

  // Search rather than scan pages: the headphones sort onto page two of the newest-first catalog.
  await page.getByRole('searchbox', { name: 'Search products' }).fill('Aurora');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  // Role queries skip hidden elements; the home page stays mounted, hidden, after navigation.
  await page.getByRole('link', { name: /Aurora ANC Headphones/ }).click();
  await expect(page).toHaveURL(/\/products\/aurora-anc-headphones$/);

  await page.getByTestId('add-to-cart').click();
  const drawer = page.getByTestId('cart-drawer');
  await expect(drawer).toBeVisible();
  // $199.00 is over the free-shipping threshold, so the total is the price alone.
  await expect(page.getByTestId('cart-total')).toHaveText('$199.00');

  await drawer.getByRole('link', { name: 'Checkout' }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  const form = page.getByTestId('checkout-form');
  await form.getByLabel('Full name').fill('Ada Lovelace');
  await form.getByLabel('Email').fill('ada@example.com');
  await form.getByLabel('Shipping address').fill('12 Analytical Way, London');
  await form.getByRole('button', { name: /Place order/ }).click();

  await expect(page.getByTestId('order-success')).toBeVisible();
  await expect(page.getByTestId('order-success')).toContainText('Thank you, Ada.');
});
