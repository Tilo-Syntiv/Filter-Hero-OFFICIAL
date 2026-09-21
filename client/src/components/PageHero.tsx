import type { ReactNode } from "react";
import { Link } from "wouter";
import LifeImage from "@/components/LifeImage";
import type { LifePhoto } from "@/data/life-photos";

type Crumb = { href: string; label: string };

export default function PageHero({
  label,
  title,
  children,
  crumbs,
  actions,
  mark,
  photo,
}: {
  label: string;
  title: string;
  children?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  mark?: ReactNode;
  photo?: LifePhoto;
}) {
  return (
    <section className="brand-band page-hero">
      <div className="page-hero-glow" aria-hidden />
      <div className="container relative py-10 md:py-16">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-white/55">
            {crumbs.map((crumb, i) => (
              <span key={`${crumb.href}-${crumb.label}`}>
                {i > 0 && " / "}
                <Link href={crumb.href} className="hover:text-white">
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {mark}
            <div className="min-w-0">
              <span className="section-label">{label}</span>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                {title}
              </h1>
              {children ? (
                <div className="seo-answer mt-3 max-w-2xl text-base leading-relaxed text-white/70">
                  {children}
                </div>
              ) : null}
            </div>
          </div>
          {photo ? (
            <LifeImage
              photo={photo}
              className="life-hero-photo hidden sm:block"
              sizes="220px"
            />
          ) : null}
        </div>
        {actions ? <div className="mt-8">{actions}</div> : null}
      </div>
    </section>
  );
}
