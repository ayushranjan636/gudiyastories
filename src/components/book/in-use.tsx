import Image from "next/image";
import type { InUse } from "@/content/gallery";
import { LazyVideo } from "@/components/ui/lazy-video";

/** Short videos and photos of a book being used. Videos load only when they come near the screen. */
export function InUseStrip({ items, title, heading = "See it in use" }: { items: InUse[]; title: string; heading?: string }) {
  return (
    <section aria-labelledby="in-use-title" className="content-grid py-16">
      <h2 id="in-use-title" className="text-h3">
        {heading}
      </h2>
      <ul className="mt-8 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <li key={m.src}>
            <figure>
              <div className="overflow-hidden rounded-2xl bg-paper-deep">
                {m.kind === "video" ? (
                  <LazyVideo
                    src={m.src}
                    poster={m.poster}
                    width={m.width}
                    height={m.height}
                    ambient={m.ambient}
                    label={`${title}: ${m.caption}`}
                    className="max-h-[34rem] w-full"
                  />
                ) : (
                  <Image src={m.src} alt={m.alt} width={m.width} height={m.height} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="h-auto max-h-[34rem] w-full object-cover" />
                )}
              </div>
              <figcaption className="mt-3 text-small text-ink-soft">{m.caption}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
