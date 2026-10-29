import Image from "next/image";
import { Play } from "lucide-react";
import { cn } from "@/lib/cn";

export type MediaKind = "IMAGE" | "VIDEO" | "YOUTUBE";

export const youtubeIdOf = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1] ?? null;

export function kindOf(url: string, kind?: string | null): MediaKind {
  if (kind === "YOUTUBE" || kind === "VIDEO" || kind === "IMAGE") return kind;
  if (youtubeIdOf(url)) return "YOUTUBE";
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) ? "VIDEO" : "IMAGE";
}

type Props = {
  url: string;
  kind?: string | null;
  poster?: string | null;
  alt: string;
  /** "player": plays here (pages). "thumb": still picture with a play mark (cards, lists). */
  variant?: "player" | "thumb";
  sizes?: string;
  priority?: boolean;
  className?: string;
};

/** One picture, uploaded video or YouTube video, shown the same way everywhere on the site. */
export function MediaView({ url, kind, poster, alt, variant = "player", sizes = "100vw", priority, className }: Props) {
  const k = kindOf(url, kind);
  const box = cn("relative overflow-hidden bg-paper-deep", className);

  if (k === "IMAGE") {
    return (
      <div className={box}>
        <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }

  if (variant === "thumb") {
    const still = poster || (k === "YOUTUBE" ? `https://i.ytimg.com/vi/${youtubeIdOf(url)}/hqdefault.jpg` : null);
    return (
      <div className={box}>
        {still ? (
          <Image src={still} alt={alt} fill sizes={sizes} className="object-cover" />
        ) : (
          // First frame of the video as the still.
          <video src={`${url}#t=0.1`} muted playsInline preload="metadata" aria-label={alt} className="absolute inset-0 size-full object-cover" />
        )}
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-paper/90 text-ink shadow-[0_8px_20px_-8px_rgb(27_26_23/0.5)]">
            <Play className="ml-0.5 size-6" strokeWidth={1.6} fill="currentColor" />
          </span>
        </span>
      </div>
    );
  }

  if (k === "YOUTUBE") {
    return (
      <div className={box}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeIdOf(url)}?rel=0`}
          title={alt}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      </div>
    );
  }

  return (
    <div className={cn(box, "bg-black")}>
      <video src={url} poster={poster ?? undefined} controls playsInline preload="metadata" aria-label={alt} className="absolute inset-0 size-full object-contain" />
    </div>
  );
}
