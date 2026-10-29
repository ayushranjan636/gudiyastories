import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { Badge, btn, Empty, PageHeader, Table } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Blog" };

export default async function BlogAdmin() {
  await requireAdmin();
  const posts = await db.post.findMany({ orderBy: { updatedAt: "desc" }, include: { category: true } });
  return (
    <div className="space-y-6">
      <PageHeader title="Blog" description="Drafts stay private. Published posts appear on /blog and the home page straight away; scheduled ones go live at their time." actions={<Link href="/admin/blog/new" className={btn.primary}>Write a post</Link>} />
      {posts.length ? (
        <Table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Category</th>
              <th>Updated</th>
              <th className="text-right">Read</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/blog/${p.id}`} className="font-medium hover:text-leaf">{p.title}</Link>
                  <span className="block text-ink-soft">/blog/{p.slug}</span>
                </td>
                <td>
                  <Badge tone={p.status === "PUBLISHED" ? "green" : p.status === "SCHEDULED" ? "lime" : "amber"}>
                    {p.status === "SCHEDULED" && p.publishAt ? `scheduled ${formatDate(p.publishAt)}` : p.status.toLowerCase()}
                  </Badge>
                </td>
                <td className="text-ink-soft">{p.category?.name ?? "–"}</td>
                <td className="text-ink-soft">{formatDate(p.updatedAt)}</td>
                <td className="text-right text-ink-soft">{p.readingMinutes} min</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Empty>No posts yet.</Empty>
      )}
    </div>
  );
}
