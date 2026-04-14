import {
  sanitizeForDebugJson,
  sanitizeToolOutputString,
} from "@/lib/trip/debug-sanitize";

describe("sanitizeToolOutputString", () => {
  it("redacts data URLs", () => {
    const raw = "data:image/png;base64,AAAA";
    expect(sanitizeToolOutputString(raw)).toBe(
      `[redacted data URL, ${raw.length} chars]`,
    );
  });

  it("truncates very long strings", () => {
    const long = "x".repeat(20_000);
    const out = sanitizeToolOutputString(long);
    expect(out.length).toBeLessThan(long.length);
    expect(out).toContain("truncated");
  });
});

describe("sanitizeForDebugJson", () => {
  it("redacts nested data URLs and preserves structure", () => {
    const dataUrl = "data:image/png;base64,QUJD";
    const input = {
      name: "Test",
      imageDataUrl: dataUrl,
      nested: { a: 1 },
    };
    const out = sanitizeForDebugJson(input) as Record<string, unknown>;
    expect(out.name).toBe("Test");
    expect(out.imageDataUrl).toBe(
      `[redacted data URL, ${dataUrl.length} chars]`,
    );
    expect((out.nested as Record<string, unknown>).a).toBe(1);
  });
});
