Hi [Candidate Name],

Thanks for taking the time to interview today!

As we discussed, below is a simple coding challenge that we would like you to complete and return to me by email. The purpose of this challenge is so we can assess the way you approach a problem, the quality of your code and coding approach, and get an understanding of your eye for detail in the visual layout. As outlined, focus your attention on wowing / impressing me with the UI design and execution, as well as how you structure your interaction with AI.

Below is a brief spec for the challenge. It should be enough to get you started, but please let me know if any of it is unclear or you need further information.

The project is to build a Dream Destination Generator — a small web app where a user describes their ideal travel vibe, an AI agent generates structured data about a matching destination, and that data is used to generate a travel poster image and display everything as a beautiful destination card.

You must use Next.js (App Router) + TypeScript + Tailwind CSS to build the app, so we have a good assessment of your practical skills with our stack.

The app should have a simple form where the user enters a travel vibe description (freeform text), picks a travel style, season, and budget tier from dropdowns. This input gets sent to the Claude API (console.anthropic.com — Haiku is fine to keep costs low). The agent must return structured JSON output — not freeform text. You should design the prompt so Claude returns a JSON object covering at minimum: destination details (name, country, tagline, description), weather, a multi-day itinerary, local insider tips (a phrase in the local language, must-try dishes), an image generation prompt, and a colour palette. You are free to add fields if you think they improve the output.

Take the image prompt from the JSON and generate a travel poster using any image generation API — fal.ai (FLUX models, free tier), Leonardo.ai (generous free daily credits), Replicate, Stability AI, or DALL-E all work. If you'd rather not set up image generation you can use a placeholder approach, but this will be noted.

The display is where you should really shine. Render the structured JSON and poster into a beautiful destination card layout — think premium travel magazine spread. The poster as a hero element, strong typography on the destination name, the itinerary as a polished timeline, the insider tips as an engaging callout, and the colour palette actually theming the page. The app must be responsive for both desktop and mobile.

We expect unit tests for the key parts of your app using Vitest or Jest — at minimum covering your JSON parsing/validation logic (what happens when the AI returns garbage?), any data transformation utilities, and at least a couple of component rendering tests. You don't need 100% coverage — we want to see that you think about edge cases and write testable code.

Bonus points for: a polished loading state, the ability to regenerate just the image or text independently, a saved trips panel (in-memory is fine), dark mode, SSE streaming for status updates, or Playwright E2E tests.

Bonus — Claude Code

We use Claude Code extensively in our workflow. This is entirely optional, but if you have access or want to try it, we'd love to see how you use it to build this challenge.

Install: npm install -g @anthropic-ai/claude-code
Docs: code.claude.com/docs
Skills (built-in slash commands): code.claude.com/docs/en/skills
Official plugins: claude.com/plugins — specifically check out the Superpowers plugin
Playwright MCP for E2E testing: claude mcp add playwright npx @playwright/mcp@latest (docs | GitHub)

If you use Claude Code, include a short "Claude Code Usage" section in your README describing your experience — what you used, what helped, what didn't. We value honesty over perfection.

What We're Evaluating
Problem decomposition — how you break the spec into tasks and handle ambiguity
AI integration — prompt design, structured output handling, error recovery
Code quality — TypeScript, component structure, separation of concerns
Testing — edge case thinking, testable architecture
UI/UX design — visual polish, typography, responsiveness, attention to detail
Communication — README quality, setup instructions, documented decisions

Claude Code usage (bonus) — how effectively you use AI-assisted dev tools

Submission

There is no time limit for the challenge per se, but ideally we could have it by Monday morning to review. Please do it at your own pace, but please let me know how long you spent on it — I would recommend no more than 1 day.

When you have completed the challenge, please push it to a public GitHub repo with a README covering setup instructions, your design decisions, and time spent. Optionally deploy it (Vercel free tier works great). Send through the repo link (and live URL if deployed).

Look forward to hearing back from you.

Kind Regards,
[Your Name]





