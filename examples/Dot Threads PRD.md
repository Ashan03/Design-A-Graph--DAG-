**dot.threads v1 — Product Requirements Document (PRD)**

## **Executive summary**

dot.threads turns flat bookmarks into an **interactive map of meaning**. For regular web users who save links daily, v1 delivers: **one-click capture**, **lightweight categorization**, and a **graph view** that makes refinding and exploring related items fast and intuitive.

## **Product vision**

* Make saving effortless.

* Make relationships between saved items visible and useful.

* Make refinding faster than ctrl/cmd-F and folder hunting.

* Make sharing collections clear and explorable (not a wall of links).

## **Target users & personas (primary first)**

* **Everyday Medium Saver (Primary):** Saves a few links daily; won’t maintain tags/folders; wants quick refind and simple sharing.

* **Visual Curator (Secondary):** Designers/students collecting mixed media for inspiration; wants to see connections.

* **Cross-tool Hunter (Secondary):** Juggles browser bookmarks, Drive, Notion; often forgets “which tool.”

## **Problem statement**

Users save items across tools, then struggle to refind and make sense of them. Linear lists don’t scale; context and relationships get lost; sharing is messy.

## **Solution overview**

* **Right-click capture** (Chrome/Chromium first).

* **DOT creation popup**: auto title/URL; optional multi-type categories; quick “connect to” suggestions (recent tabs \+ similar items).

* **Graph home view**: center map; left DOT card; right “trails” (primary/secondary/tertiary) \+ mini-map.

* **Shareable map**: read-only link up to tertiary connections; recipients can browse or save to their own dots.

## **Success metrics (v1)**

* **North Star:** Weekly Successful Refinds (WSR) per active user.

* **Input metrics:**

  * Median time-to-save ≤ 5s; ≤ 2 interactions.

  * Median refind time ≤ 15s for a known item.

  * ≥ 70% of DOTs have ≥ 1 connection after 7 days (“connectedness ratio”).

  * ≥ 40% 4-week retention (WAU).

---

## **Feature requirements (with acceptance criteria & priority)**

| ID | Feature | Requirement | Acceptance criteria (testable) | Priority |
| ----- | ----- | ----- | ----- | ----- |
| **F1** | Right-click capture | Add context-menu “Add to dot.threads” on any page | On click, popup opens ≤300ms with page title \+ URL prefilled | P0 |
| **F2** | DOT creation popup | Fields: Title (editable), URL (locked link), Types (multi-select \+ create-new), Connect (multi-select suggestions: 5 most recent tabs \+ 5 similar host/title) | Save completes ≤500ms; keyboard-only completion; creating a new Type works inline | P0 |
| **F3** | Auto-suggest connections | Suggest related nodes from “recent tabs” (last 24h) and “similar host/title” (local index) | At least 1 suggestion appears for ≥70% of saves in test corpus | P0 |
| **F4** | Graph home view | Center canvas rendering nodes & threads; zoom/pan; focus mode on selected node | 200 nodes render ≥30fps on mid-range laptop; focus toggles ≤100ms | P0 |
| **F5** | DOT detail panel (left) | Show title, favicon/preview, types, notes (plain text), copy link, share | Editing title/types/notes persists in ≤300ms; copy link copies URL | P0 |
| **F6** | Trails panel \+ mini-map (right) | Lists primary, secondary, tertiary links; mini overview with viewport box | Collapsing/expanding tiers updates list ≤100ms; mini-map pans to focused node | P1 |
| **F7** | Search & filter | Header search (title/URL); filter by Type | Search results shown ≤200ms on 1k items; filter chips toggle instantly | P1 |
| **F8** | Shareable map | Create read-only share link limited to selected node \+ up to tertiary | Share link opens without login; recipients can browse \+ “Save to my dots” | P1 |

**Out of scope (v1):** citation formatting; multi-user editing; mobile app; automatic trail capture; cloud sync (optional later).

---

## **Non-functional requirements**

* **Performance:** 200 nodes at ≥30fps; key UI actions ≤300ms perceived latency.

* **Reliability:** Local data persisted (IndexedDB); recover from extension reloads.

* **Privacy:** Only capture data on explicit user action; no background history logging in v1.

* **Security:** Share links scoped; no PII in public links; content scripts sandboxed.

* **Accessibility:** Keyboard navigation for popup & graph; color contrast meets WCAG AA; focus indicators.

## **Constraints & dependencies**

* **Platform:** Chrome/Chromium extension (works in Arc).

* **Libraries:** Graph rendering (e.g., Cytoscape.js / D3); local storage (IndexedDB).

* **Permissions:** `contextMenus`, `activeTab`, `storage`; content scripts for title/URL.

* **Preview assets:** Favicon/OpenGraph parsing (best-effort).

* **Data model:** Local-first graph (Nodes, Types, Edges); optional export (JSON).

## **Release plan & milestones (proposed)**

* **M0 — PRD sign-off (Oct 10, 2025\)**: PRD, wireframes, tech spike on graph lib.

