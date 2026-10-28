// mock-api.js — SCORM 2004 Standalone / Debug Mock API
// Based on: SCORM 2004 Custom Driver & Package Reference (Learning Dojo, April 2026)
//
// HOW TO USE:
//   Include this script BEFORE scorm-driver.js during local development.
//   It injects a fake window.API_1484_11 so you can test SCORM calls in the
//   browser without uploading to an LMS.
//
// IMPORTANT: Remove or exclude this file from your production SCORM package.
//   The LMS will inject its own real API_1484_11 — this mock must not override it.

(function () {
  // If LMS already injected the real API, do nothing
  if (typeof window.API_1484_11 !== "undefined") return;

  const store = {};

  const log = (method, k, v) => {
    const msg = v !== undefined
      ? "[SCORM Mock] " + method + "  " + k + " = " + v
      : "[SCORM Mock] " + method + "(" + (k || "") + ")";
    console.log("%c" + msg, "color:#2563eb;font-family:monospace");
  };

  window.API_1484_11 = {
    Initialize(s) {
      log("Initialize", s);
      store["cmi.entry"]             = "ab-initio";
      store["cmi.learner_id"]        = "mock-user-001";
      store["cmi.learner_name"]      = "Test Learner";
      store["cmi.mode"]              = "normal";
      store["cmi.completion_status"] = "not attempted";
      store["cmi.success_status"]    = "unknown";
      return "true";
    },

    Terminate(s)      { log("Terminate", s);      return "true"; },
    GetValue(k)       { log("GetValue", k);        return store[k] !== undefined ? store[k] : ""; },
    SetValue(k, v)    { log("SetValue", k, v);     store[k] = v; return "true"; },
    Commit(s)         { log("Commit", s);          return "true"; },
    GetLastError()    { return "0"; },
    GetErrorString()  { return "No error"; },
    GetDiagnostic()   { return ""; },

    // Expose the internal store for inspection in browser DevTools:
    //   window.API_1484_11._store
    _store: store
  };

  console.log(
    "%c[SCORM Mock] API_1484_11 injected for local development",
    "background:#1a2744;color:#93c5fd;padding:2px 8px;border-radius:3px"
  );
})();
