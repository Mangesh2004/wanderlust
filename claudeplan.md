
---

## What The Client Actually Wants

This is a **take-home coding challenge** to evaluate you as a frontend-heavy full-stack developer. Let me break down the real priorities based on how they've worded things:

**Priority 1 — UI/UX Design (this is where they said "wow me")**
They literally said "focus your attention on wowing / impressing me with the UI design and execution." They want a **premium travel magazine spread** aesthetic — not a generic Bootstrap card. Think Lonely Planet editorial layouts, not a dashboard.

**Priority 2 — AI Integration Quality**
Not just "call the API" — they want to see your **prompt engineering** skills. The Claude response must be **structured JSON** (not freeform text parsed with regex). They want to see how you handle the schema design, validation, and error recovery when AI returns garbage.

**Priority 3 — Code Quality & Testing**
TypeScript strictness, clean component separation, Vitest/Jest tests that cover edge cases (malformed JSON, missing fields, API failures). They're not asking for 100% coverage — they want to see you *think* about what can break.

**Priority 4 — Communication**
README with setup instructions, design decisions, time spent. This matters more than people think.

**Bonus (but will differentiate you):** Claude Code usage, SSE streaming, dark mode, saved trips, regenerate image/text independently, Playwright E2E.

---

## The Architecture at a Glance

```
User Input Form → Next.js API Route → Claude API (Haiku, structured JSON)
                                          ↓
                                   Parse & Validate JSON
                                          ↓
                              Extract image prompt → Image Gen API (fal.ai/FLUX)
                                          ↓
                              Render Destination Card (poster + data)
```

The JSON schema Claude should return needs at minimum: destination details, weather, multi-day itinerary, insider tips (local phrase + dishes), image generation prompt, and a color palette that actually themes the page dynamically.

---

## Reference Sites & Apps to Study

**AI Travel Generators (functional inspiration):**
- **tripplanner.ai** / **layla.ai** — The gold standard for AI trip planners. Study how they present itineraries and the input flow
- **mindtrip.ai** — Great "vibe-based" discovery UX, very close to what your app does conceptually
- **wonderplan.ai** — Clean itinerary output with PDF export, good reference for structured display

**UI/Design References (visual inspiration):**
- **Dribbble** — Search "destination card", "travel card", "travel landing page" — designers like **Korsa Team** and **Awsmd Team** have phenomenal travel UI shots (see dribbble.com/tags/destination and dribbble.com/tags/travel-card)
- **Virtuoso.com** — Luxury travel site with that editorial magazine feel the client is asking for
- **Travel Noire** — Modern editorial + moody photography vibe
- **Lonely Planet website** — The benchmark for combining rich imagery with destination info
- **Justinmind card UI examples** (justinmind.com/ui-design/cards) — Great breakdown of how travel destination cards work in practice

**Travel Poster Style (for the AI-generated image):**
- Vintage travel poster aesthetic works really well with FLUX models — bold colors, simplified landscapes, strong typography overlay
- fal.ai with FLUX Schnell or FLUX Pro is free tier and produces excellent poster-style images

**GitHub Reference:**
- **jyoung10078/travel-consultant-claude** — A React + Anthropic API travel app, similar concept but much simpler. Study the API integration pattern, then massively outdo the UI.

---

## Key Design Decisions to Make Now

1. **Image API:** Go with **fal.ai (FLUX)** — free tier, fast, great quality. Don't skip image gen, they'll note it.

2. **Color palette theming:** Claude returns hex colors → use CSS custom properties to dynamically theme the entire card. This is the kind of detail that will impress.

3. **Itinerary display:** Don't just list days. Build a proper vertical timeline component with icons, time indicators, and activity cards. Think premium, not bullet points.

4. **Loading state:** This is a "bonus" but really it's expected. Use skeleton screens or a multi-step progress indicator ("Dreaming up your destination... Painting your poster... Packing your bags...").

5. **Mobile-first:** They explicitly called out responsive. Design mobile layout first, then expand.

6. **Testing:** Create a `parseDestinationResponse` utility with Zod validation. Test it with valid JSON, malformed JSON, missing fields, extra fields. That's your core test file.

Want me to help you plan the actual implementation — like the folder structure, JSON schema design, or start building components?