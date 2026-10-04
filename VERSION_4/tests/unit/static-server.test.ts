import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildCsp, buildPageHeadersFile, hashScript } from "../../scripts/lib/csp.mjs";

// The e2e suite runs against tests/e2e/static-server.mjs. It cannot run in every environment, so
// the server itself is tested here: if it serves the wrong type, status or header, every browser
// test would fail for a reason that has nothing to do with the site.

const root = path.join(import.meta.dirname, "../..");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

let dir: string;
let server: ChildProcess;
let base: string;

function listen(args: string[]): Promise<{ child: ChildProcess; base: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(root, "tests/e2e/static-server.mjs"), ...args],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`server did not start: ${output}`));
    }, 10_000);
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const match = /listening (http:\/\/[^\s]+)/.exec(output);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve({ child, base: match[1] });
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited with ${code}: ${output}`));
    });
  });
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "static-server-"));
  const write = (name: string, body: string | Buffer) => {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  };
  write("index.html", "<h1>home</h1>");
  write("about/index.html", "<h1>about</h1>");
  write("404.html", "<h1>missing</h1>");
  write("robots.txt", "User-agent: *");
  write("_next/static/app.js", "console.log(1)");
  write("opengraph-image", PNG);
  write(".well-known/security.txt", "Contact: mailto:a@b.c\n");
  const csp = buildCsp({ scriptHashes: [hashScript("x()")] });
  write(
    "_headers",
    buildPageHeadersFile({
      pages: [
        { path: "/", csp },
        { path: "/about/", csp },
      ],
    }),
  );
  ({ child: server, base } = await listen(["--dir", dir, "--port", "0"]));
});

afterAll(() => {
  server?.kill();
  fs.rmSync(dir, { recursive: true, force: true });
});

const get = (pathname: string, init?: RequestInit) =>
  fetch(`${base}${pathname}`, { redirect: "manual", ...init });

describe("static server", () => {
  it("serves index.html for a directory path with the right type", async () => {
    const res = await get("/about/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await res.text()).toBe("<h1>about</h1>");
    expect(await (await get("/")).text()).toBe("<h1>home</h1>");
  });

  it("redirects a directory without a trailing slash, keeping the query", async () => {
    const res = await get("/about?x=1");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/about/?x=1");
  });

  it("serves 404.html with status 404 for unknown paths", async () => {
    const res = await get("/nope/");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("<h1>missing</h1>");
    expect((await get("/about/missing.html")).status).toBe(404);
  });

  it("picks content types by extension, and sniffs an extensionless PNG", async () => {
    expect((await get("/robots.txt")).headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect((await get("/_next/static/app.js")).headers.get("content-type")).toContain(
      "text/javascript",
    );
    expect((await get("/opengraph-image")).headers.get("content-type")).toBe("image/png");
    expect((await get("/.well-known/security.txt")).status).toBe(200);
  });

  it("applies _headers: baseline everywhere, the page's CSP only on that page", async () => {
    const page = await get("/about/");
    expect(page.headers.get("x-content-type-options")).toBe("nosniff");
    expect(page.headers.get("x-frame-options")).toBe("DENY");
    expect(page.headers.get("content-security-policy")).toContain(hashScript("x()"));

    const asset = await get("/_next/static/app.js");
    expect(asset.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(asset.headers.get("content-security-policy")).toBeNull();
    expect(asset.headers.get("x-content-type-options")).toBe("nosniff");

    // Like a real host, an unknown path matches no page rule: baseline only, no CSP.
    const missing = await get("/nope/");
    expect(missing.headers.get("content-security-policy")).toBeNull();
    expect(missing.headers.get("x-frame-options")).toBe("DENY");
  });

  it("serves the CSP as built, minus upgrade-insecure-requests", async () => {
    const csp = (await get("/about/")).headers.get("content-security-policy") ?? "";
    expect(csp).not.toContain("upgrade-insecure-requests");
    expect(csp).toContain("script-src 'self' 'sha256-");
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("does not leave the export directory", async () => {
    for (const attempt of [
      "/../package.json",
      "/%2e%2e/package.json",
      "/..%2f..%2fpackage.json",
      "/a/%2e%2e%2f%2e%2e%2fpackage.json",
      "/%00",
      "/%E0%A4%A",
    ]) {
      const res = await get(attempt);
      expect([400, 404], attempt).toContain(res.status);
      expect(await res.text(), attempt).not.toContain('"name": "portfolio"');
    }
  });

  it("supports HEAD and rejects other methods", async () => {
    const head = await get("/about/", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(Number(head.headers.get("content-length"))).toBeGreaterThan(0);
    const post = await get("/about/", { method: "POST", body: "x" });
    expect(post.status).toBe(405);
  });
});

describe("static server startup", () => {
  it("exits with an error when the directory is missing", async () => {
    await expect(
      listen(["--dir", path.join(dir, "does-not-exist"), "--port", "0"]),
    ).rejects.toThrow(/does not exist/);
  });
});
