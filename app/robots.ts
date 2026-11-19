import type { MetadataRoute } from "next";

/** Internal tool for Safe Pros and the Kiddough team: keep it out of search engines. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
