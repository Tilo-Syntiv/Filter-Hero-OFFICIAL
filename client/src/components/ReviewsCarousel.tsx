import { useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import CarouselDots from "@/components/CarouselDots";
import { useCarouselDots } from "@/hooks/useCarouselDots";

const REVIEWS = [
  {
    name: "Sarah M.",
    location: "Austin, TX",
    text: "Perfect fit and arrived fast. The size finder made ordering effortless.",
  },
  {
    name: "James T.",
    location: "Denver, CO",
    text: "Clear answers when I needed a custom depth — felt like real experts.",
  },
  {
    name: "Maria L.",
    location: "Chicago, IL",
    text: "Solid quality filters at a fair price. Already set up our next order.",
  },
  {
    name: "Chris P.",
    location: "Seattle, WA",
    text: "Switched from big-box filters — Filter Hero matched our odd size in minutes.",
  },
  {
    name: "Aisha R.",
    location: "Atlanta, GA",
    text: "Bulk packs saved us money and the MERV 13 made a noticeable difference.",
  },
  {
    name: "Noah K.",
    location: "Phoenix, AZ",
    text: "Checkout was smooth and shipping was quicker than expected. Will reorder.",
  },
];

export default function ReviewsCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const { selected, count, scrollTo } = useCarouselDots(api);

  return (
    <div className="mt-20 pt-16 border-t border-border/80">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-10">
        <div>
          <span className="section-label">From the field</span>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight">
            What customers say
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Real feedback from homeowners who found their exact size
          </p>
        </div>
      </div>

      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: true }}
        plugins={[
          Autoplay({
            delay: 4500,
            stopOnInteraction: true,
            stopOnMouseEnter: true,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {REVIEWS.map((review) => (
            <CarouselItem
              key={review.name}
              className="pl-4 basis-[90%] sm:basis-1/2 lg:basis-1/3"
            >
              <blockquote className="h-full surface-panel rounded-2xl p-6 md:p-7 flex flex-col">
                <div
                  className="flex gap-0.5 mb-4 text-hero text-sm tracking-wide"
                  aria-label="5 stars"
                >
                  ★★★★★
                </div>
                <p className="text-base text-foreground leading-relaxed mb-6 flex-1">
                  “{review.text}”
                </p>
                <footer>
                  <p className="text-sm font-semibold text-foreground">
                    {review.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {review.location}
                  </p>
                </footer>
              </blockquote>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-3 bg-white border-border shadow-sm" />
        <CarouselNext className="hidden md:flex -right-3 bg-white border-border shadow-sm" />
      </Carousel>

      <CarouselDots
        count={count}
        selected={selected}
        onSelect={scrollTo}
        className="mt-8"
      />
    </div>
  );
}
