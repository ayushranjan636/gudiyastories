"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Trash2, Upload } from "lucide-react";
import { btn, Card, inputCls, labelCls } from "@/components/admin/ui";
import { RichEditor } from "@/components/admin/rich-editor";
import { checkWriting } from "@/lib/writing-rules";
import { saveProduct } from "../actions";
import { uploadMedia } from "@/components/admin/upload-client";

type Img = { url: string; alt: string; width: number | null; height: number | null };
export type ProductFormValues = {
  title: string;
  slug: string;
  sku: string;
  type: "STORY" | "COLOURING" | "BUNDLE";
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured: boolean;
  sortOrder: number;
  shortDescription: string;
  longDescriptionHtml: string;
  ageMin: number | null;
  ageMax: number | null;
  pages: number | null;
  binding: string | null;
  paper: string | null;
  isbn: string | null;
  publishedOn: string | null;
  priceRupees: number;
  mrpRupees: number;
  costRupees: number | null;
  weightGrams: number | null;
  hsnCode: string | null;
  amazonUrl: string | null;
  flipkartUrl: string | null;
  goodFor: string[];
  spineColor: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  lowStockThreshold: number;
  values: string[];
  images: Img[];
  spreads: Img[];
  components: { productId: string; quantity: number }[];
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

function Field({ label, error, children, hint, className }: { label: string; error?: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`${labelCls} ${className ?? ""}`}>
      {label}
      {children}
      {hint ? <span className="font-normal text-ink-soft">{hint}</span> : null}
      {error ? <span className="font-medium text-clay">{error}</span> : null}
    </label>
  );
}

async function measure(url: string): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const im = new window.Image();
    im.onload = () => resolve({ width: im.naturalWidth, height: im.naturalHeight });
    im.onerror = () => resolve({ width: null, height: null });
    im.src = url;
  });
}

