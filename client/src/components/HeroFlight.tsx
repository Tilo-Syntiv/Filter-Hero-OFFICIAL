import { useEffect, useRef } from "react";
import { createHeroFlight, FLIGHT_ASSETS } from "@/lib/hero-flight";

const ASSET = "?v=fh141";

/**
 * The character flying around the hero. All of the choreography lives in
 * `@/lib/hero-flight`; this is just the mount point.
 *
 * Respects prefers-reduced-motion by parking a single still instead of
 * starting the animation loop at all.
 */
export default function HeroFlight() {
  const layerRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const sprite = spriteRef.current;
    const trail = trailRef.current;
    if (!layer || !sprite || !trail) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      layer.dataset.mode = "still";
      return;
    }

    // warm the sprites so the first pose swap doesn't flash
    for (const src of FLIGHT_ASSETS) {
      const img = new Image();
      img.decoding = "async";
      img.src = `${src}${ASSET}`;
    }

    return createHeroFlight(layer, sprite, trail, ASSET);
  }, []);

  return (
    <div className="hero-flight" ref={layerRef} aria-hidden>
      <div className="hero-flight-trail" ref={trailRef} />
      <div className="hero-flight-sprite" ref={spriteRef} />
    </div>
  );
}
