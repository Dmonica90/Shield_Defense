# SCORM 2004 Content Author Guide

**For custom HTML pages placed in the `scormcontent/` folder**
*Based on the SCORM 2004 4th Edition Custom Driver & Package Reference (Learning Dojo, April 2026)*

---

## Overview

This package gives you a custom SCORM 2004 driver (`scorm-driver.js`) that handles all communication between your HTML content and the LMS (Learning Management System). You write plain HTML — the driver handles the SCORM protocol.

**Your job as a content author:** call the right `SCORM.*` methods at the right moments. This guide explains exactly what those are.

---

## Folder Structure

```
my-course.zip               ← ZIP this for LMS upload
├── imsmanifest.xml         ← Package manifest (do not move or rename)
├── launcher.html           ← LMS entry point — DO NOT EDIT
├── core/                   ← Driver files — DO NOT EDIT
│   ├── scorm-driver.js          ← The SCORM driver
│   └── mock-api.js              ← Local dev only (never packaged)
└── scormcontent/           ← DROP YOUR CONTENT HERE
    ├── index.html               ← Your SCO entry point
    ├── page2.html               ← Additional pages (optional)
    ├── styles.css               ← Your stylesheets
    └── assets/                  ← Images, fonts, media
```

**How it works:** the LMS opens `launcher.html`, which immediately redirects to `scormcontent/index.html`. The LMS injects `window.API_1484_11` into the frame — a same-origin redirect keeps the page in the same frame, so the SCORM API is accessible in your content exactly as normal.

> **Rule:** `imsmanifest.xml` must always be at the ZIP root — never inside a subfolder. Do **not** include `core/mock-api.js` in the production ZIP.

---

## Step 1 — Include the Driver in Every HTML Page

Add these lines to the `<head>` of your `scormcontent/index.html`. The paths point up to `core/`, which sits alongside `scormcontent/` in the package:

```html
<head>
  <meta charset="UTF-8">
  <title>My Page</title>

  <!-- LOCAL DEVELOPMENT ONLY — remove before uploading to LMS -->
  <!-- <script src="../core/mock-api.js"></script> -->

  <!-- Always include — exposes the global SCORM object -->
  <script src="../core/scorm-driver.js"></script>
</head>
```

This makes a global `SCORM` object available on the page with all the methods described below.

> **Important:** `mock-api.js` is only for testing in a plain browser (no LMS). It must be commented out or removed before you package and upload your ZIP.

---

## Step 2 — Initialize and Terminate (Required in Every SCO)

These two calls are mandatory. Without them, no SCORM data will be saved.

```html
<script>
  const sessionStart = Date.now();

  // Called when the page finishes loading
  window.addEventListener("load", () => {
    SCORM.initialize();
  });

  // Called when the learner closes the window or navigates away
  window.addEventListener("beforeunload", () => {
    const elapsed = Math.round((Date.now() - sessionStart) / 1000);
    SCORM.setSessionTime(elapsed);  // Reports how long the session lasted
    SCORM.terminate();              // Closes the SCORM session and saves data
  });
</script>
```

> **Rule:** `initialize()` must fire after the `load` event — never inline in a `<script>` tag that runs before the DOM is ready. `terminate()` must be the last SCORM call.

---

## Step 3 — Detect Returning Learners (Resume)

After `initialize()`, check whether the learner is brand new or returning. Use this to restore their previous position.

```javascript
window.addEventListener("load", () => {
  SCORM.initialize();

  const info = SCORM.getLearnerInfo();
  // info = { id, name, entry, mode }
  // entry: "ab-initio" = first launch | "resume" = returning learner
  // mode:  "normal" | "browse" | "review"

  if (info.entry === "resume") {
    const bookmark = SCORM.getBookmark();      // e.g., "3" (page number)
    const state    = SCORM.getSuspendData();   // e.g., { currentPage: 3, answers: [...] }

    // Navigate to where they left off
    if (bookmark) navigateToPage(parseInt(bookmark));
  }
});
```

---

## SCORM Object — Full API Reference

