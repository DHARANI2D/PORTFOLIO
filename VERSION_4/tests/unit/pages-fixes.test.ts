import { describe, expect, it } from "vitest";
import { linkedinHandle } from "@/components/contact/contact-block";
import { MAILTO_MAX_LENGTH, composeMailto, fitsMailto } from "@/components/contact/mailto";

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
