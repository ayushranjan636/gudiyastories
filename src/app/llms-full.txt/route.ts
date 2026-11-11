import { buildLlmsTxt } from "@/features/llms/build";

// Rebuilt at most once an hour, like the sitemap.
export const revalidate = 3600;

export async function GET() {
  const body = await buildLlmsTxt({ full: true });
  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
