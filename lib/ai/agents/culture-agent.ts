import "server-only";
import { getCulturePrompt } from "../prompt";
import { applyGuardrail, cultureSchema, type Culture } from "../schema";
import { chatComplete } from "../llm";

export async function runCultureAgent(
  input: {
    destination: string;
    country: string;
  },
  traceId?: string
): Promise<Culture> {
  const text = await chatComplete(
    getCulturePrompt(input.destination, input.country),
    `Provide cultural information for ${input.destination}, ${input.country}.`,
    { agentName: "culture-agent", traceId }
  );

  return applyGuardrail(text, cultureSchema);
}
