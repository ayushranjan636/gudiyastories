import Image from "next/image";
import type { InUse } from "@/content/gallery";

/** Short videos and photos of a book being used. Videos load only when played. */
export function InUseStrip({ items, title }: { items: InUse[]; title: string }) {
  return (
    <section aria-labelledby="in-use-title" className="content-grid py-16">
      <h2 id="in-use-title" className="text-h3">
        See it in use
      </h2>
      <ul className="mt-8 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <li key={m.src}>
            <figure>
              <div className="overflow-hidden rounded-2xl bg-paper-deep">
                {m.kind === "video" ? (
                  <video
                    controls
                    playsInline
                    preload="none"
                    poster={m.poster}
                    width={m.width}
                    height={m.height}
                    aria-label={`${title}: ${m.caption}`}
                    className="block h-auto max-h-[34rem] w-full bg-ink object-contain"
                  >
                    <source src={m.src} type="video/mp4" />
                  </video>
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
