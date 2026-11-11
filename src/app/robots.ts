import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

const PRIVATE = ["/admin", "/api/", "/checkout", "/order/", "/receipt/", "/review/", "/track", "/styleguide"];

// AI assistants and answer engines, named so they are clearly welcome on the
// public pages (some only crawl when a rule names them). Same private paths as everyone.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "meta-externalagent",
  "Bytespider",
  "CCBot",
  "DuckAssistBot",
  "cohere-ai",
  "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE.url.replace(/\/$/, "")}/sitemap.xml`,
  };
}
