import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { Badge, btn, Empty, PageHeader, Table } from "@/components/admin/ui";
import { formatClassPrice, formatStart } from "@/features/classes/format";
import { PopupSwitch } from "./popup-switch";

export const metadata = { title: "Classes" };

export default async function ClassesAdmin() {
  await requireAdmin();
  const classes = await db.onlineClass.findMany({ orderBy: [{ status: "asc" }, { startDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }] });
  const popup = classes.find((c) => c.isPopup);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Online classes"
        description="Published classes appear on /classes and the home page. Enquiries go to each class's Google Form."
        actions={<Link href="/admin/classes/new" className={btn.primary}>Add a class</Link>}
      />
      <p className="rounded-lg border border-line bg-white/70 px-4 py-3 text-small">
        <span className="font-medium">Home-page pop-up:</span>{" "}
        {popup ? (
          <>
            showing <span className="font-medium">{popup.title}</span>
            {popup.status !== "PUBLISHED" ? " (hidden until it is published again)" : ""}. Visitors see it once per visit, a few seconds after the page opens.
          </>
        ) : (
          "off. Switch it on for one class below."
        )}
      </p>
      {classes.length ? (
        <Table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Status</th>
              <th>Starts</th>
              <th>Price</th>
              <th>Pop-up</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/classes/${c.id}`} className="font-medium hover:text-leaf">{c.title}</Link>
                  <span className="block text-ink-soft">{c.duration}</span>
                </td>
                <td>
                  <Badge tone={c.status === "PUBLISHED" ? "green" : c.status === "CLOSED" ? "neutral" : "amber"}>
                    {c.status === "CLOSED" ? "closed" : c.status.toLowerCase()}
                  </Badge>
                </td>
                <td className="text-ink-soft">{formatStart(c.startDate, "short") ?? "–"}</td>
                <td className="tabular-nums">{formatClassPrice(c.pricePaise)}</td>
                <td>
                  <PopupSwitch id={c.id} on={c.isPopup} disabled={c.status !== "PUBLISHED" && !c.isPopup} title={c.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Empty>No classes yet. Add the first one: name, picture or video, topics, price, start date and the Google Form link.</Empty>
      )}
    </div>
  );
}