### `SCORM.initialize()`
Opens the SCORM communication session with the LMS.

- **Call:** Inside `window.addEventListener("load", ...)` — never before the DOM loads
- **Returns:** `true` on success, `false` if no LMS is found (standalone mode)
- Must be the **first** SCORM call

```javascript
SCORM.initialize();
```

---

### `SCORM.terminate()`
Closes the session and saves all data to the LMS.

- **Call:** Inside `window.addEventListener("beforeunload", ...)`
- Must be the **last** SCORM call
- Always call `setSessionTime()` before `terminate()`

```javascript
SCORM.terminate();
```

---

### `SCORM.setComplete(successStatus)`
Sends **both** `cmi.completion_status = "completed"` and `cmi.success_status` to the LMS in a single call. These are two **separate** SCORM 2004 fields — both must be explicitly set or the LMS will show one of them as `"unknown"`.

- **`successStatus`** — `"passed"` | `"failed"` | `"unknown"` (default: `"unknown"`)

This method also locks the internal exit mode to `"normal"` so that the `terminate()` call fired on window close does **not** overwrite it with `"suspend"`. That overwrite is the most common cause of `completion_status` showing as `"unknown"` in SCORM Cloud even when `success_status` shows correctly as `"passed"` — the two fields appear to disagree because `terminate()` was undoing the completion.

Always call `setScore()` first, then `setComplete()`:

```javascript
// Correct order — score before completion:
SCORM.setScore({ raw: score, min: 0, max: 100 });
SCORM.setComplete("passed");   // completion_status="completed" + success_status="passed"
SCORM.setComplete("failed");   // completion_status="completed" + success_status="failed"
SCORM.setComplete("unknown");  // completion_status="completed", no pass/fail judgment
SCORM.setComplete();           // same as "unknown"
```

> **Important:** Call `setScore()` before `setComplete()` — some LMS platforms only accept score data while `completion_status` is still `"incomplete"`. Once you call `setComplete()`, do **not** call `setInProgress()` again in the same session. `setComplete()` calls `commit()` internally.

---

### `SCORM.setInProgress(location)`
Marks the SCO as incomplete and saves the learner's current position.

- **`location`** — A string bookmark (page number, slide ID, section name, etc.)
- Sets `cmi.completion_status` = `"incomplete"` and `cmi.exit` = `"suspend"`
- Call this on every **page/slide/section change** so the learner can resume later

```javascript
// When learner moves to page 3:
SCORM.setInProgress("3");

// Or use a descriptive string:
SCORM.setInProgress("module2-slide5");
```

---

### `SCORM.setScore({ raw, min, max, scaled })`
Submits score data to the LMS.

- **`raw`** — The learner's actual score (e.g., `85`)
- **`min`** — Minimum possible score (default: `0`)
- **`max`** — Maximum possible score (default: `100`)
- **`scaled`** — Score from -1.0 to 1.0 (auto-calculated from raw/min/max if omitted)

> **Important:** Always set `raw`, `min`, `max` together. Some LMS platforms reject score data if any of the four fields is missing.

```javascript
// Basic usage:
SCORM.setScore({ raw: 85, min: 0, max: 100 });

// With explicit scaled score:
SCORM.setScore({ raw: 17, min: 0, max: 20, scaled: 0.85 });
```

---

### `SCORM.setSuspendData(data)`
Stores arbitrary state data that persists between sessions (max 64,000 characters).

- Pass a plain JavaScript object — it will be `JSON.stringify`'d automatically
- Use this for: quiz answers, progress flags, timestamps, user preferences, etc.
- Complement to `setBookmark()` — bookmark is just the location, suspend data is the full state

```javascript
SCORM.setSuspendData({
  currentPage: 4,
  quizAnswers: ["A", "C", "B"],
  score: 67,
  timestamp: Date.now()
});
```

---

### `SCORM.getSuspendData()`
Retrieves the previously saved suspend data.

- Automatically `JSON.parse`'s the stored string
- Returns the parsed object, or the raw string if it wasn't JSON
- Returns `null` or `""` if nothing was previously saved

