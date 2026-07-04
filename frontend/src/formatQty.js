// A result only ever reaches the UI when in_stock is true, so "1+" is a
// truthful floor when a store doesn't expose (or we don't trust) an exact
// count — never render blank/nothing, since the item is confirmed available.
export function formatQty(quantity) {
  return quantity != null ? String(quantity) : "1+";
}
