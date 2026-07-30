import { formatDateTime, formatDate } from "../formatDate";

const SHIPPING_TYPE_LABELS = { FIXED: "Fixed", CALCULATED: "Calculated" };

// Content for the store-badge Tooltip on eBay results — everything here is
// eBay-specific marketplace-listing info (seller, postage type, delivery
// estimate) that other stores don't have an equivalent of.
export default function EbayListingTooltipContent({ result }) {
  const {
    store_name,
    listed_at,
    seller_username,
    seller_feedback_score,
    seller_feedback_percentage,
    shipping_type,
    delivery_by,
  } = result;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-semibold">{store_name}</div>
      {listed_at && <div>Listed {formatDateTime(listed_at)}</div>}
      {seller_username && (
        <div>
          Seller: {seller_username}
          {seller_feedback_score != null &&
            ` (${seller_feedback_score}${
              seller_feedback_percentage != null ? `, ${seller_feedback_percentage}% positive` : ""
            })`}
        </div>
      )}
      {shipping_type && <div>Postage: {SHIPPING_TYPE_LABELS[shipping_type] || shipping_type}</div>}
      {delivery_by && <div>Delivery by {formatDate(delivery_by)}</div>}
    </div>
  );
}
