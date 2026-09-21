import { useEffect, useRef } from "react";
import { createHeroSkyFlight, POSES } from "@/lib/hero-sky-flight";

const ASSET = "?v=fh147";

/**
 * Vector Filter Hero flying receded through the homepage sky.
 * Choreography lives in `@/lib/hero-sky-flight`.
 */
export default function HeroSkyFlight() {
  const layerRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    for (const pose of Object.values(POSES)) {
      const img = new Image();
      img.src = `${pose.src}${ASSET}`;
    }

    const layer = layerRef.current;
    const rig = rigRef.current;
    if (!layer || !rig) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      layer.dataset.mode = "still";
      return;
    }

    return createHeroSkyFlight(layer, rig);
  }, []);

  return (
    <div className="hero-sky-flight" ref={layerRef} aria-hidden>
      <div className="hero-sky-rig" ref={rigRef}>
        <img
          className="hero-sky-flyer"
          src={`${POSES.cruise.src}${ASSET}`}
          alt=""
          width={POSES.cruise.w}
          height={POSES.cruise.h}
          decoding="async"
          draggable={false}
        />
        <img
          className="hero-sky-flyer"
          src={`${POSES.stroke.src}${ASSET}`}
          alt=""
          width={POSES.stroke.w}
          height={POSES.stroke.h}
          decoding="async"
          draggable={false}
        />
      </div>
    </div>
  );
}
