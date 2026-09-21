const FILTER_KING_ORIGIN = "https://filterking.com";

export function normalizeFilterSize(size: string): string {
  return size.toLowerCase().replace(/\s/g, "");
}

/** Size hub: https://filterking.com/air-filter-sizes/{size} */
export function filterKingSizeHubUrl(size: string): string {
  return `${FILTER_KING_ORIGIN}/air-filter-sizes/${normalizeFilterSize(size)}`;
}

/**
 * MERV PDP, or odor slug for carbon.
 * Example: https://filterhero.net/sizes/20x25x1 ↔ https://filterking.com/air-filter-sizes-20x25x1-merv-8
 */
export function filterKingPdpUrl(
  size: string,
  merv: 8 | 11 | 13,
  isCarbon = false,
): string {
  const slug = normalizeFilterSize(size);
  if (isCarbon) return `${FILTER_KING_ORIGIN}/air-filter-sizes-${slug}-odor`;
  return `${FILTER_KING_ORIGIN}/air-filter-sizes-${slug}-merv-${merv}`;
}
