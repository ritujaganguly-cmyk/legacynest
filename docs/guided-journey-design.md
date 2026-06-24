# The Guided Journey — Post-Login Plan-Building Experience

## The real problem

After login, users face:
- A blank dashboard with a checklist of 10+ empty items
- 17 separate routes/forms to navigate independently
- No guidance on what to do first, or why
- No sense of progress or momentum
- No awareness that this is a multi-week effort, not a one-sitting task

The result: users feel overwhelmed, don't know where to start, leave without filling anything in.

---

## Core design principles

1. **Calm, not urgent.** This is a 7–10 day journey of 10–15 min sessions. Every screen should feel like a conversation, not a data-entry task.
2. **Always know where you are.** Clear overall progress + today's suggested focus.
3. **Never drop into a blank form.** Every section starts with "why this matters for your child" before asking for anything.
4. **Small wins, every session.** Each session ends with a visible milestone — the Banyan grows.
5. **Free exploration always available.** Power users can navigate directly to any section; the guide is an overlay, not a gate.
6. **Save and return gracefully.** Every partial entry is saved. Returning shows exactly where to continue.

---

## The mental model: a 7-chapter book

Each "chapter" is a self-contained section of the plan that can be completed in one or two sessions. Chapters are ordered by urgency and simplicity.

| Chapter | Name | Content | Time | Why first |
|---|---|---|---|---|
| 1 | **Your Child** | Child profile, disability, daily routine | 15 min | Foundation — everything else references this |
| 2 | **Your Family** | Parent profile, secondary caregiver | 10 min | Who is making this plan |
| 3 | **Emergency Plan** | Emergency contacts, 24-hour plan | 15 min | Most urgent — what if something happens now |
| 4 | **Care Circle** | Trusted network, succession caregivers | 15 min | Who will step in |
| 5 | **Medical Records** | Doctors, medications, therapies | 15 min | Core care knowledge |
| 6 | **Legal & Financial** | Will, trust, guardianship, assets, insurance | 20 min | Long-term protection |
| 7 | **Home & Future** | Residential options, vault documents | 15 min | Where they will live |

---

## Dashboard redesign (web-first)

### Layout
Two-column layout (sidebar + content), matching the existing app shell.

### Left panel — "Your Journey"
- **Banyan tree** at the top, growing as chapters complete (7 stages = 7 chapters)
- **Chapter list** — each chapter shows: icon, name, % filled, status pill (Not started / In progress / Complete)
- **"Continue"** button highlighted on the current in-progress chapter
- Overall completion % at the bottom

### Right panel — "Today's Focus"
When a chapter is in progress:
- Chapter name + why-it-matters paragraph (2–3 lines, warm, specific to special-needs parents)
- **Next 2–3 fields to fill** (not the whole form — just the next step)
- Estimated time remaining for this chapter
- "Keep going" CTA

When all done for the day (15 min used):
- "Great session" celebration
- What to do next time
- Summary of what was saved today

When nothing started:
- Welcome state with chapter 1 CTA

---

## In-section guided experience

When a user enters any section (e.g. `/medical`), the current experience is a full form. The new experience:

1. **Section header** — Icon + title + 1-sentence why-it-matters
2. **Progress bar** — "3 of 8 items complete"
3. **Field groups** — Fields grouped into logical clusters (e.g. "Appointments", "Medications", "Therapists") each collapsible
4. **Contextual prompts** — Beside each field: a small tip specific to special-needs families (e.g. "Include any UDID-linked therapists for government scheme continuity")
5. **Auto-save** — Every change saved on blur/change; a discreet "Saved" indicator
6. **Session nudge** — After ~12 minutes, a gentle "You've done great today. Save and continue tomorrow?" banner (dismissable)
7. **Section complete state** — When all required fields filled, show a mini-celebration and suggest the next chapter

---

## What changes in code

### New: `src/components/journey/`
- `JourneyPanel.tsx` — the chapter list sidebar component
- `ChapterCard.tsx` — individual chapter with progress + CTA
- `TodayFocus.tsx` — the right-panel guided focus component
- `SectionHeader.tsx` — replaces bare section titles with guided intros
- `SessionNudge.tsx` — the 12-minute gentle reminder
- `BanyanProgress.tsx` — 7-stage Banyan tied to chapter completion

### Modified: `src/routes/_app.dashboard.tsx`
- Replace the checklist+quick-access layout with the two-column Journey layout

### Modified: each `_app.*.tsx` section
- Add `SectionHeader` with contextual why-it-matters copy
- Add field-group collapsibles with progress tracking
- Add auto-save indicators
- Add session nudge

### New: `src/lib/journey.ts`
- Chapter definitions with required fields + completion logic
- Session time tracking (localStorage: session start time, fields touched)
- Progress computation across chapters

---

## Chapter completion logic

A chapter is "complete" when its **required fields** are filled. Optional fields don't gate completion.

| Chapter | Required fields | Optional |
|---|---|---|
| Your Child | name, disability_type, date_of_birth | photo, allergies, blood_group |
| Your Family | parent full_name, phone | occupation, health_status |
| Emergency Plan | emergency coordinator, first 24-hour plan | secondary contacts |
| Care Circle | at least 1 primary caregiver with contact | responsibilities detail |
| Medical Records | at least 1 doctor + 1 medication | all therapists, all contacts |
| Legal & Financial | will_status OR trust_status, at least 1 asset | all legal docs, all assets |
| Home & Future | at least 1 residential option | letter of intent, vault docs |

---

## Tone of voice (in-app copy)

Every section intro should be:
- Warm and specific to the parent's reality ("You are the expert on your child. This is where that knowledge becomes a plan.")
- Never clinical or form-like ("Enter the patient's diagnosis")
- Acknowledge the difficulty ("This one takes courage — but it's the most important gift you can give.")
- Time-honest ("This chapter takes about 15 minutes. You can stop and return anytime.")

---

## Open decision

**Session time tracking:** Should the 12-minute session nudge be:
A) Purely client-side (localStorage timer, no server knowledge of session time)
B) Server-side (track `session_started_at` in the profile table, show nudge based on server time)

Recommendation: **A — client-side only**. Simpler, no extra DB column, and session time is a UX convenience not a business metric. Can upgrade later.

---

## Build sequence

1. `src/lib/journey.ts` — chapter definitions + completion logic
2. `JourneyPanel` + `ChapterCard` components
3. `TodayFocus` component
4. Dashboard rebuild (two-column, journey-first)
5. `SectionHeader` + contextual copy for each of the 7 chapters
6. `SessionNudge` component
7. `BanyanProgress` tied to chapter completion
8. Auto-save indicator (reuse or wrap existing save patterns)
