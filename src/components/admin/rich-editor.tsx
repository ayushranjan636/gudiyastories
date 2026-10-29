"use client";

import { EditorContent, mergeAttributes, Node, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  BookOpen,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Undo2,
  Film,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { checkWriting } from "@/lib/writing-rules";

// Image with required alt text.
const Figure = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "img[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes, { loading: "lazy" })];
  },
});

// A book card. Saved as <div data-product="slug">, expanded into a real card on the public page.
const ProductCard = Node.create({
  name: "productCard",
  group: "block",
  atom: true,
  addAttributes() {
    return { product: { default: null, parseHTML: (el) => el.getAttribute("data-product"), renderHTML: (a) => ({ "data-product": a.product }) } };
  },
  parseHTML() {
    return [{ tag: "div[data-product]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "product-embed" }), `Book: ${HTMLAttributes["data-product"]}`];
  },
});

const YouTubeEmbed = Node.create({
  name: "youtube",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: "iframe[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["iframe", mergeAttributes(HTMLAttributes, { allowfullscreen: "true", title: "Video" })];
  },
});

// An uploaded video file, played in place.
const VideoFile = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(HTMLAttributes, { controls: "true", playsinline: "true", preload: "metadata" })];
  },
});

export type UploadFn = (f: File, onProgress?: (p: number) => void) => Promise<string>;

