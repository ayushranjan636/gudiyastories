"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { btn, Card, inputCls, labelCls } from "@/components/admin/ui";
import { RichEditor } from "@/components/admin/rich-editor";
import { deletePost, restoreRevision, savePost } from "../actions";
import { uploadMedia } from "@/components/admin/upload-client";
import { MediaDrop, mediaFromUrl } from "@/components/admin/media-drop";

type Init = {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string;
  coverImageAlt: string;
  coverVideoUrl: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  publishAt: string;
  category: string;
  tags: string[];
  relatedProductIds: string[];
  seoTitle: string;
  seoDescription: string;
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function NoteEditor({
  id,
  initial,
  products,
  categories,
  previewUrl,
  revisions,
  canDelete,
  canUpload,
}: {
  id: string | null;
  initial: Init;
  products: { id: string; slug: string; title: string }[];
  categories: string[];
  previewUrl: string | null;
  revisions: { id: string; at: string; by: string }[];
  canDelete: boolean;
  canUpload: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [content, setContent] = useState<{ html: string; json: unknown; text: string }>({ html: initial.contentHtml, json: null, text: initial.contentHtml.replace(/<[^>]+>/g, " ") });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Init>(k: K, val: Init[K]) => setV((p) => ({ ...p, [k]: val }));
  const upload = canUpload ? async (f: File, onProgress?: (p: number) => void) => (await uploadMedia(f, "blog", { only: "media", onProgress })).url : undefined;

  function save(status = v.status) {
    setMsg(null);
    start(async () => {
      const r = await savePost(id, {
        ...v,
        status,
        contentHtml: content.html,
        // Plain JSON only: editor objects can carry references that cannot cross to the server.
        content: content.json ? (JSON.parse(JSON.stringify(content.json)) as unknown) : undefined,
        text: content.text,
        publishAt: v.publishAt ? new Date(`${v.publishAt}:00+05:30`).toISOString() : undefined,
      });
      setErrors(r.ok ? {} : (r.fieldErrors ?? {}));
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        set("status", status);
        if (!id && r.id) router.replace(`/admin/blog/${r.id}`);
        else router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <textarea
          aria-label="Title"
          placeholder="Title"
          rows={2}
          value={v.title}
          onChange={(e) => {
            const t = e.target.value;
            setV((p) => ({ ...p, title: t, slug: !id && (p.slug === "" || p.slug === slugify(p.title)) ? slugify(t) : p.slug }));
          }}
          className="w-full resize-none bg-transparent font-display text-h3 leading-tight placeholder:text-ink-soft/50 focus:outline-none"
        />
        {errors.title ? <p className="text-small text-clay">{errors.title}</p> : null}
        <textarea
          aria-label="Summary"
          placeholder="One or two sentences that sum it up. Shown on the blog page and in search results."
          rows={2}
          value={v.excerpt}
          onChange={(e) => set("excerpt", e.target.value)}
          className="w-full resize-none bg-transparent text-lead text-ink-soft placeholder:text-ink-soft/50 focus:outline-none"
        />
        {errors.excerpt ? <p className="text-small text-clay">{errors.excerpt}</p> : null}
        <RichEditor initialHtml={initial.contentHtml} products={products} onUpload={upload} minHeight={460} onChange={(html, json, text) => setContent({ html, json, text })} />
      </div>

      <div className="space-y-6">
        <Card title="Publish">
          <div className="space-y-3">
            <label className={labelCls}>
              Status
              <select className={inputCls} value={v.status} onChange={(e) => set("status", e.target.value as Init["status"])}>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </label>
            {v.status === "SCHEDULED" ? (
              <label className={labelCls}>
                Publish on (India time)
                <input type="datetime-local" className={inputCls} value={v.publishAt} onChange={(e) => set("publishAt", e.target.value)} />
                {errors.publishAt ? <span className="text-clay">{errors.publishAt}</span> : null}
              </label>
            ) : null}
          </div>
          {msg ? <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-small ${msg.ok ? "bg-leaf/10 text-leaf" : "bg-clay/10 text-clay"}`}>{msg.text}</p> : null}
          <div className="mt-4 grid gap-2">
            <button type="button" className={btn.primary} disabled={pending} onClick={() => save()}>{pending ? "Saving…" : "Save"}</button>
            {v.status === "DRAFT" ? (
              <button type="button" className={btn.secondary} disabled={pending} onClick={() => save("PUBLISHED")}>Publish now</button>
            ) : null}
            {previewUrl ? (
              <a href={previewUrl} target="_blank" className={btn.quiet}>
                <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden="true" /> {v.status === "PUBLISHED" ? "View" : "Preview"}
              </a>
            ) : null}
          </div>
        </Card>

        <Card title="Details">
          <div className="space-y-3">
            <label className={labelCls}>
              Address
              <input className={inputCls} value={v.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
              <span className="font-normal text-ink-soft">/blog/{v.slug || "…"}</span>
              {errors.slug ? <span className="text-clay">{errors.slug}</span> : null}
            </label>
            <label className={labelCls}>
              Category
              <input className={inputCls} list="cats" value={v.category} onChange={(e) => set("category", e.target.value)} placeholder="Reading aloud" />
              <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <label className={labelCls}>
              Tags <span className="font-normal text-ink-soft">(comma separated)</span>
              <input className={inputCls} value={v.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
            </label>
          </div>
        </Card>

        <Card title="Cover">
          <div className="space-y-4">
            <MediaDrop
              folder="blog"
              accept="media"
              allowYoutube
              hint="A picture, or a short video"
              value={v.coverVideoUrl ? mediaFromUrl(v.coverVideoUrl) : mediaFromUrl(v.coverImageUrl, "IMAGE")}
              onChange={(m) => {
                if (!m) setV((p) => ({ ...p, coverVideoUrl: "", ...(p.coverVideoUrl ? {} : { coverImageUrl: "" }) }));
                else if (m.kind === "IMAGE") setV((p) => ({ ...p, coverImageUrl: m.url, coverVideoUrl: "" }));
                else set("coverVideoUrl", m.url);
              }}
            />
            {v.coverVideoUrl ? (
              <MediaDrop
                folder="blog"
                accept="image"
                label="Still picture for the blog list (optional)"
                hint="Shown on cards; the video plays on the post"
                value={mediaFromUrl(v.coverImageUrl, "IMAGE")}
                onChange={(m) => set("coverImageUrl", m?.url ?? "")}
              />
            ) : null}
            {v.coverImageUrl || v.coverVideoUrl ? (
              <label className={labelCls}>
                Describe it in a sentence
                <input className={inputCls} value={v.coverImageAlt} onChange={(e) => set("coverImageAlt", e.target.value)} placeholder="Children on a mat with the book open" />
                {errors.coverImageAlt ? <span className="text-clay">{errors.coverImageAlt}</span> : null}
              </label>
            ) : null}
          </div>
        </Card>

        <Card title="Books at the end of the post">
          <div className="flex flex-wrap gap-2">
            {products.map((p) => {
              const on = v.relatedProductIds.includes(p.id);
              return (
                <label key={p.id} className={`cursor-pointer rounded-full border px-3 py-1 text-small ${on ? "border-ink bg-ink text-paper" : "border-line"}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => set("relatedProductIds", on ? v.relatedProductIds.filter((x) => x !== p.id) : [...v.relatedProductIds, p.id])} />
                  {p.title}
                </label>
              );
            })}
          </div>
        </Card>

        <Card title="Search engines">
          <div className="space-y-3">
            <label className={labelCls}>SEO title<input className={inputCls} value={v.seoTitle} placeholder={v.title} onChange={(e) => set("seoTitle", e.target.value)} /></label>
            <label className={labelCls}>SEO description<input className={inputCls} value={v.seoDescription} placeholder={v.excerpt} onChange={(e) => set("seoDescription", e.target.value)} /></label>
          </div>
        </Card>

        {revisions.length ? (
          <Card title="Earlier versions">
            <ul className="space-y-1.5 text-small">
              {revisions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-ink-soft">{new Date(r.at).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}{r.by ? ` · ${r.by}` : ""}</span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      start(async () => {
                        const res = await restoreRevision(id!, r.id);
                        setMsg({ ok: res.ok, text: res.message });
                        router.refresh();
                      })
                    }
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {id && canDelete ? (
          <button
            type="button"
            className={`${btn.danger} w-full`}
            onClick={() => {
              if (!window.confirm("Delete this post for good?")) return;
              start(async () => {
                await deletePost(id);
                router.replace("/admin/blog");
              });
            }}
          >
            Delete post
          </button>
        ) : null}
      </div>
    </div>
  );
}
