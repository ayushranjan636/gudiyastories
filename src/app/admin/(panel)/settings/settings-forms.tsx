"use client";

import { useState, useTransition, type ReactNode } from "react";
import { btn, Card, inputCls, labelCls } from "@/components/admin/ui";
import { addAdminUser, changePassword, removeRazorpayKeys, saveRazorpayKeys, saveSetting, setAdminActive } from "./actions";

type Obj = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));
const paiseToRupees = (v: unknown) => (typeof v === "number" ? String(v / 100) : "");

function Section({ title, children, onSave }: { title: string; children: ReactNode; onSave: (f: FormData) => Promise<{ ok: boolean; message: string }> }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <Card title={title}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => setMsg(await onSave(f)));
        }}
      >
        {children}
        <div className="flex items-center gap-3 pt-1">
          <button className={btn.primary} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          {msg ? <span role="status" className={`text-small ${msg.ok ? "text-leaf" : "text-clay"}`}>{msg.message}</span> : null}
        </div>
      </form>
    </Card>
  );
}

export type PaymentsStatus = {
  configured: boolean;
  source: "env" | "admin" | null;
  keyId: string | null;
  kind: "live" | "test" | null;
  webhook: boolean;
  savedAt: string | null;
  webhookUrl: string;
  liveOnly: boolean;
};

