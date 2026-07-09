import { formatPrice } from "./formatPrice";

// Quantity-weighted sum of cart items' snapshot prices, kept separate per
// currency (a cart can mix AUD and unconverted USD/JPY rows — adding those
// together would be meaningless): "A$12.34 + U$5.00". Card prices only;
// per-item postage is informational and quoted too inconsistently to sum.
export function formatCartTotal(items) {
  const byCurrency = new Map();
  for (const item of items) {
    byCurrency.set(item.currency, (byCurrency.get(item.currency) || 0) + item.price * item.quantity);
  }
  return [...byCurrency.entries()]
    .map(([currency, amount]) => formatPrice(amount, currency))
    .join(" + ");
}
