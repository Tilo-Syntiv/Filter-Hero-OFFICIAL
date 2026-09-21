import { useEffect, useState } from "react";

/** Same file the header lockup uses. Bump when `public/logo.png` changes. */
export const LOGO_SRC = "/logo.png?v=fh245";

let knockoutCache: string | null = null;
let knockoutPromise: Promise<string> | null = null;

function knockOutWhite(src: string): Promise<string> {
  if (knockoutCache) return Promise.resolve(knockoutCache);
  if (knockoutPromise) return knockoutPromise;

  knockoutPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (r > 242 && g > 242 && b > 242) {
          pixels[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      knockoutCache = canvas.toDataURL("image/png");
      resolve(knockoutCache);
    };
    img.onerror = () => reject(new Error("Logo failed to load"));
    img.src = src;
  });

  return knockoutPromise;
}

/** White plate → transparent so the flying mark sits on navy, matching the header. */
export function useKnockoutLogo(src: string = LOGO_SRC) {
  const [url, setUrl] = useState<string | null>(knockoutCache);

  useEffect(() => {
    let cancelled = false;
    knockOutWhite(src)
      .then((next) => {
        if (!cancelled) setUrl(next);
      })
      .catch(() => {
        if (!cancelled) setUrl(src);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return url ?? src;
}