* **M1 — Alpha (Nov 07, 2025\)**: F1–F5 complete; local graph; basic search; internal dogfood.

* **M2 — Beta (Dec 05, 2025\)**: F6–F8; share links; onboarding; metrics; closed testers (15–25).

* **GA — v1 (Jan 16, 2026\)**: Perf pass, bug fixes, docs, landing page.

## **Open questions**

* Do we allow **import** from browser bookmarks/Pocket (v1 or vNext)?

* Do we support **file drops** (images/PDF) or links-only in v1?

* Share scope: entire map around node or fixed **N-hop** depth only (defaults to 2 or 3)?

* Notes format: plain text only or lightweight markdown?

* Data export format(s): JSON only vs. CSV/HTML too?

* Opt-in **anonymous telemetry** for metrics?

---

## **Traceability — needs → requirements → features**

**User need statements (N):**

* **N1 Save quickly** without setup.

* **N2 See relationships** between saved items.

* **N3 Refind fast** with minimal hunting.

* **N4 Scale gracefully** beyond linear lists.

* **N5 Share clearly** with others.

**Requirements (R):**

* **R1** Context-menu capture (save in ≤5s).

* **R2** DOT creation with types & quick connect.

* **R3** Graph as home with focus & trails.

* **R4** Search/filter for refind.

* **R5** Shareable read-only map.

* **R6** Performance/privacy baselines.

**Mapping**

| Feature | Satisfies Requirements | Addresses Needs |
| ----- | ----- | ----- |
| F1 Right-click capture | R1 | N1 |
| F2 DOT popup | R2 | N1, N2 |
| F3 Auto-suggest connect | R2 | N2, N3 |
| F4 Graph home | R3 | N2, N4 |
| F5 DOT detail | R3 | N2 |
| F6 Trails \+ mini-map | R3 | N2, N4 |
| F7 Search & filter | R4 | N3 |
| F8 Shareable map | R5 | N5 |
| NFRs (perf/privacy/a11y) | R6 | N1–N5 (enablers) |

---

## **Appendices**

* **Design principles:** fast capture; minimal ceremony; map first; lightweight semantics (Types, not heavy tags); privacy by default.

* **Instrumentation plan:** log save/abort; time-to-save; refind task timers; node degree; share link opens; opt-in only.

---

## **Risks & mitigations**

* **RISK 1 (Adoption):** Map may feel complex to casual users.

  * *Mitigation:* Keep capture friction near zero; auto-suggest connections; simple defaults.

* **RISK 2 (Performance):** Large graphs stutter.

  * *Mitigation:* Progressive rendering; cap visible edges; level-of-detail on zoom.

* **RISK 3 (Retention):** Users revert to native bookmarks.

  * *Mitigation:* Demonstrate faster refind; import starter set; keyboard shortcuts.

* **RISK 4 (Privacy perception):** Fear of history tracking.

  * *Mitigation:* Explicit action-only capture; clear permissions copy; local-first storage.

* **RISK 5 (Share confusion):** Recipients unsure what they see.

  * *Mitigation:* Read-only legend; hop depth label; “Save to my dots” CTA.

---

# **PRD quality gate (red-team review)**

## **Ambiguities / missing decisions**

* **Import scope** (bookmarks/Pocket) not decided → affects early value.

* **File support** (links-only vs. files) unclear → impacts storage/UI.

* **Share hop depth** default unspecified → UX inconsistency in shared maps.

* **Notes format** (plain vs. markdown) undecided → editing & rendering differences.

* **Telemetry** opt-in details unspecified → metrics feasibility.

## **Risky assumptions**

* Users will understand graph metaphors without onboarding.

* 200 nodes at ≥30fps with chosen library on mid-range devices.

* Auto-suggest will be accurate enough with only local heuristics.

* Shareable maps won’t leak sensitive context (even with tertiary links).

## **Scope-tightening edits (make criteria testable)**

* **F1:** “Popup opens ≤300ms” → specify target device class and network conditions (local only).

* **F3:** Define similarity heuristic (same host OR trigram title similarity ≥0.3). Success measured on seeded test set.

* **F4:** Define “mid-range laptop” spec (e.g., 8GB RAM, 4-core CPU, integrated GPU).

* **F6:** Cap visible tiers in Trails (default collapsed beyond secondary; tertiary behind click).

* **F8:** Share depth default \= **2 hops** with explicit label (“Showing up to 2 hops”). Disable external links for private nodes in v1.

## **Acceptance criteria hardening**

* Add **instrumented timers** for time-to-save and refind; acceptance passes when p50 meets thresholds on 20-user beta.

* Add **a11y checks**: keyboard E2E test for capture → save → open in map; axe-core pass for contrast & roles.

* Add **privacy assertion tests**: no network calls on save unless user shares; console shows zero blocked calls in offline mode.

* Add **performance budget**: main thread long tasks \< 50ms p95 during map interactions (profiling trace).

