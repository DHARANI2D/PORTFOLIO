import { describe, expect, it } from "vitest";
import OpengraphImage, { alt, contentType, size } from "@/app/opengraph-image";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("opengraph image", () => {
  it("declares size, type and alt text the metadata route needs", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
    expect(alt).toContain("Security Engineer");
  });

  it("renders a 1200x630 PNG", async () => {
    const response = await OpengraphImage();
    expect(response.headers.get("content-type")).toBe("image/png");

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 8)]).toEqual(PNG_SIGNATURE);
    // IHDR: width and height are big-endian 32-bit integers at bytes 16 and 20.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(16)).toBe(1200);
    expect(view.getUint32(20)).toBe(630);
  }, 30_000);
});
