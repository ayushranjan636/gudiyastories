"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Select, TextArea, TextInput } from "@/components/ui/field";

/** Interactive form sample: shows the error state linked to its field. */
export function FormDemo() {
  const [pin, setPin] = useState("5170");
  const pinError = /^\d{6}$/.test(pin) ? undefined : "Enter a 6-digit PIN code.";

  return (
    <form className="grid gap-6 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()} noValidate>
      <TextInput label="Name" name="name" autoComplete="name" placeholder="Priya Raman" />
      <TextInput
        label="Phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        hint="We only call if the courier cannot find you."
      />
      <TextInput label="Email" name="email" type="email" autoComplete="email" optional hint="For your order confirmation." />
      <TextInput
        label="PIN code"
        name="pin"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        error={pinError}
        hint="City and state fill in from the PIN code."
      />
      <Select label="Organisation type" name="orgType" defaultValue="">
        <option value="" disabled>
          Choose one
        </option>
        <option value="SCHOOL">School</option>
        <option value="LIBRARY">Library</option>
        <option value="NGO">NGO</option>
        <option value="COMPANY_CSR">Company (CSR)</option>
      </Select>
      <TextInput label="Disabled field" name="disabled" disabled defaultValue="Tirupati" />
      <div className="sm:col-span-2">
        <TextArea label="Anything we should know?" name="note" optional placeholder="Gift wrap, delivery timing, a name for the bookplate." />
      </div>
      <div className="sm:col-span-2">
        <Checkbox label="Email me new resources" hint="Optional. You can unsubscribe from any email." />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit">Place order</Button>
        <Button variant="text">Save for later</Button>
      </div>
    </form>
  );
}
