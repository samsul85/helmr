#!/usr/bin/env node

import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error('Set STRIPE_SECRET_KEY before running this script.');
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const existingMonthly = process.env.STRIPE_PRICE_MONTHLY;
const existingYearly = process.env.STRIPE_PRICE_YEARLY;
if (existingMonthly && existingYearly) {
  console.log('Stripe prices already configured:');
  console.log(`STRIPE_PRICE_MONTHLY=${existingMonthly}`);
  console.log(`STRIPE_PRICE_YEARLY=${existingYearly}`);
  process.exit(0);
}

const product = await stripe.products.create({
  name: 'Helmr Pro',
  description: 'Unlimited events on Helmr',
});

const monthly = await stripe.prices.create({
  product: product.id,
  unit_amount: 700,
  currency: 'cad',
  recurring: { interval: 'month' },
  nickname: 'Helmr Pro Monthly',
});

const yearly = await stripe.prices.create({
  product: product.id,
  unit_amount: 6000,
  currency: 'cad',
  recurring: { interval: 'year' },
  nickname: 'Helmr Pro Yearly',
});

console.log('Created Helmr Pro product and prices in Stripe test mode:');
console.log(`Product ID: ${product.id}`);
console.log('');
console.log('Add these to your environment variables:');
console.log(`STRIPE_PRICE_MONTHLY=${monthly.id}`);
console.log(`STRIPE_PRICE_YEARLY=${yearly.id}`);
