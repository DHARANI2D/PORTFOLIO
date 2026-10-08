import { buildKnowledge } from "@/lib/knowledge";

// Static export: rendered once at build time into out/knowledge.json.
export const dynamic = "force-static";

/** The documents the terminal assistant answers from. Public: it is the content of the site. */
export async function GET() {
  return Response.json(await buildKnowledge());
}
