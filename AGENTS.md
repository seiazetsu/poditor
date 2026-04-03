# AGENTS.md

# Project: Poditor

Poditor is a web application for creating, editing, managing, and reviewing podcast scripts.

This project is intended to be developed incrementally with AI assistance.
The AI must always follow this file, as well as the requirement and specification documents.

---

## 1. Mandatory Reading Order

Before starting any implementation task, ALWAYS read in this order:

1. `AGENTS.md`
2. `docs/requirements.md`
3. `docs/spec.md`

If there is any contradiction, follow this priority order:

1. `AGENTS.md`
2. `docs/spec.md`
3. `docs/requirements.md`

If something is unclear, do not make broad assumptions. State the uncertainty clearly and propose the smallest safe implementation.

When requirements or specifications change during development, update the following documents as part of the task unless explicitly told not to:

1. `AGENTS.md` when project-wide working rules or implementation policy changed
2. `docs/requirements.md` when product requirements changed
3. `docs/spec.md` when screen behavior, data model, or detailed implementation-facing specifications changed

---

## 2. Project Goal

Build a podcast script editor that allows users to:

- sign in securely
- create and manage multiple scripts
- define multiple speakers for each script
- write lines for each speaker
- visually distinguish speakers by color
- use the script during recording as a practical reference tool
- attach images or videos inside the body of the script as reference material

The application should prioritize readability, maintainability, and incremental delivery.

---

## 3. Tech Stack

Use the following stack unless explicitly instructed otherwise:

- Next.js
- App Router
- TypeScript
- Chakra UI
- Firebase Authentication
- Firestore
- Vercel

Do not introduce unnecessary frameworks or libraries.

---

## 4. Architectural Rules

- Use `app/` routing with Next.js App Router
- Keep code modular and easy to review
- Separate UI, domain logic, and Firebase logic
- Prefer simple and maintainable structures over abstraction-heavy designs

Recommended directories:

- `app/` for pages, layouts, route handlers
- `components/` for reusable UI components
- `features/` for feature-specific UI and logic
- `lib/firebase/` for Firebase initialization and helpers
- `hooks/` for custom React hooks
- `types/` for shared TypeScript types
- `docs/` for requirements and specifications

---

## 5. UI and UX Rules

- The default UI language must be Japanese
- Use Chakra UI for UI implementation
- Do not use Tailwind CSS
- Do not add another component framework
- Prioritize readability and operability over flashy design

Script editor UI must support:

- multiple speakers
- color distinction per speaker
- easy-to-scan line layout
- practical usability during recording
- inline display of inserted media references

When in doubt, optimize for a user looking at the screen while recording a podcast.

---

## 6. Authentication Rules

Authentication is part of the core scope.

Implement login functionality using Firebase Authentication.

Initial supported login methods:

- Email and password

Optional methods such as Google login must not be added unless explicitly requested.

Authentication requirements:

- users must be able to sign up
- users must be able to sign in
- users must be able to sign out
- unauthenticated users must not access authenticated script management pages

---

## 7. Firebase Rules

Use Firebase v9 modular SDK.

Rules:

- Never hardcode secrets
- Never commit service account JSON
- Never commit production secrets
- Use environment variables for Firebase configuration
- Keep Firebase client initialization separate from server/admin logic

Suggested files:

- `lib/firebase/client.ts`
- `lib/firebase/auth.ts`
- `lib/firebase/firestore.ts`

If Firebase Admin SDK becomes necessary later, add it separately and safely.

---

## 8. Firestore Data Design Rules

Design Firestore data structures to be:

- simple
- scalable
- query-friendly
- easy to understand during review

Avoid overly deep nesting unless there is a clear reason.

Current principle:

- top-level collection for projects
- `projects/{projectId}/members` for project participants
- `projects/{projectId}/scripts` for scripts in a project
- `projects/{projectId}/scripts/{scriptId}/speakers` for speakers
- `projects/{projectId}/scripts/{scriptId}/items` for section, dialogue, and media items

Prefer practical implementation over theoretical perfection.

---

## 9. Security Rules

Assume the application is publicly accessible.

Therefore:

- validate all user inputs
- do not trust client input
- design with Firestore security rules in mind
- avoid exposing data from one user to another
- scope project and script data to users participating in the target project

---

## 10. TypeScript Rules

- Use strict TypeScript
- Avoid `any`
- Prefer clear interfaces and type aliases
- Keep types in shared files when reused
- Make nullable states explicit

---

## 11. Coding Rules

- Keep components small and focused
- Prefer readable names
- Avoid unnecessary indirection
- Avoid large files when reasonable splitting improves clarity
- Do not refactor unrelated areas during a focused task
- Minimize diff size where possible
- Preserve existing project conventions

---

## 12. Delivery Rules

For each requested task:

1. Briefly summarize the implementation plan before major changes
2. Implement only the requested logical unit
3. Keep changes reviewable
4. After implementation, report:
   - what was changed
   - which files were changed
   - assumptions made
   - known risks or follow-up items

---

## 13. Quality Gates

Before considering a task complete, ALWAYS run:

- `npm run lint`
- `npm run build`

If tests exist, run relevant tests too.

Do not leave known lint or build failures unresolved.
If known pre-existing failures remain outside the changed scope, state them clearly in the report.

---

## 14. Forbidden Actions

Do NOT:

- add Tailwind CSS
- add unrelated dependencies
- commit secrets
- skip authentication protection for protected pages
- implement broad speculative features not requested
- rewrite the whole project when only a local change is needed

---

## 15. Preferred Initial Implementation Order

Unless otherwise instructed, the preferred order is:

1. project initialization
2. Chakra UI setup
3. Firebase environment setup
4. authentication implementation
5. script data model
6. script list page
7. script creation flow
8. script detail/editor page
9. speaker management UI
10. media reference insertion UI

---

## 16. Review Mindset

All work should be optimized for human review.

That means:

- small commits
- clear naming
- low surprise
- explicit assumptions
- minimal hidden behavior

---

## 17. If Uncertain

If there is uncertainty:

- do not silently guess large product decisions
- explain the uncertainty
- make the narrowest safe implementation choice
- leave clear notes for follow-up

---

# End of file