```javascript
const state = SCORM.getSuspendData();
if (state && state.currentPage) {
  navigateToPage(state.currentPage);
}
```

---

### `SCORM.setBookmark(location)`
Saves a short location string to `cmi.location` (max 1,000 characters).

- Use a page number, slide ID, or any string that identifies position
- This is separate from `setSuspendData()` — use both together for full resume support
- `setInProgress(location)` calls `setBookmark()` internally

```javascript
SCORM.setBookmark("page-4");
SCORM.setBookmark("42");       // Slide number as string
```

---

### `SCORM.getBookmark()`
Returns the last saved `cmi.location` string.

```javascript
const lastPage = SCORM.getBookmark(); // e.g., "page-4"
```

---

### `SCORM.recordInteraction(options)`
Records a single quiz question response to the LMS.

Call once per question, after the learner submits their answer. Each call auto-increments the interaction index.

**Options:**

| Property      | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `id`          | string | Yes      | Unique question ID per session (e.g., `"q1"`, `"slide3_q2"`). Max 4000 chars. |
| `type`        | string | No       | `"choice"` (default) \| `"true-false"` \| `"fill-in"` \| `"long-fill-in"` \| `"matching"` \| `"sequencing"` \| `"likert"` \| `"numeric"` \| `"other"` |
| `response`    | string | Yes      | The learner's answer as a string |
| `correct`     | string | No       | The correct answer pattern (for LMS reporting) |
| `result`      | string | No       | `"correct"` \| `"incorrect"` \| `"unanticipated"` \| `"neutral"` |
| `description` | string | No       | The question text |
| `weighting`   | number | No       | Point value of the question |
| `latency`     | number | No       | Time taken to answer in **seconds** (auto-converted to ISO 8601) |

```javascript
// Multiple choice question
SCORM.recordInteraction({
  id:          "q1",
  type:        "choice",
  response:    "B",
  correct:     "B",
  result:      "correct",
  description: "Which planet is closest to the Sun?",
  weighting:   2,
  latency:     18.5   // seconds
});

// True/false question
SCORM.recordInteraction({
  id:       "q2",
  type:     "true-false",
  response: "true",
  correct:  "false",
  result:   "incorrect",
  description: "Water boils at 90°C at sea level."
});

// Text fill-in
SCORM.recordInteraction({
  id:       "q3",
  type:     "fill-in",
  response: "photosynthesis",
  correct:  "photosynthesis",
  result:   "correct"
});
```

> **Rule:** Interaction IDs must be unique within a session. If you re-launch the course, the counter resets. Never reuse the same ID in a single session.

---

### `SCORM.getLearnerInfo()`
Returns information about the current learner from the LMS.

```javascript
const info = SCORM.getLearnerInfo();
// Returns:
// {
//   id:    "user-12345",        // LMS-assigned learner ID
//   name:  "Jane Smith",        // Display name
//   entry: "ab-initio",         // "ab-initio" (new) | "resume" (returning)
//   mode:  "normal"             // "normal" | "browse" | "review"
// }
```

---

### `SCORM.setSessionTime(seconds)`
Reports how long the learner spent in the session. Always call before `terminate()`.

```javascript
const elapsed = Math.round((Date.now() - sessionStart) / 1000);
SCORM.setSessionTime(elapsed);
SCORM.terminate();
```

---

### `SCORM.getValue(element)` / `SCORM.setValue(element, value)`
Low-level access to any CMI data model element. Use these if you need something the helper methods don't cover.

```javascript
// Read learner credit status
const credit = SCORM.getValue("cmi.credit"); // "credit" | "no-credit"

// Read total time accumulated across all sessions
const totalTime = SCORM.getValue("cmi.total_time");

// Write a value directly
SCORM.setValue("cmi.completion_status", "incomplete");
SCORM.commit(); // Always commit after manual setValue calls
```

> **Rule:** All values passed to and returned from the API are **strings**, never booleans or numbers. Always compare returns with `=== "true"`, never with a truthy check.

