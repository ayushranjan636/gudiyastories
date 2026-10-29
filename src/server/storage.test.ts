import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { signV4 } from "./storage-s3";
import { sniffType, safeFolder } from "./storage";
import { resolveUpload } from "./storage-local";

describe("S3 request signing", () => {
  it("matches AWS's published SigV4 example (GET Object)", () => {
    const { signature } = signV4({
      method: "GET",
      host: "examplebucket.s3.amazonaws.com",
      path: "/test.txt",
      headers: {
        range: "bytes=0-9",
        "x-amz-content-sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "x-amz-date": "20130524T000000Z",
      },
      payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      region: "us-east-1",
      amzDate: "20130524T000000Z",
      creds: { accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
    });
    expect(signature).toBe("f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
  });

  it("matches AWS's published presigned URL example (query-string auth)", () => {
    const query =
      "X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host";
    const { signature } = signV4({
      method: "GET",
      host: "examplebucket.s3.amazonaws.com",
      path: "/test.txt",
      query,
      headers: {},
      payloadHash: "UNSIGNED-PAYLOAD",
      region: "us-east-1",
      amzDate: "20130524T000000Z",
      creds: { accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
    });
    expect(signature).toBe("aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404");
  });

  it("presigns a direct upload to Cloudflare R2", async () => {
    Object.assign(process.env, { S3_BUCKET: "gudiya", S3_REGION: "auto", S3_ENDPOINT: "https://acc.r2.cloudflarestorage.com", S3_PUBLIC_URL: "https://media.example.com", AWS_ACCESS_KEY_ID: "k", AWS_SECRET_ACCESS_KEY: "s" });
    const { presignPut } = await import("./storage-s3");
    const p = await presignPut("books/2026-10/a.jpg", "image/jpeg");
    expect(p.url).toMatch(/^https:\/\/acc\.r2\.cloudflarestorage\.com\/gudiya\/books\/2026-10\/a\.jpg\?X-Amz-Algorithm=AWS4-HMAC-SHA256&/);
    expect(p.url).toContain("X-Amz-SignedHeaders=cache-control%3Bcontent-type%3Bhost");
    expect(p.url).toMatch(/&X-Amz-Signature=[0-9a-f]{64}$/);
    expect(p.publicUrl).toBe("https://media.example.com/books/2026-10/a.jpg");
    expect(p.headers["content-type"]).toBe("image/jpeg");
  });
});

describe("uploads", () => {
  it("recognises files by their bytes", () => {
    expect(sniffType(Buffer.from("89504e470d0a1a0a0000000d", "hex"))).toBe("image/png");
    expect(sniffType(Buffer.from("ffd8ffe000104a464946", "hex"))).toBe("image/jpeg");
    expect(sniffType(Buffer.from("%PDF-1.7\n"))).toBe("application/pdf");
    expect(sniffType(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
  });
  it("never writes outside the upload folder", () => {
    expect(resolveUpload("../../etc/passwd")).toBeNull();
    expect(resolveUpload("blog/2026-10/../../x.png")).toBeNull();
    expect(resolveUpload("blog/2026-10/abc-123.png")).toMatch(/storage\/uploads\/blog\/2026-10\/abc-123\.png$/);
    expect(safeFolder("../Blog Images")).toBe("blogimages");
  });
});
