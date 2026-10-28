// scorm-driver.js — SCORM 2004 4th Edition Custom Driver
// No dependencies. Drop in any HTML content folder.
// Based on: SCORM 2004 Custom Driver & Package Reference (Learning Dojo, April 2026)
//
// Exposes a single global: SCORM
// Usage: SCORM.initialize(), SCORM.setComplete("passed"), etc.

const SCORM = (() => {
  let API = null;
  let initialized = false;
  let interactionCount = 0;
  // Tracks the intended cmi.exit value.
  // Starts as "suspend" (mid-course exit). setComplete() flips this to "normal"
  // so that terminate() does NOT overwrite it — a common LMS bug source.
  let exitMode = "suspend";

  // ── API Discovery ─────────────────────────────────────────────────────────
  // Walks up to 7 parent frames looking for API_1484_11 (ADL spec recommendation).
  // Then falls back to window.opener for popup-launched SCOs.
  function findAPI(win) {
    let attempts = 0;
    while (
      !win.API_1484_11 &&
      win.parent &&
      win.parent !== win &&
      attempts < 7
    ) {
      attempts++;
      win = win.parent;
    }
    return win.API_1484_11 || null;
  }

  function getAPI() {
    return findAPI(window) ||
      (window.opener ? findAPI(window.opener) : null);
  }

  // ── Core Methods ──────────────────────────────────────────────────────────

  /**
   * initialize()
   * Must be the very first SCORM call. Call it inside window.addEventListener('load', ...).
   * If no LMS API is found, logs a warning and returns false (standalone mode).
   * On first launch (ab-initio), seeds completion_status and success_status.
   */
  function initialize() {
    API = getAPI();
    if (!API) {
      console.warn("SCORM: No API_1484_11 found. Running in standalone mode.");
      return false;
    }
    const result = API.Initialize("");
    if (result === "true") {
      initialized = true;
      const entry = API.GetValue("cmi.entry");
      if (entry === "ab-initio") {
        API.SetValue("cmi.completion_status", "incomplete");
        API.SetValue("cmi.success_status", "unknown");
      }
      commit();
      console.log("SCORM: Initialized. Entry:", entry);
      return true;
    }
    console.error("SCORM: Initialize failed.", getLastError());
    return false;
  }

  /**
   * terminate()
   * Final SCORM call — closes the session and saves all data.
   * Uses exitMode to set cmi.exit correctly:
   *   "normal"  — if setComplete() was previously called (course finished)
   *   "suspend" — if the learner exited mid-course (default)
   * IMPORTANT: never hardcode "suspend" here — it would silently overwrite
   * the "normal" exit that setComplete() already committed, causing some LMS
   * platforms (including SCORM Cloud) to show completion_status as "unknown".
   */
  function terminate() {
    if (!initialized) return false;
    API.SetValue("cmi.exit", exitMode);
    commit();
    const result = API.Terminate("");
    initialized = false;
    return result === "true";
  }

  /**
   * getValue(element)
   * Read a CMI data model element from the LMS.
   * Returns the value string, or null if not initialized.
   * All values are strings — numeric CMI values like cmi.score.raw are also strings.
   */
  function getValue(element) {
    if (!initialized) return null;
    const val = API.GetValue(element);
    if (API.GetLastError() !== "0") {
      console.warn(
        "SCORM GetValue error [" + element + "]:",
        API.GetLastError(),
        API.GetErrorString(API.GetLastError())
      );
    }
    return val;
  }

  /**
   * setValue(element, value)
   * Write a CMI data model element to the LMS.
   * Always compare return value with === "true" (string), never truthy check.
   * Returns true on success, false on failure.
   */
  function setValue(element, value) {
    if (!initialized) return false;
    const result = API.SetValue(element, String(value));
    if (result !== "true") {
      console.warn(
        "SCORM SetValue error [" + element + "]:",
        API.GetLastError(),
        API.GetErrorString(API.GetLastError())
      );
    }
    return result === "true";
  }

  /**
   * commit()
   * Force-persist all pending data to the LMS immediately.
   * Call after any important state change. All helper methods call this automatically.
   */
  function commit() {
    if (!initialized) return false;
    return API.Commit("") === "true";
  }

  /**
   * getLastError()
   * Returns { code, message, diagnostic } for the most recent API error.
   * Returns null if no API is available.
   */
  function getLastError() {
    if (!API) return null;
    const code = API.GetLastError();
    return {
      code,
      message: API.GetErrorString(code),
      diagnostic: API.GetDiagnostic(code)
    };
  }

  // ── Bookmarking ───────────────────────────────────────────────────────────

  /**
   * setBookmark(location)
   * Saves a bookmark string to cmi.location (max 1000 chars).
   * Use a page ID, slide index, or any string that identifies where the learner is.
   */
  function setBookmark(location) {
    setValue("cmi.location", String(location).substring(0, 1000));
    commit();
  }

  /**
   * getBookmark()
   * Returns the last saved cmi.location string, or null/empty if not set.
   */
  function getBookmark() {
    return getValue("cmi.location");
  }

  // ── Suspend Data ─────────────────────────────────────────────────────────

  /**
   * setSuspendData(data)
   * Stores arbitrary state data in cmi.suspend_data (max 64,000 chars).
   * Pass a plain object — it will be JSON.stringify'd automatically.
   * Use this to save quiz answers, progress flags, timestamps, etc.
   */
  function setSuspendData(data) {
    const str = typeof data === "object"
      ? JSON.stringify(data)
      : String(data);
    setValue("cmi.suspend_data", str.substring(0, 64000));
    commit();
  }

  /**
   * getSuspendData()
   * Retrieves cmi.suspend_data. Automatically JSON.parse's if possible.
   * Returns the parsed object, or the raw string if not valid JSON.
   */
  function getSuspendData() {
    const raw = getValue("cmi.suspend_data");
    try { return JSON.parse(raw); } catch { return raw; }
  }

  // ── Completion & Success ──────────────────────────────────────────────────

  /**
   * setComplete(successStatus)
   * Sends BOTH completion_status = "completed" AND success_status to the LMS.
   * These are two separate SCORM fields — both must be set explicitly.
   *
   * @param {string} successStatus — "passed" | "failed" | "unknown" (default: "unknown")
   *
   * Also sets exitMode = "normal" so that the subsequent terminate() call does NOT
   * overwrite this with "suspend". That overwrite is the most common cause of
   * completion_status showing as "unknown" in SCORM Cloud and other LMS platforms.
   */
  function setComplete(successStatus = "unknown") {
    setValue("cmi.completion_status", "completed"); // ← completion flag
    setValue("cmi.success_status",    successStatus); // ← passed / failed / unknown
    setValue("cmi.exit",              "normal");       // ← clean finish, not a suspend
    exitMode = "normal"; // ← preserve "normal" when terminate() fires on window close
    commit();
  }

  /**
   * setInProgress(location)
   * Marks the SCO as in-progress and suspends with the current bookmark.
   * Call this on page/slide changes to save mid-course progress.
   * @param {string} [location] — Optional bookmark (page ID, slide number, etc.)
   */
  function setInProgress(location) {
    setValue("cmi.completion_status", "incomplete");
    setValue("cmi.exit", "suspend");
    if (location !== undefined) setBookmark(location);
    commit();
  }

  // ── Score ─────────────────────────────────────────────────────────────────

  /**
   * setScore({ raw, min, max, scaled })
   * Submits score data to the LMS. All four fields (raw, min, max, scaled) should
   * be set together — some LMS platforms require all four to save correctly.
   * @param {number} [raw]    — The raw score (e.g., 85)
   * @param {number} [min]    — Minimum possible score (default: 0)
   * @param {number} [max]    — Maximum possible score (default: 100)
   * @param {number} [scaled] — Scaled score -1.0 to 1.0 (auto-calculated if omitted)
   */
  function setScore({ raw, min = 0, max = 100, scaled } = {}) {
    if (raw !== undefined) setValue("cmi.score.raw", String(raw));
    setValue("cmi.score.min", String(min));
    setValue("cmi.score.max", String(max));
    const scaledVal = scaled !== undefined
      ? scaled
      : (max - min > 0 ? ((raw - min) / (max - min)).toFixed(4) : 0);
    setValue("cmi.score.scaled", String(scaledVal));
    commit();
  }

  // ── Interactions (Quiz Data) ───────────────────────────────────────────────

  /**
   * recordInteraction({ id, type, response, correct, result, latency, description, weighting })
   * Records a single quiz question response to cmi.interactions.N.*
   * Each call auto-increments the interaction index (N).
   *
   * @param {string}  id          — Unique question identifier (max 4000 chars). E.g., "q1", "slide3_q2"
   * @param {string}  [type]      — "true-false" | "choice" | "fill-in" | "long-fill-in" |
   *                                "matching" | "sequencing" | "likert" | "numeric" | "other"
   *                                Default: "choice"
   * @param {string}  response    — The learner's answer as a string
   * @param {string}  [correct]   — The correct answer pattern (for scoring reference)
   * @param {string}  [result]    — "correct" | "incorrect" | "unanticipated" | "neutral"
   * @param {number}  [latency]   — Time taken to answer in seconds (auto-converted to ISO 8601)
   * @param {string}  [description] — The question text
   * @param {number}  [weighting] — Point value of the question
   * @returns {number} The index (N) of the recorded interaction
   */
  function recordInteraction({
    id, type, response, correct, result,
    latency, description, weighting
  }) {
    const n = interactionCount;
    const base = "cmi.interactions." + n;
    setValue(base + ".id", id);
    setValue(base + ".type", type || "choice");
    setValue(base + ".timestamp", new Date().toISOString());
    if (description) setValue(base + ".description", description);
    if (weighting !== undefined) setValue(base + ".weighting", String(weighting));
    setValue(base + ".learner_response", String(response));
    if (correct !== undefined)
      setValue(base + ".correct_responses.0.pattern", String(correct));
    setValue(base + ".result", result || "neutral");
    if (latency !== undefined)
      setValue(base + ".latency", secondsToISO(latency));
    interactionCount++;
    commit();
    return n;
  }

  // ── Session Time ──────────────────────────────────────────────────────────

  /**
   * setSessionTime(seconds)
   * Reports how long the learner spent in this session (in seconds).
   * Converts to ISO 8601 duration format (e.g., "PT0H5M30.00S") automatically.
   * Call this before terminate().
   */
  function setSessionTime(seconds) {
    setValue("cmi.session_time", secondsToISO(seconds));
  }

  /**
   * secondsToISO(totalSeconds)
   * Converts a number of seconds into SCORM 2004 ISO 8601 duration format.
   * Format: PTxHxMx.xxS — the PT prefix and seconds decimal are REQUIRED.
   * @param {number} totalSeconds
   * @returns {string} e.g., "PT1H30M45.00S"
   */
  function secondsToISO(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = (totalSeconds % 60).toFixed(2);
    return "PT" + h + "H" + m + "M" + s + "S";
  }

  // ── Learner Info ──────────────────────────────────────────────────────────

  /**
   * getLearnerInfo()
   * Returns an object with learner details from the LMS:
   *   { id, name, entry, mode }
   * - entry: "ab-initio" (first launch) | "resume" (returning) | ""
   * - mode:  "normal" | "browse" | "review"
   */
  function getLearnerInfo() {
    return {
      id: getValue("cmi.learner_id"),
      name: getValue("cmi.learner_name"),
      entry: getValue("cmi.entry"),
      mode: getValue("cmi.mode")
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    initialize,
    terminate,
    getValue,
    setValue,
    commit,
    getLastError,
    setBookmark,
    getBookmark,
    setSuspendData,
    getSuspendData,
    setComplete,
    setInProgress,
    setScore,
    recordInteraction,
    setSessionTime,
    getLearnerInfo,
    secondsToISO,
    get isInitialized() { return initialized; }
  };
})();