function ImageList({ label, items, onChange, canUpload, folder, error }: { label: string; items: Img[]; onChange: (v: Img[]) => void; canUpload: boolean; folder: string; error?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const move = (i: number, d: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    onChange(next);
  };
  const [over, setOver] = useState(false);
  async function addFiles(files: File[]) {
    setBusy(true);
    setMsg(null);
    const added: Img[] = [];
    for (const f of files) {
      try {
        const r = await uploadMedia(f, folder, { only: "image" });
        added.push({ url: r.url, alt: "", ...(await measure(r.url)) });
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Upload failed.");
      }
    }
    onChange([...items, ...added]);
    setBusy(false);
  }
  return (
    <div
      onDragOver={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        setOver(false);
        void addFiles([...e.dataTransfer.files]);
      }}
      className={`rounded-xl transition-colors ${over ? "bg-leaf/5 outline-2 outline-dashed outline-leaf outline-offset-4" : ""}`}
    >
      <p className="text-small font-medium">{label}</p>
      <ul className="mt-2 space-y-2">
        {items.map((im, i) => (
          <li key={`${im.url}-${i}`} className="flex items-center gap-3 rounded-lg border border-line bg-white p-2">
            {im.url.startsWith("/") || im.url.startsWith("http") ? (
              <Image src={im.url} alt="" width={im.width ?? 80} height={im.height ?? 100} className="h-16 w-auto rounded" unoptimized />
            ) : null}
            <input
              aria-label="Image description"
              placeholder="Describe the image (required)"
              value={im.alt}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
              className={`${inputCls} ${!im.alt ? "border-clay/60" : ""}`}
            />
            <button type="button" className={btn.quiet} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="size-4" /></button>
            <button type="button" className={btn.quiet} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="size-4" /></button>
            <button type="button" className={btn.quiet} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {canUpload ? (
          <label className={`${btn.secondary} cursor-pointer ${busy ? "opacity-50" : ""}`}>
            <Upload className="size-4" strokeWidth={1.5} aria-hidden="true" /> {busy ? "Uploading…" : "Upload or drop images"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={async (e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                setBusy(true);
                setMsg(null);
                await addFiles(files);
              }}
            />
          </label>
        ) : null}
        <button
          type="button"
          className={btn.quiet}
          onClick={async () => {
            const url = window.prompt("Image address (for example /books/new-cover.webp or https://…)");
            if (url) onChange([...items, { url, alt: "", ...(await measure(url)) }]);
          }}
        >
          Add by address
        </button>
        {!canUpload ? <span className="text-small text-ink-soft">Paste an image address instead.</span> : null}
      </div>
      {msg ? <p className="mt-1 text-small text-clay">{msg}</p> : null}
      {error ? <p className="mt-1 text-small font-medium text-clay">{error}</p> : null}
    </div>
  );
}

export function ProductForm({
  id,
  initial,
  values,
  books,
  canUpload,
  publicUrl,
}: {
  id: string | null;
  initial: ProductFormValues;
  values: { slug: string; name: string }[];
  books: { id: string; title: string; priceRupees: number; mrpRupees: number }[];
  canUpload: boolean;
  publicUrl: string | null;
}) {
  const router = useRouter();
  const [v, setV] = useState<ProductFormValues>(initial);
  const [longJson, setLongJson] = useState<unknown>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const num = (s: string) => (s === "" ? null : Number(s));

  const isBundle = v.type === "BUNDLE";
  const sumSingles = v.components.reduce((n, c) => n + (books.find((b) => b.id === c.productId)?.priceRupees ?? 0) * c.quantity, 0);
  const savings = sumSingles - Number(v.priceRupees || 0);
  const issues = checkWriting(`${v.title}\n${v.shortDescription}`);
  const seoTitle = v.seoTitle || `${v.title} · Gudiya Stories`;
  const seoDesc = v.seoDescription || v.shortDescription;

  function submit() {
    setMsg(null);
    start(async () => {
      const r = await saveProduct(id, { ...v, longDescription: longJson ? (JSON.parse(JSON.stringify(longJson)) as unknown) : null, isbn: v.isbn || null, publishedOn: v.publishedOn || null });
      setErrors(r.fieldErrors ?? {});
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok && !id && r.id) router.replace(`/admin/products/${r.id}`);
      else if (r.ok) router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-6 xl:grid-cols-3"
    >
      <div className="space-y-6 xl:col-span-2">
        <Card title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" error={errors.title} className="sm:col-span-2">
              <input
                className={inputCls}
                value={v.title}
                onChange={(e) => {
                  const t = e.target.value;
                  setV((p) => ({ ...p, title: t, slug: !id && (p.slug === "" || p.slug === slugify(p.title)) ? slugify(t) : p.slug }));
                }}
              />
            </Field>
            <Field label="Address on the site" error={errors.slug} hint={`/${isBundle ? "sets" : "books"}/${v.slug || "…"}`}>
              <input className={inputCls} value={v.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
            </Field>
            <Field label="SKU" error={errors.sku}>
              <input className={inputCls} value={v.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} />
            </Field>
            <Field label="Short description" error={errors.shortDescription} className="sm:col-span-2" hint="Two sentences: what happens, and what it's about. Shown on cards and in search results.">
              <textarea rows={3} className={`${inputCls} h-auto py-2`} value={v.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </Field>
          </div>
          {issues.length ? (
            <p className="mt-3 rounded-lg bg-[#F2B91E]/15 px-3 py-2 text-small">
              Writing check: {issues.map((x) => (x.kind === "banned" ? `"${x.match}"` : x.kind === "emoji" ? "an emoji" : x.kind === "em-dash" ? "an em dash" : x.match)).join(", ")}.
            </p>
          ) : null}
        </Card>

        <Card title="What it's about (long description)">
          <RichEditor
            initialHtml={initial.longDescriptionHtml}
            minHeight={200}
            onChange={(html, json) => {
              set("longDescriptionHtml", html);
              setLongJson(json);
            }}
            onUpload={
              canUpload
                ? async (f) => {
                    return (await uploadMedia(f, "products", { only: "media" })).url;
                  }
                : undefined
            }
          />
        </Card>

        {isBundle ? (
          <Card title="Books in this set">
            <ul className="space-y-2">
              {v.components.map((c, i) => (
                <li key={i} className="grid grid-cols-[1fr_5rem_auto] items-center gap-2">
                  <select
                    className={inputCls}
                    value={c.productId}
                    onChange={(e) => set("components", v.components.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)))}
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} (₹{b.priceRupees})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    aria-label="Quantity"
                    className={inputCls}
                    value={c.quantity}
                    onChange={(e) => set("components", v.components.map((x, j) => (j === i ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x)))}
                  />
                  <button type="button" className={btn.quiet} onClick={() => set("components", v.components.filter((_, j) => j !== i))} aria-label="Remove">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className={`${btn.quiet} mt-2`} onClick={() => books[0] && set("components", [...v.components, { productId: books[0].id, quantity: 1 }])}>
              Add a book
            </button>
            {errors.components ? <p className="mt-1 text-small text-clay">{errors.components}</p> : null}
            <div className={`mt-4 rounded-lg px-3 py-2 text-small ${savings > 0 ? "bg-leaf/10" : "bg-clay/10 text-clay"}`}>
              Bought separately: ₹{sumSingles.toLocaleString("en-IN")} · Set price: ₹{Number(v.priceRupees || 0).toLocaleString("en-IN")} ·{" "}
              {savings > 0 ? (
                <strong>customers save ₹{savings.toLocaleString("en-IN")}</strong>
              ) : (
                <strong>the set is not cheaper than buying the books separately. Lower the set price.</strong>
              )}
            </div>
          </Card>
        ) : null}

        <Card title="Images">
          <div className="space-y-6">
            <ImageList label="Cover and photos (first one is the cover)" items={v.images} onChange={(x) => set("images", x)} canUpload={canUpload} folder="products" error={errors.images} />
            {!isBundle ? <ImageList label="Look-inside pages (in reading order)" items={v.spreads} onChange={(x) => set("spreads", x)} canUpload={canUpload} folder="spreads" /> : null}
          </div>
        </Card>

        {!isBundle ? (
          <Card title="Book details">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Youngest age" error={errors.ageMin}><input type="number" className={inputCls} value={v.ageMin ?? ""} onChange={(e) => set("ageMin", num(e.target.value))} /></Field>
              <Field label="Oldest age" error={errors.ageMax} hint="Leave empty for “and up”"><input type="number" className={inputCls} value={v.ageMax ?? ""} onChange={(e) => set("ageMax", num(e.target.value))} /></Field>
              <Field label="Pages"><input type="number" className={inputCls} value={v.pages ?? ""} onChange={(e) => set("pages", num(e.target.value))} /></Field>
              <Field label="Paper"><input className={inputCls} value={v.paper ?? ""} onChange={(e) => set("paper", e.target.value)} /></Field>
              <Field label="Binding"><input className={inputCls} value={v.binding ?? ""} onChange={(e) => set("binding", e.target.value)} /></Field>
              <Field label="ISBN" error={errors.isbn}><input className={inputCls} value={v.isbn ?? ""} onChange={(e) => set("isbn", e.target.value)} /></Field>
              <Field label="Published"><input type="date" className={inputCls} value={v.publishedOn ?? ""} onChange={(e) => set("publishedOn", e.target.value)} /></Field>
              <Field label="Spine colour" hint="Used for the 3D book and the shelf">
                <input type="color" className="h-10 w-full rounded-lg border border-line" value={v.spineColor ?? "#2F6B2A"} onChange={(e) => set("spineColor", e.target.value)} />
              </Field>
              <Field label="Good for" hint="Comma separated, e.g. first week of school">
                <input className={inputCls} value={v.goodFor.join(", ")} onChange={(e) => set("goodFor", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
              </Field>
            </div>
          </Card>
        ) : null}

        <Card title="Search engines">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO title" hint={`${seoTitle.length}/60`}><input className={inputCls} value={v.seoTitle ?? ""} placeholder={`${v.title} · Gudiya Stories`} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
            <Field label="SEO description" hint={`${seoDesc.length}/160`}><input className={inputCls} value={v.seoDescription ?? ""} placeholder={v.shortDescription} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
          </div>
          <div className="mt-4 rounded-lg border border-line bg-white p-4" aria-label="Google preview">
            <p className="text-[12px] text-ink-soft">gudiyastories.com › {isBundle ? "sets" : "books"} › {v.slug}</p>
            <p className="mt-0.5 truncate text-[18px] text-[#1a0dab]">{seoTitle}</p>
            <p className="line-clamp-2 text-[13px] text-[#4d5156]">{seoDesc}</p>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Publish">
          <div className="space-y-4">
            <Field label="Status">
              <select className={inputCls} value={v.status} onChange={(e) => set("status", e.target.value as "ACTIVE")}>
                <option value="DRAFT">Draft (hidden)</option>
                <option value="ACTIVE">Active (on the site)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </Field>
            <Field label="Type">
              <select className={inputCls} value={v.type} onChange={(e) => set("type", e.target.value as "STORY")} disabled={Boolean(id)}>
                <option value="STORY">Story book</option>
                <option value="COLOURING">Colouring book</option>
                <option value="BUNDLE">Set</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-small">
              <input type="checkbox" className="size-4 accent-leaf" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured
            </label>
            <Field label="Order on the shelf" hint="Lower numbers come first"><input type="number" className={inputCls} value={v.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} /></Field>
          </div>
          {msg ? <p role="status" className={`mt-4 rounded-lg px-3 py-2 text-small ${msg.ok ? "bg-leaf/10 text-leaf" : "bg-clay/10 text-clay"}`}>{msg.text}</p> : null}
          <button className={`${btn.primary} mt-4 w-full`} disabled={pending}>{pending ? "Saving…" : id ? "Save changes" : "Create"}</button>
          {publicUrl ? (
            <a href={publicUrl} target="_blank" className={`${btn.quiet} mt-2 w-full`}>
              <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden="true" /> View on site
            </a>
          ) : null}
        </Card>

        <Card title="Price">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price ₹" error={errors.priceRupees}><input type="number" step="0.01" className={inputCls} value={v.priceRupees || ""} onChange={(e) => set("priceRupees", Number(e.target.value))} /></Field>
            <Field label="MRP ₹" error={errors.mrpRupees}><input type="number" step="0.01" className={inputCls} value={v.mrpRupees || ""} onChange={(e) => set("mrpRupees", Number(e.target.value))} /></Field>
            <Field label="Cost ₹" hint="For margin reports"><input type="number" step="0.01" className={inputCls} value={v.costRupees ?? ""} onChange={(e) => set("costRupees", num(e.target.value))} /></Field>
            <Field label="HSN"><input className={inputCls} value={v.hsnCode ?? ""} onChange={(e) => set("hsnCode", e.target.value)} /></Field>
          </div>
        </Card>

        <Card title="Values">
          <div className="flex flex-wrap gap-2">
            {values.map((val) => {
              const on = v.values.includes(val.slug);
              return (
                <label key={val.slug} className={`cursor-pointer rounded-full border px-3 py-1 text-small ${on ? "border-ink bg-ink text-paper" : "border-line"}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => set("values", on ? v.values.filter((x) => x !== val.slug) : [...v.values, val.slug])} />
                  {val.name}
                </label>
              );
            })}
          </div>
        </Card>

        <Card title="Stock and shipping">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Low-stock alert at"><input type="number" className={inputCls} value={v.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} /></Field>
            <Field label="Weight (g)"><input type="number" className={inputCls} value={v.weightGrams ?? ""} onChange={(e) => set("weightGrams", num(e.target.value))} /></Field>
          </div>
          <p className="mt-3 text-small text-ink-soft">Stock counts are changed on the Inventory page, so every change is recorded.</p>
        </Card>

        <Card title="Marketplaces">
          <div className="space-y-3">
            <Field label="Amazon link"><input className={inputCls} value={v.amazonUrl ?? ""} onChange={(e) => set("amazonUrl", e.target.value)} /></Field>
            <Field label="Flipkart link"><input className={inputCls} value={v.flipkartUrl ?? ""} onChange={(e) => set("flipkartUrl", e.target.value)} /></Field>
          </div>
        </Card>
      </div>
    </form>
  );
}
