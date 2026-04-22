# Hot Form

## Project
A single-page web form for **DeClub** to collect referrals and hot leads from the crew. Deployed on **Netlify**.

## Stack
- Plain HTML / CSS / vanilla JS (no framework)
- Netlify for hosting + deploy
- Netlify Forms (or a custom webhook endpoint) for form submissions — TBD

## Commands
- **Run locally**: open `index.html` in a browser, or `npx serve .` for a local dev server
- **Deploy**: push to `main` — Netlify auto-deploys from the connected GitHub repo

## Conventions
- Keep the page self-contained and lightweight
- No build step unless genuinely required
- Match DeClub's brand language (ask Yuval for the style guide when designing)

## Agents Policy
Project-specific agents live in `.claude/agents/`. **New agents require Yuval's approval.** Only create one when the task genuinely needs something Dasha's general agents don't cover.
