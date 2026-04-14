const DEBUG_TOOL_OUTPUT_MAX = 12_000;

export function sanitizeToolOutputString(output: string): string {
  if (output.startsWith("data:")) {
    return `[redacted data URL, ${output.length} chars]`;
  }
  if (output.length > DEBUG_TOOL_OUTPUT_MAX) {
    return (
      output.slice(0, DEBUG_TOOL_OUTPUT_MAX) +
      `\n… [truncated, ${output.length} chars total]`
    );
  }
  return output;
}

/** Redact huge data URLs in nested JSON-safe structures for debug SSE payloads. */
export function sanitizeForDebugJson(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.startsWith("data:")) {
      return `[redacted data URL, ${value.length} chars]`;
    }
    if (value.length > DEBUG_TOOL_OUTPUT_MAX) {
      return (
        value.slice(0, DEBUG_TOOL_OUTPUT_MAX) +
        `… [truncated, ${value.length} chars]`
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeForDebugJson);
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = sanitizeForDebugJson(v) as unknown;
    }
    return out;
  }
  return value;
}
