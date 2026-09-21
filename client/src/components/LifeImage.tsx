import { cn } from "@/lib/utils";
import type { LifePhoto } from "@/data/life-photos";

export default function LifeImage({
  photo,
  className,
  imgClassName,
  sizes = "(max-width: 768px) 100vw, 40vw",
  priority = false,
}: {
  photo: LifePhoto;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("life-frame overflow-hidden bg-muted", className)}>
      <img
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        sizes={sizes}
        className={cn("h-full w-full object-cover", imgClassName)}
        style={photo.position ? { objectPosition: photo.position } : undefined}
      />
    </div>
  );
}
