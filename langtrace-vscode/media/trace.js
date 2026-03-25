(function () {
  const vscode = acquireVsCodeApi();

  function escapeHtml(str) {
    return (str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function colorizeJson(text) {
    // Escape first, then apply a small set of regex replacements.
    let html = escapeHtml(text);

    // Strings (including keys).
    html = html.replace(
      /"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?/g,
      (match, str, maybeColon) => {
        const isKey = !!maybeColon;
        const cls = isKey ? "tok-key" : "tok-string";
        return `<span class="${cls}">${match}</span>`;
      }
    );

    // Booleans and null.
    html = html.replace(/\b(true|false)\b/g, (m) => `<span class="tok-boolean">${m}</span>`);
    html = html.replace(/\bnull\b/g, (m) => `<span class="tok-null">${m}</span>`);

    // Numbers.
    html = html.replace(/-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, (m) => `<span class="tok-number">${m}</span>`);

    return html;
  }

  function toggleStep(header) {
    const step = header.closest(".trace-step");
    if (!step) return;
    const details = step.querySelector(".trace-step-details");
    if (!details) return;

    const expanded = details.classList.toggle("expanded");
    header.setAttribute("aria-expanded", expanded ? "true" : "false");
    details.setAttribute("aria-hidden", expanded ? "false" : "true");

    const runId = step.getAttribute("data-run-id");
    vscode.postMessage({ command: "toggle", runId: runId || null, expanded });
  }

  document.querySelectorAll(".trace-step-header").forEach((header) => {
    header.addEventListener("click", () => toggleStep(header));
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleStep(header);
      }
    });
  });

  // Highlight JSON blocks.
  document.querySelectorAll(".json-source").forEach((pre) => {
    const text = pre.textContent || "";
    pre.innerHTML = colorizeJson(text);
  });
})();