---

### `SCORM.commit()`
Force-saves all pending data to the LMS immediately.

All helper methods (`setComplete`, `setScore`, `recordInteraction`, etc.) call `commit()` automatically. Only call this directly when using raw `setValue()` calls.

```javascript
SCORM.setValue("cmi.location", "slide-7");
SCORM.setValue("cmi.completion_status", "incomplete");
SCORM.commit(); // Save both values now
```

---

### `SCORM.getLastError()`
Returns error details for the most recent API call.

```javascript
const err = SCORM.getLastError();
// Returns: { code: "0", message: "No error", diagnostic: "" }
// code "0" means no error
```

---

### `SCORM.isInitialized` (property)
Read-only boolean — `true` if `initialize()` has been called successfully.

```javascript
if (SCORM.isInitialized) {
  SCORM.setBookmark("page-3");
}
```

---

## CMI Data Model Quick Reference

These are the key data elements you interact with via the driver. All values are strings.

| CMI Element | R/W | Values / Notes |
|---|---|---|
| `cmi.completion_status` | R/W | `"completed"` \| `"incomplete"` \| `"not attempted"` \| `"unknown"` |
| `cmi.success_status` | R/W | `"passed"` \| `"failed"` \| `"unknown"` |
| `cmi.location` | R/W | Bookmark string — max 1000 chars |
| `cmi.suspend_data` | R/W | Arbitrary state — max 64,000 chars |
| `cmi.exit` | W | `"suspend"` \| `"normal"` \| `"logout"` \| `"time-out"` |
| `cmi.entry` | R | `"ab-initio"` \| `"resume"` \| `""` |
| `cmi.session_time` | W | ISO 8601 duration, e.g., `"PT1H5M30.00S"` |
| `cmi.total_time` | R | Accumulated time — LMS managed |
| `cmi.score.raw` | R/W | Score as string, e.g., `"85"` |
| `cmi.score.scaled` | R/W | Scaled score `-1.0` to `1.0`, e.g., `"0.85"` |
| `cmi.score.min` | R/W | Minimum score, e.g., `"0"` |
| `cmi.score.max` | R/W | Maximum score, e.g., `"100"` |
| `cmi.learner_id` | R | LMS-assigned learner ID |
| `cmi.learner_name` | R | Learner display name |
| `cmi.mode` | R | `"normal"` \| `"browse"` \| `"review"` |
| `cmi.credit` | R | `"credit"` \| `"no-credit"` |

---

## Complete Lifecycle Pattern

Every SCO should follow this pattern:

```javascript
const sessionStart = Date.now();

// 1. INITIALIZE on page load
window.addEventListener("load", () => {
  SCORM.initialize();

  const info = SCORM.getLearnerInfo();

  // Resume for returning learners
  if (info.entry === "resume") {
    const bookmark = SCORM.getBookmark();
    const state    = SCORM.getSuspendData();
    if (bookmark) resumeFromBookmark(bookmark, state);
  }
});

// 2. SAVE PROGRESS on every page/slide change
function onPageChange(pageId) {
  SCORM.setInProgress(pageId);
  SCORM.setSuspendData({ currentPage: pageId, ts: Date.now() });
}

// 3. COMPLETE when the learner reaches the final slide/page
// setScore() MUST come before setComplete() — some LMS stop accepting
// score writes once completion_status = "completed".
// setComplete() also locks exitMode = "normal" so terminate() below
// does NOT overwrite it with "suspend" (which causes completion_status
// to show as "unknown" in SCORM Cloud even if success_status = "passed").
function onCourseComplete(score) {
  SCORM.setScore({ raw: score, min: 0, max: 100 }); // ← always first
  SCORM.setComplete(score >= 80 ? "passed" : "failed"); // ← always second
}

// 4. TERMINATE on exit — always last
window.addEventListener("beforeunload", () => {
  const elapsed = Math.round((Date.now() - sessionStart) / 1000);
  SCORM.setSessionTime(elapsed);
  SCORM.terminate();
});
```

---

## Testing Locally (Without an LMS)

