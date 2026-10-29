"use client";

import { useActionState } from "react";
import { Checkbox, Select, TextArea, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { submitEnquiry, type EnquiryState } from "./actions";

export function EnquiryForm({ titles }: { titles: { sku: string; title: string }[] }) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiry, { status: "idle" });
  const err = state.status === "error" ? state.fieldErrors ?? {} : {};

  if (state.status === "ok") {
    return (
      <div role="status" className="rounded-2xl border border-line bg-white/60 p-8">
        <p className="font-display text-h3">Thank you. We have your enquiry.</p>
        <p className="mt-3 max-w-[50ch] text-ink-soft">
          {state.saved
            ? "We will be in touch on the number or email you gave us."
            : "To make sure it reaches us straight away, please also send it on WhatsApp with the button below."}
        </p>
        <a
          href={state.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-leaf px-6 font-medium text-white hover:bg-leaf-deep"
        >
          Send the details on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate>
      {state.status === "error" ? (
        <p role="alert" className="rounded-xl bg-clay/10 px-4 py-3 text-small font-medium text-clay sm:col-span-2">
          {state.message}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <TextInput label="School, library or company" name="organisation" autoComplete="organization" required error={err.organisation} />
      </div>
      <Select label="Type of organisation" name="organisationType" defaultValue="" required error={err.organisationType}>
        <option value="" disabled>
          Choose one
        </option>
        <option value="SCHOOL">School</option>
        <option value="LIBRARY">Library</option>
        <option value="NGO">NGO</option>
        <option value="COMPANY_CSR">Company CSR programme</option>
        <option value="BOOKSHOP">Bookshop</option>
        <option value="OTHER">Something else</option>
      </Select>
      <TextInput label="City" name="city" autoComplete="address-level2" required error={err.city} />
      <TextInput label="Roughly how many copies?" name="quantity" type="number" inputMode="numeric" min={1} required error={err.quantity} />
      <TextInput label="When do you need them?" name="timeline" optional placeholder="For example, before Children's Day" />

      <fieldset className="sm:col-span-2">
        <legend className="text-small font-medium">Which titles? <span className="font-normal text-ink-soft">(optional)</span></legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {titles.map((t) => (
            <label key={t.sku} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-small has-[:checked]:border-leaf has-[:checked]:bg-leaf/5">
              <input type="checkbox" name="titles" value={t.title} className="size-4 accent-leaf" />
              {t.title}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3 sm:col-span-2">
        <legend className="mb-1 text-small font-medium">Also interested in</legend>
        <Checkbox name="wantsSamplePack" label="A sample pack before ordering" />
        <Checkbox name="wantsBookplate" label="A printed bookplate with our name" />
        <Checkbox name="wantsAuthorVisit" label="A reading session with the author" />
      </fieldset>

      <TextInput label="Budget" name="budget" optional placeholder="A range is fine" />
      <div className="hidden sm:block" />
      <TextInput label="Your name" name="contactName" autoComplete="name" required error={err.contactName} />
      <TextInput label="Mobile number" name="contactPhone" type="tel" autoComplete="tel" inputMode="tel" required error={err.contactPhone} />
      <div className="sm:col-span-2">
        <TextInput label="Email" name="contactEmail" type="email" autoComplete="email" required error={err.contactEmail} />
      </div>
      <div className="sm:col-span-2">
        <TextArea label="Anything else we should know?" name="message" optional rows={4} />
      </div>
      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send enquiry"}
        </Button>
        <p className="mt-3 text-small text-ink-soft">We only use these details to reply about this order.</p>
      </div>
    </form>
  );
}
