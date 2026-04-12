import "server-only";
import { z } from "zod";
import { geocodeLocation } from "../tools/geocoder";
import { getDestinationAgentPrompt } from "../prompt";
import { applyGuardrail, multiDestinationSchema, getBudgetRangeString, type Destination } from "../schema";
import { chatCompleteWithTools, type ToolDef } from "../llm";

export async function runDestinationAgent(
  input: {
    vibe: string;
    travelStyle: string;
    season: string;
    budget: string;
  },
  traceId?: string,
  onToolCall?: (event: { tool: string; input: Record<string, unknown>; output: string }) => void
): Promise<Destination[]> {
  const tools: ToolDef[] = [
    {
      name: "geocode_location",
      description:
        "Geocode a location name to get coordinates. Use this to verify a destination exists.",
      schema: z.object({
        query: z.string().describe("Location name, e.g. 'Santorini, Greece'"),
      }),
      run: async ({ query }) => {
        const result = await geocodeLocation(query);
        return JSON.stringify(result);
      },
    },
  ];

  const budgetRange = getBudgetRangeString(input.budget);

  const text = await chatCompleteWithTools(
    getDestinationAgentPrompt(budgetRange),
    `Find destinations for: Vibe: "${input.vibe}", Style: ${input.travelStyle}, Season: ${input.season}, Budget: ${budgetRange}`,
    tools,
    { agentName: "destination-agent", traceId, onToolCall }
  );

  return applyGuardrail(text, multiDestinationSchema);
}
