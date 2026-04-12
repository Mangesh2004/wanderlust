import "server-only";
import { z } from "zod";
import Langfuse from "langfuse";

// ============================================================
// SWAP PROVIDER HERE — change this one line for production
// ============================================================
const PROVIDER: "openai" | "anthropic" =
  (process.env.LLM_PROVIDER as "openai" | "anthropic") || "openai";

const MODELS = {
  openai: process.env.OPENAI_MODEL || "gpt-4o-mini",
  anthropic: "claude-haiku-4-5",
};

// ---------- Langfuse tracing ----------
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
});

const TRACING_ENABLED = !!(
  process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
);

// ---------- Tool definition (provider-agnostic) ----------
export interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  run: (args: any) => Promise<string>;
}

// ---------- Public API ----------

/** Simple chat completion — no tools */
export async function chatComplete(
  system: string,
  userMessage: string,
  options?: { agentName?: string; traceId?: string }
): Promise<string> {
  const agentName = options?.agentName || "chat";
  const model = MODELS[PROVIDER];

  // Create trace/generation for observability
  const trace = TRACING_ENABLED
    ? langfuse.trace({
        name: agentName,
        input: { system: system.slice(0, 200), userMessage },
        metadata: { provider: PROVIDER, model },
        ...(options?.traceId ? { id: options.traceId } : {}),
      })
    : null;

  const generation = trace?.generation({
    name: `${agentName}-llm`,
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
  });

  try {
    let result: string;
    if (PROVIDER === "openai") {
      result = await openaiChat(system, userMessage);
    } else {
      result = await anthropicChat(system, userMessage);
    }

    generation?.end({ output: result });
    trace?.update({ output: { result: result.slice(0, 500) } });
    if (TRACING_ENABLED) await langfuse.flushAsync();

    return result;
  } catch (err) {
    generation?.end({
      output: `Error: ${err instanceof Error ? err.message : "unknown"}`,
      level: "ERROR",
    });
    if (TRACING_ENABLED) await langfuse.flushAsync();
    throw err;
  }
}

/** Chat completion with tools — handles the tool loop automatically */
export async function chatCompleteWithTools(
  system: string,
  userMessage: string,
  tools: ToolDef[],
  options?: {
    agentName?: string;
    traceId?: string;
    onToolCall?: (event: { tool: string; input: Record<string, unknown>; output: string }) => void;
  }
): Promise<string> {
  const agentName = options?.agentName || "agent";
  const model = MODELS[PROVIDER];

  const trace = TRACING_ENABLED
    ? langfuse.trace({
        name: agentName,
        input: { system: system.slice(0, 200), userMessage },
        metadata: {
          provider: PROVIDER,
          model,
          tools: tools.map((t) => t.name),
        },
        ...(options?.traceId ? { id: options.traceId } : {}),
      })
    : null;

  try {
    let result: string;
    if (PROVIDER === "openai") {
      result = await openaiToolLoop(system, userMessage, tools, trace, options?.onToolCall);
    } else {
      result = await anthropicToolLoop(system, userMessage, tools, trace, options?.onToolCall);
    }

    trace?.update({ output: { result: result.slice(0, 500) } });
    if (TRACING_ENABLED) await langfuse.flushAsync();

    return result;
  } catch (err) {
    trace?.update({
      output: { error: err instanceof Error ? err.message : "unknown" },
    });
    if (TRACING_ENABLED) await langfuse.flushAsync();
    throw err;
  }
}

// ============================================================
// OpenAI implementation
// ============================================================

