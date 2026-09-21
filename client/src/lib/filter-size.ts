import { getFilterSize } from "@shared/products";

export function parseSizeSlug(raw: string) {
  const parts = raw.trim().toLowerCase().replace(/\s/g, "").split("x");
  if (parts.length !== 3) return null;
  const [width, length, depth] = parts;
  if (
    !width ||
    !length ||
    !depth ||
    ![width, length, depth].every((part) => Number.isFinite(Number(part)) && Number(part) > 0)
  ) {
    return null;
  }
  return { width, length, depth };
}

export function customQuotePath(size?: string) {
  const parsed = size ? parseSizeSlug(size) : null;
  const query = parsed ? `?size=${encodeURIComponent(`${parsed.width}x${parsed.length}x${parsed.depth}`)}` : "";
  return `/custom-air-filters${query}`;
}

/** Shop the PDP when the size is in the live catalog; otherwise open a custom quote. */
export function shopOrQuotePath(size: string) {
  return getFilterSize(size)
    ? `/sizes/${encodeURIComponent(size)}`
    : customQuotePath(size);
}