function PaymentsCard({ status }: { status: PaymentsStatus }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const fromEnv = status.source === "env";
  return (
    <Card title="Online payments (Razorpay)" className="xl:col-span-2">
      <div className="space-y-4">
        <p className="text-small">
          {status.configured ? (
            <>
              <span className={`mr-2 inline-block rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium ${status.kind === "live" ? "bg-leaf/15 text-leaf" : "bg-[#F2B91E]/20"}`}>
                {status.kind === "live" ? "Live: customers are charged" : "Test keys: nothing is charged"}
              </span>
              Key ID <span className="font-mono">{status.keyId}</span>
              {fromEnv ? " (from the server's .env file)" : status.savedAt ? ` · saved ${status.savedAt}` : ""}
            </>
          ) : (
            <>
              <span className="mr-2 inline-block rounded-full bg-clay/10 px-2.5 py-0.5 text-[0.75rem] font-medium text-clay">Off</span>
              Checkout offers cash on delivery and WhatsApp only until you add your keys.
            </>
          )}
        </p>

        {fromEnv ? (
          <p className="text-small text-ink-soft">These keys come from the server&apos;s <span className="font-mono">.env</span> file, which takes priority. To manage them here instead, remove RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from <span className="font-mono">.env</span> and restart the site.</p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              start(async () => {
                const r = await saveRazorpayKeys({ keyId: str(f.get("keyId")), keySecret: str(f.get("keySecret")), webhookSecret: str(f.get("webhookSecret")) });
                setMsg(r);
                if (r.ok) (form.elements.namedItem("keySecret") as HTMLInputElement).value = "";
              });
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className={labelCls}>
                Key ID
                <input name="keyId" required defaultValue={status.keyId ?? ""} placeholder={status.liveOnly ? "rzp_live_…" : "rzp_live_… or rzp_test_…"} autoComplete="off" spellCheck={false} className={`${inputCls} font-mono`} />
              </label>
              <label className={labelCls}>
                Key Secret
                <input name="keySecret" type="password" required={!status.configured} placeholder={status.configured ? "Saved. Leave empty to keep it" : ""} autoComplete="new-password" spellCheck={false} className={`${inputCls} font-mono`} />
              </label>
            </div>
            <label className={labelCls}>
              Webhook secret (optional)
              <input name="webhookSecret" type="password" placeholder={status.webhook ? "Saved. Leave empty to keep it" : "Only if you add a webhook in Razorpay"} autoComplete="new-password" spellCheck={false} className={`${inputCls} font-mono`} />
              <span className="font-normal text-ink-soft">
                Not needed: the site checks every payment with Razorpay itself. If you add one, use <span className="font-mono">{status.webhookUrl}</span> with events payment.captured, payment.failed, order.paid and refund.processed.
              </span>
            </label>
            <p className="text-small text-ink-soft">
              In Razorpay, switch to <strong>Live mode</strong>, open Account &amp; Settings → API Keys, generate a key and paste both parts here. The keys are checked with Razorpay before saving and the secret is stored encrypted. It is never shown again.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button className={btn.primary} disabled={pending}>{pending ? "Checking with Razorpay…" : status.configured ? "Update keys" : "Save and turn on payments"}</button>
              {status.configured ? (
                <button
                  type="button"
                  className={btn.quiet}
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Turn off online payment? Checkout will offer cash on delivery and WhatsApp only.")) start(async () => setMsg(await removeRazorpayKeys()));
                  }}
                >
                  Remove keys
                </button>
              ) : null}
              {msg ? <span role="status" className={`text-small ${msg.ok ? "text-leaf" : "text-clay"}`}>{msg.message}</span> : null}
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}

export function SettingsForms({
  selfId,
  payments,
  store,
  shipping,
  bulkTiers,
  invoice,
  social,
  users,
  log,
}: {
  selfId: string;
  payments: PaymentsStatus;
  store: Obj;
  shipping: Obj;
  bulkTiers: { minQuantity: number; discountPercent: number | null }[];
  invoice: Obj;
  social: Obj;
  users: { id: string; name: string; email: string; role: string; active: boolean; lastLoginAt: string | null }[];
  log: { id: string; at: string; who: string; what: string }[];
}) {
  const [pending, start] = useTransition();
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const get = (f: FormData, k: string) => (f.get(k) === "" ? null : String(f.get(k) ?? ""));
  const tiers = bulkTiers.length ? bulkTiers : [{ minQuantity: 25, discountPercent: null }, { minQuantity: 100, discountPercent: null }, { minQuantity: 500, discountPercent: null }];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <PaymentsCard status={payments} />

      <Section
        title="Delivery and payment"
        onSave={(f) =>
          saveSetting("shipping", {
            flatRateRupees: f.get("flat"),
            freeShippingThresholdRupees: get(f, "free"),
            codEnabled: f.get("cod") === "on",
            codFeeRupees: f.get("codFee") || 0,
          })
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>Delivery charge ₹<input name="flat" type="number" min={0} defaultValue={paiseToRupees(shipping.flatRatePaise) || "60"} className={inputCls} /></label>
          <label className={labelCls}>Free delivery from ₹<input name="free" type="number" min={0} defaultValue={paiseToRupees(shipping.freeShippingThresholdPaise) || "499"} className={inputCls} /></label>
          <label className={labelCls}>COD fee ₹<input name="codFee" type="number" min={0} defaultValue={paiseToRupees(shipping.codFeePaise) || "0"} className={inputCls} /></label>
          <label className="flex items-end gap-2 pb-2 text-small"><input type="checkbox" name="cod" defaultChecked={Boolean(shipping.codEnabled)} className="size-4 accent-leaf" /> Offer cash on delivery</label>
        </div>
      </Section>

      <Section
        title="Store details"
        onSave={(f) =>
          saveSetting("store", { address: get(f, "address"), email: str(f.get("email")), phoneE164: str(f.get("phone")), whatsappE164: str(f.get("whatsapp")), onlineOnly: f.get("online") === "on", hours: get(f, "hours") })
        }
      >
        <label className={labelCls}>Postal address (shown on bills)<textarea name="address" rows={2} defaultValue={str(store.address)} className={`${inputCls} h-auto py-2`} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>Email<input name="email" type="email" defaultValue={str(store.email)} className={inputCls} /></label>
          <label className={labelCls}>Phone<input name="phone" defaultValue={str(store.phoneE164)} placeholder="+91…" className={inputCls} /></label>
          <label className={labelCls}>WhatsApp<input name="whatsapp" defaultValue={str(store.whatsappE164)} placeholder="+91…" className={inputCls} /></label>
          <label className={labelCls}>Hours<input name="hours" defaultValue={str(store.hours)} className={inputCls} /></label>
        </div>
        <label className="flex items-center gap-2 text-small"><input type="checkbox" name="online" defaultChecked={store.onlineOnly !== false} className="size-4 accent-leaf" /> Online only (no shop to visit)</label>
      </Section>

      <Section
        title="Bulk price tiers (For schools page)"
        onSave={(f) => saveSetting("bulkTiers", tiers.map((t, i) => ({ minQuantity: f.get(`min${i}`), discountPercent: get(f, `pct${i}`) })))}
      >
        {tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <label className={labelCls}>From copies<input name={`min${i}`} type="number" defaultValue={t.minQuantity} className={inputCls} /></label>
            <label className={labelCls}>Discount %<input name={`pct${i}`} type="number" defaultValue={t.discountPercent ?? ""} placeholder="Not set" className={inputCls} /></label>
          </div>
        ))}
      </Section>

      <Section title="Bills" onSave={(f) => saveSetting("invoice", { documentType: f.get("doc"), gstin: get(f, "gstin"), hsnDefault: str(f.get("hsn")) })}>
        <label className={labelCls}>
          Document
          <select name="doc" defaultValue={str(invoice.documentType) || "BILL_OF_SUPPLY"} className={inputCls}>
            <option value="BILL_OF_SUPPLY">Bill of supply (no GST charged)</option>
            <option value="TAX_INVOICE">Tax invoice</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>GSTIN<input name="gstin" defaultValue={str(invoice.gstin)} className={inputCls} /></label>
          <label className={labelCls}>Default HSN<input name="hsn" defaultValue={str(invoice.hsnDefault) || "4901"} className={inputCls} /></label>
        </div>
        <p className="text-small text-ink-soft">Confirm these with your CA before using the bills for real orders.</p>
      </Section>

      <Section
        title="Social links"
        onSave={(f) =>
          saveSetting("social", {
            instagram: str(f.get("ig")),
            facebook: str(f.get("fb")),
            youtube: str(f.get("yt")),
            instagramPosts: String(f.get("igPosts") ?? "").split(/\s+/).map((x) => x.trim()).filter(Boolean),
          })
        }
      >
        <label className={labelCls}>Instagram<input name="ig" type="url" defaultValue={str(social.instagram) || "https://www.instagram.com/gudiyastories/"} className={inputCls} /></label>
        <label className={labelCls}>
          Instagram posts shown above the footer
          <textarea
            name="igPosts"
            rows={3}
            defaultValue={(Array.isArray(social.instagramPosts) ? (social.instagramPosts as string[]) : []).join("\n")}
            placeholder={"https://www.instagram.com/p/…\nOne link per line. The first three are shown."}
            className={inputCls}
          />
          <span className="font-normal text-ink-soft">On Instagram, open a post, tap ⋯ → Copy link, paste it here. Empty shows a follow card instead.</span>
        </label>
        <label className={labelCls}>Facebook<input name="fb" type="url" defaultValue={str(social.facebook)} className={inputCls} /></label>
        <label className={labelCls}>YouTube<input name="yt" type="url" defaultValue={str(social.youtube)} className={inputCls} /></label>
      </Section>

      <Section title="Your password" onSave={(f) => changePassword(str(f.get("current")), str(f.get("next")))}>
        <label className={labelCls}>Current password<input name="current" type="password" autoComplete="current-password" className={inputCls} /></label>
        <label className={labelCls}>New password<input name="next" type="password" autoComplete="new-password" minLength={12} className={inputCls} /></label>
      </Section>

      <Card title="Who can sign in" className="xl:col-span-2">
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-small">
              <span>
                <span className="font-medium">{u.name}</span> · {u.email} · {u.role === "OWNER" ? "Owner" : "Staff"}
                <span className="block text-ink-soft">{u.active ? (u.lastLoginAt ? `Last signed in ${u.lastLoginAt}` : "Never signed in") : "Turned off"}</span>
              </span>
              {u.id !== selfId ? (
                <button className={btn.quiet} disabled={pending} onClick={() => start(async () => setUserMsg((await setAdminActive(u.id, !u.active)).message))}>
                  {u.active ? "Turn off" : "Turn on"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <form
          className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-5 sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            start(async () => {
              const r = await addAdminUser({ name: str(f.get("name")), email: str(f.get("email")), password: str(f.get("password")), role: str(f.get("role")) });
              setUserMsg(r.message);
              if (r.ok) form.reset();
            });
          }}
        >
          <label className={labelCls}>Name<input name="name" required className={inputCls} /></label>
          <label className={labelCls}>Email<input name="email" type="email" required className={inputCls} /></label>
          <label className={labelCls}>Temporary password<input name="password" type="password" minLength={12} required className={inputCls} /></label>
          <label className={labelCls}>
            Role
            <select name="role" className={inputCls}>
              <option value="STAFF">Staff: orders, stock, notes</option>
              <option value="OWNER">Owner: everything</option>
            </select>
          </label>
          <button className={btn.primary} disabled={pending}>Add person</button>
        </form>
        {userMsg ? <p role="status" className="mt-2 text-small">{userMsg}</p> : null}
      </Card>

      <Card title="Recent changes" className="xl:col-span-2">
        <ul className="space-y-1.5 text-small">
          {log.map((l) => (
            <li key={l.id} className="grid grid-cols-[7rem_10rem_1fr] gap-3">
              <span className="text-ink-soft">{l.at}</span>
              <span>{l.who}</span>
              <span className="text-ink-soft">{l.what}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
