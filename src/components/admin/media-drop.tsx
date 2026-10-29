"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Film, ImagePlus, Link2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";
import { isVideoUrl, uploadMedia, youtubeId } from "./upload-client";

export type Media = { kind: "IMAGE" | "VIDEO" | "YOUTUBE"; url: string } | null;

type Props = {
  value: Media;
  onChange: (m: Media) => void;
  folder: string;
  /** What can be dropped here. */
  accept?: "image" | "video" | "media";
  allowYoutube?: boolean;
  label?: string;
  hint?: string;
  className?: string;
};

export function mediaFromUrl(url: string | null | undefined, kind?: string | null): Media {
  if (!url) return null;
  if (kind === "YOUTUBE" || youtubeId(url)) return { kind: "YOUTUBE", url };
  if (kind === "VIDEO" || isVideoUrl(url)) return { kind: "VIDEO", url };
  return { kind: "IMAGE", url };
}

/** Drag a picture or video in (or click to choose). Shows a preview and upload progress. */
export function MediaDrop({ value, onChange, folder, accept = "image", allowYoutube = false, label, hint, className }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");

  const mime = accept === "image" ? "image/*" : accept === "video" ? "video/mp4,video/webm,video/quicktime" : "image/*,video/mp4,video/webm,video/quicktime";
  const what = accept === "image" ? "an image" : accept === "video" ? "a video" : "an image or a video";

  async function take(file: File | undefined) {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const r = await uploadMedia(file, folder, { only: accept, onProgress: setProgress });
      onChange({ kind: r.type.startsWith("video/") ? "VIDEO" : "IMAGE", url: r.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  function applyLink() {
    const vid = youtubeId(link);
    if (!vid) return setError("That doesn't look like a YouTube link.");
    setError(null);
    onChange({ kind: "YOUTUBE", url: `https://www.youtube.com/watch?v=${vid}` });
    setLink("");
    setLinkOpen(false);
  }

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-small font-medium">
          {label}
        </label>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed transition-colors",
          over ? "border-leaf bg-leaf/5" : value ? "border-transparent" : "border-line bg-paper/60 hover:border-ink/30",
        )}
      >
        {value ? (
          <div className="relative bg-ink/5">
            {value.kind === "IMAGE" ? (
              <Image src={value.url} alt="" width={800} height={500} sizes="400px" className="max-h-72 w-full object-contain" />
            ) : value.kind === "VIDEO" ? (
              <video src={value.url} controls playsInline preload="metadata" className="max-h-72 w-full bg-black" />
            ) : (
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId(value.url)}`}
                  title="YouTube preview"
                  allowFullScreen
                  className="size-full"
                />
              </div>
            )}
            {over ? <div className="absolute inset-0 grid place-items-center bg-leaf/20 text-small font-medium">Drop to replace</div> : null}
          </div>
        ) : (
          <button
            type="button"
            id={id}
            onClick={() => input.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 px-6 py-10 text-center"
          >
            {accept === "video" ? (
              <Film className="size-7 text-ink-soft" strokeWidth={1.4} aria-hidden="true" />
            ) : accept === "media" ? (
              <UploadCloud className="size-7 text-ink-soft" strokeWidth={1.4} aria-hidden="true" />
            ) : (
              <ImagePlus className="size-7 text-ink-soft" strokeWidth={1.4} aria-hidden="true" />
            )}
            <span className="font-medium">Drop {what} here</span>
            <span className="text-small text-ink-soft">or click to choose{hint ? `. ${hint}` : ""}</span>
          </button>
        )}

        {progress != null ? (
          <div className="absolute inset-x-0 bottom-0 bg-white/90 px-4 py-2">
            <div className="flex justify-between text-[0.75rem] text-ink-soft">
              <span>Uploading…</span>
              <span className="tabular-nums">{Math.round(progress * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-leaf transition-[width] duration-200" style={{ width: `${Math.max(3, progress * 100)}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      <input
        ref={input}
        type="file"
        accept={mime}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          void take(f);
        }}
      />

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
        {value ? (
          <>
            <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1 text-ink-soft hover:text-ink">
              <RefreshCw className="size-3.5" strokeWidth={1.6} aria-hidden="true" /> Replace
            </button>
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-clay hover:underline">
              <Trash2 className="size-3.5" strokeWidth={1.6} aria-hidden="true" /> Remove
            </button>
          </>
        ) : null}
        {allowYoutube ? (
          <button type="button" onClick={() => setLinkOpen((o) => !o)} className="inline-flex items-center gap-1 text-ink-soft hover:text-ink">
            <Link2 className="size-3.5" strokeWidth={1.6} aria-hidden="true" /> {value?.kind === "YOUTUBE" ? "Change YouTube link" : "Use a YouTube link instead"}
          </button>
        ) : null}
      </div>
      {linkOpen ? (
        <div className="mt-2 flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyLink())}
            placeholder="https://youtu.be/…"
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-small"
          />
          <button type="button" onClick={applyLink} className="h-10 rounded-lg bg-ink px-4 text-small text-paper">
            Use
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-small text-clay" role="alert">{error}</p> : null}
    </div>
  );
}