async function getOpenAIClient() {
  const { default: OpenAI } = await import("openai");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function zodToJsonSchema(schema: z.ZodObject<any>): Record<string, unknown> {
  const shape = schema.shape;
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodType;
    properties[key] = zodFieldToJson(zodType);
    if (!isOptional(zodType)) required.push(key);
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function zodFieldToJson(field: z.ZodType): Record<string, unknown> {
  if (field instanceof z.ZodOptional || field instanceof z.ZodNullable) {
    return zodFieldToJson((field as any)._def.innerType);
  }
  if (field instanceof z.ZodString) return { type: "string" };
  if (field instanceof z.ZodNumber) return { type: "number" };
  if (field instanceof z.ZodBoolean) return { type: "boolean" };
  if (field instanceof z.ZodEnum)
    return { type: "string", enum: (field as any)._def.values };
  if (field instanceof z.ZodArray)
    return { type: "array", items: zodFieldToJson((field as any)._def.type) };
  if (field instanceof z.ZodObject) return zodToJsonSchema(field as any);
  return { type: "string" };
}

function isOptional(field: z.ZodType): boolean {
  return field instanceof z.ZodOptional || field instanceof z.ZodNullable;
}

async function openaiChat(
  system: string,
  userMessage: string
): Promise<string> {
  const client = await getOpenAIClient();
  const response = await client.chat.completions.create({
    model: MODELS.openai,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content || "";
}

async function openaiToolLoop(
  system: string,
  userMessage: string,
  tools: ToolDef[],
  trace?: any,
  onToolCall?: (event: { tool: string; input: Record<string, unknown>; output: string }) => void
): Promise<string> {
  const client = await getOpenAIClient();

  const openaiTools = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: zodToJsonSchema(t.schema),
    },
  }));

  const toolMap = new Map(tools.map((t) => [t.name, t]));

  const messages: any[] = [
    { role: "system", content: system },
    { role: "user", content: userMessage },
  ];

  let iteration = 0;

  for (let i = 0; i < 10; i++) {
    iteration++;

    // Trace each LLM call as a generation
    const generation = trace?.generation({
      name: `llm-call-${iteration}`,
      model: MODELS.openai,
      input: messages.slice(-5), // last 5 messages for readability
    });

    const response = await client.chat.completions.create({
      model: MODELS.openai,
      messages,
      tools: openaiTools,
      max_tokens: 4096,
    });

    const choice = response.choices[0];
    messages.push(choice.message);

    generation?.end({
      output: choice.message.content || "(tool_calls)",
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
    });

    if (choice.finish_reason === "stop" || !choice.message.tool_calls?.length) {
      return choice.message.content || "";
    }

    // Execute and trace tool calls
    for (const toolCall of choice.message.tool_calls) {
      if (toolCall.type !== "function") continue;
      const fnCall = toolCall as { id: string; type: "function"; function: { name: string; arguments: string } };
      const tool = toolMap.get(fnCall.function.name);

      const toolSpan = trace?.span({
        name: `tool:${fnCall.function.name}`,
        input: JSON.parse(fnCall.function.arguments),
      });

      let result: string;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(fnCall.function.arguments);
        result = tool ? await tool.run(args) : "Tool not found";
        toolSpan?.end({ output: result.slice(0, 1000) });
      } catch (err) {
        result = `Error: ${err instanceof Error ? err.message : "unknown"}`;
        toolSpan?.end({ output: result, level: "ERROR" });
      }

      onToolCall?.({ tool: fnCall.function.name, input: args, output: result });

      messages.push({
        role: "tool",
        tool_call_id: fnCall.id,
        content: result,
      });
    }
  }

  const lastAssistant = messages
    .filter((m: any) => m.role === "assistant")
    .pop();
  return lastAssistant?.content || "";
}

// ============================================================
// Anthropic implementation
// ============================================================

async function getAnthropicClient() {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic();
}

async function anthropicChat(
  system: string,
  userMessage: string
): Promise<string> {
  const client = await getAnthropicClient();
  const response = await client.messages.create({
    model: MODELS.anthropic,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b: any) => b.type === "text");
  return textBlock ? (textBlock as any).text : "";
}

async function anthropicToolLoop(
  system: string,
  userMessage: string,
  tools: ToolDef[],
  trace?: any,
  onToolCall?: (event: { tool: string; input: Record<string, unknown>; output: string }) => void
): Promise<string> {
  const { betaZodTool } = await import("@anthropic-ai/sdk/helpers/beta/zod");
  const client = await getAnthropicClient();

  // Wrap tool.run with tracing + onToolCall callback
  const tracedTools = tools.map((t) =>
    betaZodTool({
      name: t.name,
      description: t.description,
      inputSchema: t.schema,
      run: async (args: any) => {
        const toolSpan = trace?.span({
          name: `tool:${t.name}`,
          input: args,
        });
        try {
          const result = await t.run(args);
          toolSpan?.end({ output: result.slice(0, 1000) });
          onToolCall?.({ tool: t.name, input: args, output: result });
          return result;
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : "unknown error";
          toolSpan?.end({ output: errMsg, level: "ERROR" });
          onToolCall?.({ tool: t.name, input: args, output: `Error: ${errMsg}` });
          throw err;
        }
      },
    })
  );

  const generation = trace?.generation({
    name: "llm-call",
    model: MODELS.anthropic,
    input: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
  });

  const finalMessage = await client.beta.messages.toolRunner({
    model: MODELS.anthropic,
    max_tokens: 4096,
    tools: tracedTools,
    messages: [{ role: "user", content: userMessage }],
    system,
  });

  const textBlock = finalMessage.content.find((b: any) => b.type === "text");
  const result = textBlock ? (textBlock as any).text : "";

  generation?.end({
    output: result,
    usage: {
      promptTokens: finalMessage.usage?.input_tokens,
      completionTokens: finalMessage.usage?.output_tokens,
    },
  });

  return result;
}
