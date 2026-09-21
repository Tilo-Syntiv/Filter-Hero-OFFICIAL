import { useState } from "react";
import { brandLogoSrc } from "@shared/hvac-brands";

export default function BrandLogo({
  slug,
  name,
  className = "h-10 w-full max-w-[8.5rem]",
  loading = "eager",
}: {
  slug: string;
  name: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <img
      src={brandLogoSrc(slug)}
      alt={`${name} logo`}
      className={`object-contain object-center ${className}`}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
