import "server-only";
import { Agent, run, type InputGuardrail } from "@openai/agents";
import { z } from "zod";

const inputCheckAgent = new Agent({
  name: "Input Validator",
  instructions: `You validate travel trip requests. Set isValid to false if:
- The request is offensive, nonsensical, or clearly not about travel
- The travel start date (YYYY-MM-DD in the text) is clearly in the past relative to today
- The vibe and budget tier are blatantly contradictory (e.g. extreme luxury with zero budget)

Otherwise isValid is true. Keep reason short.`,
  outputType: z.object({
    isValid: z.boolean(),
    reason: z.string(),
  }),
  model: process.env.OPENAI_TRIP_MODEL_FAST ?? "gpt-5.4-mini",
});

export const tripInputGuardrail: InputGuardrail = {
  name: "Trip Input Guardrail",
  runInParallel: false,
  execute: async ({ input }) => {
    const result = await run(inputCheckAgent, String(input));
    return {
      outputInfo: result.finalOutput,
      tripwireTriggered: result.finalOutput?.isValid === false,
    };
  },
};