1. Open `scormcontent/index.html` in a browser.
2. Uncomment the `mock-api.js` script tag at the top of your HTML.
3. Open the browser console (F12). All SCORM calls are logged in blue.
4. Inspect `window.API_1484_11._store` in the console to see stored values.
5. Before packaging for production, **comment out or remove** the `mock-api.js` line.

---

## How SCORM 2004 Completion Actually Works (Two-Layer System)

SCORM 2004 uses two completely separate layers for tracking completion:

**Layer 1 — Runtime (what your JS does):** Your content calls `SCORM.setComplete("passed")`, which writes `cmi.completion_status = "completed"` and `cmi.success_status = "passed"` to the LMS via the API. This is the SCO-level data.

**Layer 2 — Rollup (what the manifest does):** The LMS reads the SCO-level data and "rolls it up" to the registration/course level using `rollupRules` defined in `imsmanifest.xml`. This is what SCORM Cloud actually displays on its dashboard.

**Without rollup rules in the manifest, SCORM Cloud will always show `completion_status = "unknown"** — even if your SCO correctly set `"completed"`. The API call is received, but the LMS has no instruction for how to reflect it at the course level.

The `imsmanifest.xml` included in this package already contains the required rollup configuration:

```xml
<!-- Organization-level sequencing — tells LMS how to derive course status from SCO status -->
<imsss:sequencing>
  <imsss:rollupRules
    rollupObjectiveSatisfied="true"
    rollupProgressCompletion="true"
    objectiveMeasureWeight="0">

    <!-- When all SCOs are completed → course = completed -->
    <imsss:rollupRule childActivitySet="all">
      <imsss:rollupConditions conditionCombination="all">
        <imsss:rollupCondition condition="completed"/>
      </imsss:rollupConditions>
      <imsss:rollupAction action="completed"/>
    </imsss:rollupRule>

    <!-- When any SCO is not completed → course = incomplete -->
    <imsss:rollupRule childActivitySet="any">
      <imsss:rollupConditions conditionCombination="all">
        <imsss:rollupCondition condition="completed" operator="not"/>
      </imsss:rollupConditions>
      <imsss:rollupAction action="incomplete"/>
    </imsss:rollupRule>

    <!-- When all SCOs are satisfied (passed) → course = satisfied -->
    <imsss:rollupRule childActivitySet="all">
      <imsss:rollupConditions conditionCombination="all">
        <imsss:rollupCondition condition="satisfied"/>
      </imsss:rollupConditions>
      <imsss:rollupAction action="satisfied"/>
    </imsss:rollupRule>

    <!-- When any SCO is not satisfied → course = notSatisfied -->
    <imsss:rollupRule childActivitySet="any">
      <imsss:rollupConditions conditionCombination="all">
        <imsss:rollupCondition condition="satisfied" operator="not"/>
      </imsss:rollupConditions>
      <imsss:rollupAction action="notSatisfied"/>
    </imsss:rollupRule>

  </imsss:rollupRules>
  <imsss:controlMode flow="true" choice="true"/>
</imsss:sequencing>
```

Also required on the item's `deliveryControls`: `tracked="true"` — without this, some LMS platforms exclude the item from rollup calculation entirely.

> **Never remove or simplify the sequencing block from `imsmanifest.xml`.** It is the bridge between what your JavaScript sets and what the LMS reports.

---

## Packaging for the LMS

Package your course as a ZIP with `imsmanifest.xml` at the root:

**macOS / Linux:**
```bash
# Run from the folder containing imsmanifest.xml
zip -r my-course.zip imsmanifest.xml launcher.html core/ scormcontent/