function toYoutubeEmbed(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

function Tool({ on, label, onClick, children }: { on?: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className={cn("grid size-8 place-items-center rounded-md hover:bg-paper-deep", on && "bg-ink text-paper hover:bg-ink")}
    >
      {children}
    </button>
  );
}

/** Uploads a dropped, pasted or chosen file and inserts it at `pos` (or the cursor). */
async function insertFile(editor: Editor, file: File, onUpload: UploadFn | undefined, setStatus: (s: string | null) => void, pos?: number) {
  const isVideo = file.type.startsWith("video/");
  if (!isVideo && !file.type.startsWith("image/")) return window.alert("Only images and videos can be added here.");
  if (!onUpload) return window.alert("Uploads are not available here.");
  let src: string;
  try {
    setStatus(`Uploading ${isVideo ? "video" : "image"}… 0%`);
    src = await onUpload(file, (p) => setStatus(`Uploading ${isVideo ? "video" : "image"}… ${Math.round(p * 100)}%`));
  } catch (err) {
    setStatus(null);
    return window.alert(err instanceof Error ? err.message : "Upload failed");
  }
  setStatus(null);
  let content: Record<string, unknown>;
  if (isVideo) content = { type: "video", attrs: { src } };
  else {
    const alt = window.prompt("Describe the image for people who can't see it (required)") ?? "";
    if (!alt.trim()) return window.alert("An image needs a description. Nothing was added.");
    content = { type: "image", attrs: { src, alt } };
  }
  const chain = editor.chain().focus();
  (pos != null ? chain.insertContentAt(pos, content) : chain.insertContent(content)).run();
}

function Toolbar({
  editor,
  products,
  onUpload,
  status,
  setStatus,
}: {
  editor: Editor;
  products: { slug: string; title: string }[];
  onUpload?: UploadFn;
  status: string | null;
  setStatus: (s: string | null) => void;
}) {
  const i = { className: "size-4", strokeWidth: 1.6, "aria-hidden": true } as const;
  const c = () => editor.chain().focus();
  const pick = (accept: string) => (
    <input
      type="file"
      accept={accept}
      className="sr-only"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) void insertFile(editor, file, onUpload, setStatus);
      }}
    />
  );
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-line bg-white/95 p-1.5">
      <Tool label="Heading" on={editor.isActive("heading", { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 {...i} /></Tool>
      <Tool label="Small heading" on={editor.isActive("heading", { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 {...i} /></Tool>
      <Tool label="Bold" on={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><Bold {...i} /></Tool>
      <Tool label="Italic" on={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><Italic {...i} /></Tool>
      <Tool label="Bulleted list" on={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}><List {...i} /></Tool>
      <Tool label="Numbered list" on={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}><ListOrdered {...i} /></Tool>
      <Tool label="Quote" on={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}><Quote {...i} /></Tool>
      <Tool label="Divider" onClick={() => c().setHorizontalRule().run()}><Minus {...i} /></Tool>
      <Tool
        label="Link"
        on={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("Link address", prev ?? "https://");
          if (url === null) return;
          if (!url) c().unsetLink().run();
          else c().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        <Link2 {...i} />
      </Tool>
      <span className="mx-1 h-5 w-px bg-line" />
      {onUpload ? (
        <>
          <label className={cn("grid size-8 cursor-pointer place-items-center rounded-md hover:bg-paper-deep", status && "opacity-50")} title="Image (or drop one into the text)">
            <ImageIcon {...i} />
            <span className="sr-only">Insert image</span>
            {pick("image/*")}
          </label>
          <label className={cn("grid size-8 cursor-pointer place-items-center rounded-md hover:bg-paper-deep", status && "opacity-50")} title="Video file (or drop one into the text)">
            <Film {...i} />
            <span className="sr-only">Insert video</span>
            {pick("video/mp4,video/webm,video/quicktime")}
          </label>
        </>
      ) : (
        <Tool
          label="Image by address"
          onClick={() => {
            const src = window.prompt("Image address", "/");
            const alt = src ? window.prompt("Describe the image (required)") ?? "" : "";
            if (src && alt.trim()) c().insertContent({ type: "image", attrs: { src, alt } }).run();
          }}
        >
          <ImageIcon {...i} />
        </Tool>
      )}
      <Tool
        label="Book card"
        onClick={() => {
          const list = products.map((p, n) => `${n + 1}. ${p.title}`).join("\n");
          const pick = Number(window.prompt(`Which book?\n${list}`));
          const p = products[pick - 1];
          if (p) c().insertContent({ type: "productCard", attrs: { product: p.slug } }).run();
        }}
      >
        <BookOpen {...i} />
      </Tool>
      <Tool
        label="YouTube link"
        onClick={() => {
          const src = toYoutubeEmbed(window.prompt("YouTube link") ?? "");
          if (src) c().insertContent({ type: "youtube", attrs: { src } }).run();
        }}
      >
        <Video {...i} />
      </Tool>
      <span className="mx-1 h-5 w-px bg-line" />
      <Tool label="Undo" onClick={() => c().undo().run()}><Undo2 {...i} /></Tool>
      <Tool label="Redo" onClick={() => c().redo().run()}><Redo2 {...i} /></Tool>
    </div>
  );
}

export function RichEditor({
  initialHtml,
  onChange,
  products = [],
  onUpload,
  minHeight = 320,
}: {
  initialHtml: string;
  onChange: (html: string, json: unknown, text: string) => void;
  products?: { slug: string; title: string }[];
  onUpload?: UploadFn;
  minHeight?: number;
}) {
  const [issues, setIssues] = useState(() => checkWriting(initialHtml.replace(/<[^>]+>/g, " "), { maxExclamations: 2 }));
  const [status, setStatus] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // The editor's handlers are created once; keep the latest upload function in a ref.
  const uploadRef = useRef(onUpload);
  const editorRef = useRef<Editor | null>(null);
  useEffect(() => {
    uploadRef.current = onUpload;
  }, [onUpload]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: { openOnClick: false, autolink: true } }), Figure, VideoFile, ProductCard, YouTubeEmbed],
    content: initialHtml || "<p></p>",
    editorProps: {
      attributes: { class: "prose-notes admin-editor focus:outline-none px-5 py-4", style: `min-height:${minHeight}px` },
      handleDrop: (view, event, _slice, moved) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter((f) => /^(image|video)\//.test(f.type));
        if (moved || !files.length || !editorRef.current) return false;
        event.preventDefault();
        setDragging(false);
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void (async () => {
          for (const f of files) await insertFile(editorRef.current!, f, uploadRef.current, setStatus, pos);
        })();
        return true;
      },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((f) => /^(image|video)\//.test(f.type));
        if (!files.length || !editorRef.current) return false;
        event.preventDefault();
        void (async () => {
          for (const f of files) await insertFile(editorRef.current!, f, uploadRef.current, setStatus);
        })();
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      const text = e.getText();
      onChange(e.getHTML(), e.getJSON(), text);
      setIssues(checkWriting(text, { maxExclamations: 2 }));
    },
  });
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl border bg-white transition-colors", dragging ? "border-leaf ring-2 ring-leaf/30" : "border-line")}
      onDragEnter={(e) => e.dataTransfer.types.includes("Files") && setDragging(true)}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Element | null) && setDragging(false)}
      onDrop={() => setDragging(false)}
    >
      {editor ? <Toolbar editor={editor} products={products} onUpload={onUpload} status={status} setStatus={setStatus} /> : <div className="h-11 border-b border-line" />}
      {status ? (
        <p role="status" className="border-b border-line bg-leaf/10 px-4 py-1.5 text-small text-leaf">
          {status}
        </p>
      ) : null}
      <EditorContent editor={editor} />
      {dragging && onUpload ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-leaf px-4 py-2 text-center text-small text-white">Drop the image or video where you want it</p>
      ) : null}
      {issues.length ? (
        <p className="border-t border-line bg-[#F2B91E]/15 px-4 py-2 text-small">
          Writing check: {issues.map((x) => (x.kind === "banned" ? `"${x.match}"` : x.kind === "emoji" ? "an emoji" : x.kind === "em-dash" ? "an em dash" : x.match)).join(", ")}. See the writing rules in docs/brief.md.
        </p>
      ) : null}
    </div>
  );
}
