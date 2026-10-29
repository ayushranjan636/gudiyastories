"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import { btn, Card, inputCls, labelCls } from "@/components/admin/ui";
import { RichEditor } from "@/components/admin/rich-editor";
import { MediaDrop, mediaFromUrl } from "@/components/admin/media-drop";
import { uploadMedia } from "@/components/admin/upload-client";
import { ClassCard } from "@/components/site/class-card";
import { cn } from "@/lib/cn";
import { deleteClass, saveClass } from "../actions";

type Init = {
  title: string;
  slug: string;
  summary: string;
  aboutHtml: string;
  topics: string[];
  audience: string;
  mode: string;
  schedule: string;
  startDate: string;
  duration: string;
  priceRupees: string;
  priceNote: string;
  enquiryUrl: string;
  mediaKind: "IMAGE" | "VIDEO" | "YOUTUBE" | null;
  mediaUrl: string;
  posterUrl: string;
  mediaAlt: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  isPopup: boolean;
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ClassForm({ id, initial, canDelete, popupElsewhere }: { id: string | null; initial: Init; canDelete: boolean; popupElsewhere: string | null }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [about, setAbout] = useState<{ html: string; json: unknown }>({ html: initial.aboutHtml, json: null });
  const [topic, setTopic] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Init>(k: K, val: Init[K]) => setV((p) => ({ ...p, [k]: val }));
  const err = (k: string) => (errors[k] ? <span className="font-normal text-clay">{errors[k]}</span> : null);

  function save(status = v.status) {
    setMsg(null);
    const isPopup = status === "PUBLISHED" ? v.isPopup : false;
    start(async () => {
      const r = await saveClass(id, { ...v, status, isPopup, aboutHtml: about.html, about: about.json ? (JSON.parse(JSON.stringify(about.json)) as unknown) : undefined, mediaKind: v.mediaUrl ? v.mediaKind : null });
      setErrors(r.ok ? {} : (r.fieldErrors ?? {}));
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setV((p) => ({ ...p, status, isPopup }));
        if (!id && r.id) router.replace(`/admin/classes/${r.id}`);
        else router.refresh();
      }
    });
  }

  function addTopic() {
    const t = topic.trim();
    if (!t) return;
    set("topics", [...v.topics, t]);
    setTopic("");
  }

  const media = v.mediaUrl ? mediaFromUrl(v.mediaUrl, v.mediaKind) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="min-w-0 space-y-6 xl:col-span-2">
        <Card>
          <div className="space-y-4">
            <label className={labelCls}>
              Class name {err("title")}
              <input
                className={cn(inputCls, "font-display text-h4")}
                value={v.title}
                placeholder="Storytelling for little ones"
                onChange={(e) => {
                  const t = e.target.value;
                  setV((p) => ({ ...p, title: t, slug: !id && (p.slug === "" || p.slug === slugify(p.title)) ? slugify(t) : p.slug }));
                }}
              />
            </label>
            <label className={labelCls}>
              In a sentence or two {err("summary")}
              <textarea
                className={inputCls}
                rows={2}
                maxLength={240}
                value={v.summary}
                placeholder="Six weeks of reading aloud, puppets and drawing, for children aged 4 to 7."
                onChange={(e) => set("summary", e.target.value)}
              />
              <span className="font-normal text-ink-soft">Shown on the class card and in the pop-up. {240 - v.summary.length} characters left.</span>
            </label>
          </div>
        </Card>

        <Card title="Picture or video">
          <div className="space-y-4">
            <MediaDrop
              folder="classes"
              accept="media"
              allowYoutube
              hint="JPG or PNG, or an MP4 video up to 200 MB"
              value={media}
              onChange={(m) => setV((p) => ({ ...p, mediaUrl: m?.url ?? "", mediaKind: m?.kind ?? null }))}
            />
            {media && media.kind !== "IMAGE" ? (
              <MediaDrop
                folder="classes"
                accept="image"
                label="Cover picture for the card (optional)"
                hint="Shown before the video plays"
                value={mediaFromUrl(v.posterUrl, "IMAGE")}
                onChange={(m) => set("posterUrl", m?.url ?? "")}
              />
            ) : null}
            {media ? (
              <label className={labelCls}>
                Describe it in a sentence {err("mediaAlt")}
                <input className={inputCls} value={v.mediaAlt} onChange={(e) => set("mediaAlt", e.target.value)} placeholder="Children holding up puppets they made in class" />
              </label>
            ) : null}
          </div>
        </Card>

        <Card title="What children will learn">
          <ul className="space-y-2">
            {v.topics.map((t, i) => (
              <li key={`${t}-${i}`} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-small">
                <span className="w-6 text-ink-soft tabular-nums">{i + 1}.</span>
                <input
                  aria-label={`Topic ${i + 1}`}
                  value={t}
                  onChange={(e) => set("topics", v.topics.map((x, j) => (j === i ? e.target.value : x)))}
                  className="min-w-0 flex-1 bg-transparent focus:outline-none"
                />
                <button type="button" aria-label="Remove topic" onClick={() => set("topics", v.topics.filter((_, j) => j !== i))} className="text-ink-soft hover:text-clay">
                  <X className="size-4" strokeWidth={1.6} />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              className={cn(inputCls, "min-w-0 flex-1")}
              value={topic}
              placeholder="Add a topic, then press Enter"
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
            />
            <button type="button" className={btn.secondary} onClick={addTopic}>
              <Plus className="size-4" strokeWidth={1.6} aria-hidden="true" /> Add
            </button>
          </div>
        </Card>

        <div>
          <p className="mb-2 text-small font-medium">About the class</p>
          <RichEditor
            initialHtml={initial.aboutHtml}
            minHeight={260}
            onUpload={async (f, onProgress) => (await uploadMedia(f, "classes", { only: "media", onProgress })).url}
            onChange={(html, json) => setAbout({ html, json })}
          />
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <Card title="Publish">
          <div className="space-y-4">
            <label className={labelCls}>
              Status
              <select className={inputCls} value={v.status} onChange={(e) => set("status", e.target.value as Init["status"])}>
                <option value="DRAFT">Draft (only you can see it)</option>
                <option value="PUBLISHED">Published, taking enquiries</option>
                <option value="CLOSED">Published, enquiries closed</option>
              </select>
            </label>

            <div className={cn("rounded-lg border p-3", v.isPopup ? "border-leaf/40 bg-leaf/5" : "border-line")}>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--leaf)]"
                  checked={v.isPopup}
                  disabled={v.status !== "PUBLISHED"}
                  onChange={(e) => set("isPopup", e.target.checked)}
                />
                <span className="text-small">
                  <span className="font-medium">Show as the home-page pop-up</span>
                  <span className="block text-ink-soft">
                    {v.status !== "PUBLISHED"
                      ? "Publish the class to use it as the pop-up."
                      : popupElsewhere && v.isPopup
                        ? `This replaces "${popupElsewhere}". Only one class can be the pop-up.`
                        : popupElsewhere
                          ? `Now showing: "${popupElsewhere}". Only one class can be the pop-up.`
                          : "Only one class can be the pop-up at a time."}
                  </span>
                </span>
              </label>
              {errors.isPopup ? <p className="mt-1 text-small text-clay">{errors.isPopup}</p> : null}
            </div>

            {msg ? <p role="status" className={`rounded-lg px-3 py-2 text-small ${msg.ok ? "bg-leaf/10 text-leaf" : "bg-clay/10 text-clay"}`}>{msg.text}</p> : null}
            <div className="grid gap-2">
              <button type="button" className={btn.primary} disabled={pending} onClick={() => save()}>{pending ? "Saving…" : "Save"}</button>
              {v.status === "DRAFT" ? (
                <button type="button" className={btn.secondary} disabled={pending} onClick={() => save("PUBLISHED")}>Publish now</button>
              ) : null}
              {id && v.slug ? (
                <a href={`/classes/${v.slug}${v.status === "DRAFT" ? "?preview=1" : ""}`} target="_blank" className={btn.quiet}>
                  <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden="true" /> {v.status === "DRAFT" ? "Preview" : "View on site"}
                </a>
              ) : null}
            </div>
          </div>
        </Card>

        <Card title="Dates and format">
          <div className="space-y-3">
            <label className={labelCls}>
              Start date
              <input type="date" className={inputCls} value={v.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </label>
            <label className={labelCls}>
              Duration {err("duration")}
              <input className={inputCls} value={v.duration} placeholder="6 weeks, 12 sessions" onChange={(e) => set("duration", e.target.value)} />
            </label>
            <label className={labelCls}>
              When
              <input className={inputCls} value={v.schedule} placeholder="Saturdays and Sundays, 5 to 6 pm" onChange={(e) => set("schedule", e.target.value)} />
            </label>
            <label className={labelCls}>
              Where
              <input className={inputCls} value={v.mode} placeholder="Live on Google Meet" onChange={(e) => set("mode", e.target.value)} />
            </label>
            <label className={labelCls}>
              Who it&apos;s for
              <input className={inputCls} value={v.audience} placeholder="Ages 4 to 7" onChange={(e) => set("audience", e.target.value)} />
            </label>
          </div>
        </Card>

        <Card title="Fee">
          <div className="grid grid-cols-[8rem_1fr] gap-3">
            <label className={labelCls}>
              Price (₹) {err("priceRupees")}
              <input inputMode="decimal" className={inputCls} value={v.priceRupees} placeholder="Free" onChange={(e) => set("priceRupees", e.target.value.replace(/[^\d.]/g, ""))} />
            </label>
            <label className={labelCls}>
              Note
              <input className={inputCls} value={v.priceNote} placeholder="for all 12 sessions" onChange={(e) => set("priceNote", e.target.value)} />
            </label>
          </div>
          <p className="mt-2 text-small text-ink-soft">Leave the price empty for a free class.</p>
        </Card>

        <Card title="Enquiries">
          <label className={labelCls}>
            Google Form link {err("enquiryUrl")}
            <input type="url" className={inputCls} value={v.enquiryUrl} placeholder="https://forms.gle/…" onChange={(e) => set("enquiryUrl", e.target.value)} />
          </label>
          {v.enquiryUrl.startsWith("https://") ? (
            <a href={v.enquiryUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-small text-leaf underline underline-offset-4">
              Test the form <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            </a>
          ) : null}
          <p className="mt-2 text-small text-ink-soft">The Enquire buttons open this form in a new tab.</p>
        </Card>

        <Card title="Address">
          <label className={labelCls}>
            {err("slug")}
            <input className={inputCls} value={v.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
            <span className="font-normal text-ink-soft">/classes/{v.slug || "…"}</span>
          </label>
        </Card>

        <Card title="How the card looks">
          <div className="pointer-events-none">
            <ClassCard
              c={{
                slug: v.slug || "preview",
                title: v.title || "Class name",
                summary: v.summary || "One or two sentences about the class.",
                startDate: v.startDate ? new Date(`${v.startDate}T00:00:00Z`) : null,
                duration: v.duration || "Duration",
                pricePaise: v.priceRupees ? Math.round(Number(v.priceRupees) * 100) : null,
                priceNote: v.priceNote || null,
                audience: v.audience || null,
                mediaKind: v.mediaUrl ? v.mediaKind : null,
                mediaUrl: v.mediaUrl || null,
                posterUrl: v.posterUrl || null,
                mediaAlt: v.mediaAlt || null,
                enquiryUrl: v.enquiryUrl || "#",
                status: v.status,
              }}
            />
          </div>
        </Card>

        {id && canDelete ? (
          <button
            type="button"
            className="w-full rounded-full border border-clay/40 px-4 py-2.5 text-small text-clay hover:bg-clay/5"
            onClick={() =>
              window.confirm("Delete this class for good?") &&
              start(async () => {
                await deleteClass(id);
                router.replace("/admin/classes");
              })
            }
          >
            Delete class
          </button>
        ) : null}
      </div>
    </div>
  );
}
