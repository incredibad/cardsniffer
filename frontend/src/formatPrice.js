// Intl's en-US locale renders USD as a bare "$" (it's that locale's own
// currency) while every other currency gets a disambiguating prefix (AUD ->
// "A$", JPY -> "¥", ...). In an AU-focused app showing "Original" (i.e.
// unconverted) prices, a bare "$" reads as AUD by default — so USD gets the
// same explicit treatment here instead of being the one silent exception.
export function formatPrice(price, currency) {
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
  return currency === "USD" ? formatted.replace("$", "U$") : formatted;
}
