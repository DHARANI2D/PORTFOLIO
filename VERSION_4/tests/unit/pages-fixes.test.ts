import { describe, expect, it } from "vitest";
import { linkedinHandle } from "@/components/contact/contact-block";
import { MAILTO_MAX_LENGTH, composeMailto, fitsMailto } from "@/components/contact/mailto";
import { metaDescription } from "@/components/research/text";
import { notesTaggedWith, researchForTags, systemsForTags } from "@/components/writing/related";
import { getProjects, getResearch } from "@/lib/content";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Vitest cannot import .mdx, so read each note's `export const meta = {...}` straight from source. */
async function getWritingPosts() {
  const dir = path.join(process.cwd(), "content", "writing");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const source = readFileSync(path.join(dir, f), "utf8");
      const block = /^export const meta = (\{[\s\S]*?\n\});?/m.exec(source)?.[1] ?? "{}";
      const meta = new Function(`return (${block})`)() as {
        title: string;
        summary: string;
        tags: string[];
        number: number;
      };
      return { slug: f.replace(/\.mdx$/, ""), meta };
    });
}

const base = { to: "a@b.co", name: "N", email: "n@x.co", purpose: "research" };

describe("mailto length cap (UX-16)", () => {
  it("accepts a normal ASCII message", () => {
    expect(
      fitsMailto(composeMailto({ ...base, message: "Hello there, a short note.".repeat(5) })),
    ).toBe(true);
  });

  it("rejects 1000 non-ASCII characters even though the character cap allows them", () => {
    const url = composeMailto({ ...base, message: "வணக்கம் ".repeat(125) });
    expect(url.length).toBeGreaterThan(MAILTO_MAX_LENGTH);
    expect(fitsMailto(url)).toBe(false);
  });

  it("counts newlines (CRLF, %0D%0A) and emoji in the encoded length", () => {
    expect(fitsMailto(composeMailto({ ...base, message: "x\n".repeat(500) }))).toBe(false);
    expect(fitsMailto(composeMailto({ ...base, message: "\u{1F600}".repeat(200) }))).toBe(false);
    expect(fitsMailto(composeMailto({ ...base, message: "café\nnext line" }))).toBe(true);
  });
});

describe("linkedinHandle (D13)", () => {
  it("drops the trailing profile id so the row stays on one line", () => {
    expect(
      linkedinHandle("https://www.linkedin.com/in/dharanidharan-senthilkumar-b4244b232/"),
    ).toBe("in/dharanidharan-senthilkumar");
    expect(linkedinHandle("https://www.linkedin.com/in/someone/")).toBe("in/someone");
  });
});

describe("meta descriptions (SEO-3)", () => {
  const endsProperly = (text: string) => /[.!?]["”’']?$/.test(text);

  it("never cuts mid-clause and never uses an ellipsis", () => {
    const long =
      "WITNESS is a deterministic gate that checks an agent's proposed remediation against the real environment before anything executes, and then decides, which is the long part. Second sentence.";
    const out = metaDescription(long);
    expect(out.length).toBeLessThanOrEqual(155);
    expect(endsProperly(out)).toBe(true);
    expect(out).not.toContain("…");
  });

  it("prefers whole sentences that fit", () => {
    expect(metaDescription("One short sentence. Another one here. " + "x".repeat(200))).toBe(
      "One short sentence. Another one here.",
    );
  });

  it("every research item ends with punctuation and is at most 160 characters", () => {
    for (const item of getResearch()) {
      const out = metaDescription(item.abstract, item.metaDescription);
      expect(out.length, item.slug).toBeLessThanOrEqual(160);
      expect(endsProperly(out), item.slug).toBe(true);
      expect(out, item.slug).not.toContain("…");
    }
  });

  it("every field note summary ends with punctuation and is at most 160 characters", async () => {
    for (const post of await getWritingPosts()) {
      const out = metaDescription(post.meta.summary);
      expect(out.length, post.slug).toBeLessThanOrEqual(160);
      expect(endsProperly(out), post.slug).toBe(true);
    }
  });
});

describe("related links (SEO-2, UX-07)", () => {
  it("links a note to the systems it is tagged with, and back", async () => {
    const posts = await getWritingPosts();
    const projects = getProjects();
    const witnessNotes = notesTaggedWith(posts, ["WITNESS"]);
    expect(witnessNotes.length).toBeGreaterThan(0);
    for (const note of witnessNotes) {
      expect(systemsForTags(note.meta.tags, projects).map((p) => p.slug)).toContain("witness");
    }
  });

  it("research pages and notes link both ways", async () => {
    const posts = await getWritingPosts();
    const projects = getProjects();
    const research = getResearch();
    for (const item of research) {
      const related = projects.filter((p) => item.relatedProjects.includes(p.slug));
      const notes = notesTaggedWith(posts, [item.title, ...related.map((p) => p.name)]);
      for (const note of notes) {
        const systems = systemsForTags(note.meta.tags, projects);
        const back = researchForTags(note.meta.tags, research, systems).map((r) => r.slug);
        expect(back, `${note.slug} -> ${item.slug}`).toContain(item.slug);
      }
    }
  });
});
