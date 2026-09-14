"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type AdvertisementItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
};

type AdvertisementCarouselProps = {
  advertisements: AdvertisementItem[];
};

function getAdvertisementImageUrl(imageUrl: string) {
  const path = imageUrl
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/files/${path}`;
}

export function AdvertisementCarousel({
  advertisements,
}: AdvertisementCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const items = useMemo(() => advertisements, [advertisements]);

  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((current) => (current + 1) % items.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [items.length]);

  useEffect(() => {
    if (currentIndex >= items.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, items.length]);

  if (items.length === 0) {
    return null;
  }

  function goToPrevious() {
    setCurrentIndex(
      (current) => (current - 1 + items.length) % items.length
    );
  }

  function goToNext() {
    setCurrentIndex((current) => (current + 1) % items.length);
  }

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {items.map((ad) => {
            const imageUrl = ad.imageUrl
              ? getAdvertisementImageUrl(ad.imageUrl)
              : null;

            const content = (
              <Card className="overflow-hidden border-0 shadow-md">
                {imageUrl && (
                  <div
                    className="h-44 w-full bg-cover bg-center sm:h-52 md:h-64"
                    style={{
                      backgroundImage: `url("${imageUrl}")`,
                    }}
                    aria-label={ad.title}
                  />
                )}

                <CardContent className={imageUrl ? "pt-4" : "pt-5"}>
                  <h2 className="font-semibold">{ad.title}</h2>

                  {ad.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {ad.description}
                    </p>
                  )}

                  {ad.targetUrl && (
                    <p className="mt-2 text-sm font-medium text-primary">
                      Lihat selengkapnya →
                    </p>
                  )}
                </CardContent>
              </Card>
            );

            return (
              <div key={ad.id} className="min-w-full">
                {ad.targetUrl ? (
                  <a
                    href={ad.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {content}
                  </a>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Iklan sebelumnya"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md transition hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Iklan berikutnya"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md transition hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="mt-3 flex justify-center gap-2">
            {items.map((ad, index) => (
              <button
                key={ad.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={`Tampilkan iklan ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}