# Verify imsmanifest.xml is at the root (not inside a subfolder)
unzip -l my-course.zip | head -8
# Expected:
#   imsmanifest.xml
#   launcher.html
#   core/scorm-driver.js
#   scormcontent/index.html
#   ...
```

**Windows (PowerShell):**
```powershell
Compress-Archive -Path imsmanifest.xml, launcher.html, core, scormcontent -DestinationPath my-course.zip
```

> **Critical:** Many ZIP tools wrap everything inside a top-level folder (e.g., `my-course/imsmanifest.xml`). The LMS expects `imsmanifest.xml` at the archive root. Always verify with `unzip -l` before uploading. Do **not** include `core/mock-api.js` in the production ZIP.

---

## Common Issues & Fixes

| Symptom | Cause | Fix |
|---|---|---|
| Completion never registers in LMS | LMS controls completion instead of SCO | Ensure `completionSetByContent="true"` is in `imsmanifest.xml` |
| `completion_status` = "unknown" but `success_status` = "passed" (in SCORM Cloud) | Missing rollup rules in `imsmanifest.xml` — the SCO sets completion at runtime but the LMS has no instruction to roll it up to the course/registration level | The manifest now includes 4 `rollupRules` with `rollupProgressCompletion="true"` + `tracked="true"` on `deliveryControls` |
| `completion_status` = "unknown" even with rollup rules | `terminate()` overwrites `cmi.exit` back to `"suspend"` after `setComplete()` set it to `"normal"` — some LMS use the final exit value to decide whether to honor completion | Fixed in driver: `exitMode` is locked to `"normal"` by `setComplete()` so `terminate()` preserves it |
| `API_1484_11` not found | `initialize()` called before DOM ready, or wrong frame depth | Wrap in `window.addEventListener('load', ...)` |
| Score not saving | Some LMS require raw AND scaled | Always set `raw`, `min`, `max` together in `setScore()` |
| Learner always starts from beginning | `setInProgress()` not being called on page changes | Call `setInProgress(pageId)` on every navigation event |
| `cmi.entry` is always `"ab-initio"` | LMS not persisting data between sessions | Ensure `commit()` succeeds; check LMS storage settings |
| Pass/fail not recording | `objectiveSetByContent` not set | Ensure `objectiveSetByContent="true"` is in `imsmanifest.xml` |
| Session time malformed | ISO 8601 format error | Use `SCORM.secondsToISO(seconds)` or `SCORM.setSessionTime(seconds)` — never write duration strings manually |
| Interaction rejected | Non-unique ID or invalid `type` value | Use distinct IDs per session; validate `type` against the enum list above |

---

## Quick-Reference Checklist

Before packaging and uploading:

- [ ] `imsmanifest.xml` is at the ZIP root (not in a subfolder)
- [ ] `launcher.html` is at the ZIP root alongside `imsmanifest.xml`
- [ ] `core/` folder is included in the ZIP (contains `scorm-driver.js`)
- [ ] `core/mock-api.js` is **NOT** included in the production ZIP
- [ ] `schemaversion` is exactly `2004 4th Edition`
- [ ] Resource `href` in `imsmanifest.xml` is `launcher.html`
- [ ] `<file href="launcher.html"/>` and `<file href="core/scorm-driver.js"/>` are in the resource
- [ ] `completionSetByContent="true"` and `objectiveSetByContent="true"` are set
- [ ] `tracked="true"` is on the item's `deliveryControls`
- [ ] Organization-level `<imsss:sequencing>` with 4 `rollupRules` is present
- [ ] `rollupProgressCompletion="true"` and `rollupObjectiveSatisfied="true"` are on `<imsss:rollupRules>`
- [ ] `adlcp:scormType="sco"` is on the resource element
- [ ] `scormcontent/index.html` script tags reference `../core/scorm-driver.js`
- [ ] `mock-api.js` script tag is commented out or removed from `scormcontent/index.html`
- [ ] `SCORM.initialize()` is called inside `window.addEventListener('load', ...)`
- [ ] `SCORM.setSessionTime()` is called before `SCORM.terminate()`
- [ ] `SCORM.terminate()` is called in `window.addEventListener('beforeunload', ...)`
- [ ] `SCORM.setInProgress()` is called on every page/slide change
- [ ] `SCORM.setComplete()` is called when the learner finishes
- [ ] `setScore()` sets `raw`, `min`, and `max` together
- [ ] Interaction IDs are unique per session
