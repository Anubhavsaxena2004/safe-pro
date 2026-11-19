import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * This app is only for Safe Pros and the Kiddough team. Customers book on the Kiddough
 * website, which sends requests to /api/requests.
 */
export default async function Home() {
  redirect((await getAdmin()) ? "/admin" : "/pro");
}
