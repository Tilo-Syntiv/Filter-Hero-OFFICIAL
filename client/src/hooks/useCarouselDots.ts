import * as React from "react";
import type { CarouselApi } from "@/components/ui/carousel";

/** Tracks Embla selected index + scroll snaps for dot pagination. */
export function useCarouselDots(api: CarouselApi | undefined) {
  const [selected, setSelected] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    const sync = () => {
      setSelected(api.selectedScrollSnap());
      setCount(api.scrollSnapList().length);
    };
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  const scrollTo = React.useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api],
  );

  return { selected, count, scrollTo };
}
