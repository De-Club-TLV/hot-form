# Session Log

## Spend to date
- Sessions: 1
- Tokens (in / out / cache-read): 1,413 / 584,969 / 98,330,049
- Cost: $282.2930

---

## 2026-04-24

**Focus:** Wire Hot Form to Trigger.dev via Netlify Function so crew referrals actually land in the CRM.

**Done:**
- Added `netlify/functions/submit-lead.ts`: HMAC-verifies the raw body with `HOT_FORM_HMAC_SECRET` (new dedicated secret), adapts the crew-facing payload `{submitted_by, first_name, last_name, phone, email, notes}` into the shared lead-intake schema with `source_override: "HotForm"` (Monday source index 8), `type_override: "Organic"`, `added_by: submitted_by`, then forwards to `api.trigger.dev/api/v1/tasks/lead-intake/trigger`.
- Removed Netlify Forms capture from `index.html` (`data-netlify` + `form-name` hidden). Rewrote `script.js` to build JSON payload, canonicalize + HMAC-SHA256 sign via Web Crypto, POST to the function.
- `netlify.toml`: declare functions dir + esbuild bundler.
- Set env vars on hot-form Netlify site `bad8e4cf-...`: `HOT_FORM_HMAC_SECRET`, `TRIGGER_PROD_SECRET_KEY`. Pushed commit `cd8f471`, auto-deployed, smoke-tested end-to-end (created Contact + Lead in Monday with sourceIndex 8 / typeIndex 0 — both deleted after verification).

**Decisions:**
- Hot Form was sitting in Netlify Forms doing nothing. Reuse the existing `lead-intake` task rather than build a parallel `hot-lead-intake` task. The task already supported `source_override` + `added_by` + `notes`, so adaptation happens in the function — zero changes to the task.
- Dedicated HMAC secret (not shared with the main website). Browser-visible secrets rotate cleaner when scoped per form.

**Next:**
- Deactivate n8n Hot Form workflow `IkuwNw3d9sIq0Sas` after verification window (~1 week).

**Spend:** session spend logged in `General/SESSION_LOG.md` (cross-repo session: teacher-intake build + refactor + three form migrations).

---

## 2026-04-22

**Focus:** Ship the DeClub "Hot Form" — crew/teacher referral intake from zero to production, with full Monday/Trigger.dev/n8n pipeline.

**Done:**
- Scaffolded repo at `De-Club-TLV/hot-form` (public). Static single-page form, no framework.
- Built the form UI in DeClub brand: black bg, sage accent `#D1DCBD`, Figtree + IBM Plex Mono, pill submit, inline success that replaces the form.
- Added `intl-tel-input` v25 phone control (default 🇮🇱, country picker, E.164 + ISO captured), live phone + email validation, honeypot.
- Deployed on Netlify. Custom domain `hotform.declub.co.il` via DNS Made Easy (CNAME + TXT subdomain-owner-verification).
- Created n8n workflow **Hot Form** (`IkuwNw3d9sIq0Sas`): Netlify Forms webhook → Transform Payload (crew allowlist) → Trigger.dev `lead-intake` with `source_override: "HotForm"`, `type_override: "Organic"`, `added_by`, `notes`. Telegram alert on failure + routed to global Error Workflow.
- Extended Trigger.dev `lead-intake` (`General` repo): optional `source_override`/`type_override`/`added_by`/`notes`; new `createContact` param + `setContactAddedBy` helper. Added `contactAddedByColumnId` config (`dropdown_mky2kbcb`). Deployed to prod (v20260422.5).
- Ran end-to-end verification submission → contact + lead created with Source=Hot Form, Type=Organic, Added By=Yoni Katz. Test items deleted post-verify.
- Expanded Hot Form `submitted_by` dropdown from 9 crew → 9 crew + 20 teachers (deduped Rachel Rinberg and Nir Elior). Pre-seeded all 29 labels into Monday's `Added By` dropdown via throwaway contacts.
- CRM cleanup audit script (`scripts/audit-crm.ts`). Deleted 1 orphan lead ("Z") + 1 junk contact ("Madwriter"). Kept Gideon Tzaig (Client without phone) per review.

**Decisions:**
- Routed Netlify → n8n → Trigger.dev instead of Netlify Function → Trigger.dev, matching the website lead flow. n8n is the single audit/monitor surface for all lead intake.
- Used `create_labels_if_missing: true` + single-label writes to pre-populate the Monday dropdown (it's single-select — bulk writes were rejected).
- Scope rule saved to memory: **only touch NEW WORLD n8n workflows**, not legacy ones. Over-applied a global error handler across all 26 workflows then reverted to just Hot Form + Website Lead Gen.

**Next:**
- Build Teachers Onboarding web form combining the two Jotforms (`253331785543460` + `260455438340455`). Target dir: `Forms/Teachers Onboarding`.
- Decide Master Report n8n fix — disconnected `Email Report` Gmail node never fires. Wire it to `Get row(s)` or delete.
- (Optional) fill Gideon Tzaig's phone on the Contacts board.

**Spend:** $282.2930 this session · tokens in/out/cache-read: 1,413 / 584,969 / 98,330,049
