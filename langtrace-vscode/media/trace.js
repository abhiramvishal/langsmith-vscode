(function () {
  const vscode = acquireVsCodeApi();

  // ── JSON syntax highlighter ─────────────────────────────────
  function colorizeJson(text) {
    let html = text
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

    html = html.replace(
      /&quot;((?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\&])*?)&quot;(\s*:)?/g,
      (match, _inner, colon) =>
        `<span class="${colon ? "tok-key" : "tok-string"}">${match}</span>`
    );
    html = html.replace(/\b(true|false)\b/g, m => `<span class="tok-boolean">${m}</span>`);
    html = html.replace(/\bnull\b/g, m => `<span class="tok-null">${m}</span>`);
    html = html.replace(/-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, m => `<span class="tok-number">${m}</span>`);
    return html;
  }

  // ── Clipboard helper ────────────────────────────────────────
  function copyText(text, btn) {
    navigator.clipboard?.writeText(text).then(() => {
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = "✓ copied";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1600);
    });
  }

  // ── Accordion toggle ────────────────────────────────────────
  function setExpanded(header, expanded) {
    const step = header.closest(".trace-step");
    if (!step) return;
    const details = step.querySelector(".trace-step-details");
    if (!details) return;
    details.classList.toggle("expanded", expanded);
    header.setAttribute("aria-expanded", expanded ? "true" : "false");
    details.setAttribute("aria-hidden", expanded ? "false" : "true");
  }

  function toggleStep(header) {
    const expanded = header.getAttribute("aria-expanded") !== "true";
    setExpanded(header, expanded);
    const runId = header.closest(".trace-step")?.getAttribute("data-run-id");
    vscode.postMessage({ command: "toggle", runId: runId ?? null, expanded });
  }

  // ── Timeline bars ───────────────────────────────────────────
  function initTimeline() {
    const steps = Array.from(document.querySelectorAll(".trace-step[data-latency-ms]"));
    if (!steps.length) return;
    const max = Math.max(...steps.map(s => parseFloat(s.getAttribute("data-latency-ms") || "0")), 1);
    // Stagger the bar fills after a short delay so they animate in visibly
    requestAnimationFrame(() => {
      setTimeout(() => {
        steps.forEach(step => {
          const ms = parseFloat(step.getAttribute("data-latency-ms") || "0");
          const fill = step.querySelector(".timeline-fill");
          if (fill) fill.style.width = `${Math.max(2, (ms / max) * 100).toFixed(1)}%`;
        });
      }, 120);
    });
  }

  // ── Search / filter ─────────────────────────────────────────
  function initSearch() {
    const input = document.getElementById("search-input");
    const noResults = document.getElementById("no-results");
    if (!input) return;

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      const allSteps = document.querySelectorAll(".trace-step");
      let visible = 0;

      allSteps.forEach(step => {
        const nameEl = step.querySelector(".trace-step-name");
        const name = nameEl?.textContent?.toLowerCase() ?? "";
        const match = !q || name.includes(q);
        step.classList.toggle("hidden", !match);
        if (match) {
          visible++;
          if (nameEl && q) {
            const raw = nameEl.getAttribute("data-raw-name") || nameEl.textContent || "";
            const idx = raw.toLowerCase().indexOf(q);
            if (idx >= 0) {
              nameEl.innerHTML =
                escHtml(raw.slice(0, idx)) +
                `<mark>${escHtml(raw.slice(idx, idx + q.length))}</mark>` +
                escHtml(raw.slice(idx + q.length));
            }
          } else if (nameEl) {
            const raw = nameEl.getAttribute("data-raw-name") || nameEl.textContent || "";
            nameEl.textContent = raw;
          }
        }
      });

      if (noResults) noResults.style.display = visible === 0 && q ? "block" : "none";
    });

    input.addEventListener("keydown", e => {
      if (e.key === "Escape") { input.value = ""; input.dispatchEvent(new Event("input")); }
    });
  }

  function escHtml(s) {
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // ── Expand / collapse all ───────────────────────────────────
  function setAllExpanded(expanded) {
    document.querySelectorAll(".trace-step-header").forEach(h => setExpanded(h, expanded));
  }

  // ── Copy-id buttons ─────────────────────────────────────────
  function initCopyIdButtons() {
    document.querySelectorAll(".copy-id-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        copyText(btn.getAttribute("data-run-id") || "", btn);
      });
    });
  }

  // ── Copy-JSON buttons ───────────────────────────────────────
  function initCopyJsonButtons() {
    document.querySelectorAll(".copy-json-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const pre = btn.closest(".json-block")?.querySelector(".json-source");
        if (pre) copyText(pre.getAttribute("data-raw") || pre.textContent || "", btn);
      });
    });
  }

  // ── Copy-message buttons ────────────────────────────────────
  function initCopyMsgButtons() {
    document.querySelectorAll(".copy-msg-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const content = btn.closest(".msg-content-wrap")?.querySelector(".msg-content");
        copyText(content?.textContent || "", btn);
      });
    });
  }

  // ── Wire up step headers ────────────────────────────────────
  function initHeaders() {
    document.querySelectorAll(".trace-step-header").forEach(header => {
      // Store raw name for search restore
      const nameEl = header.querySelector(".trace-step-name");
      if (nameEl) nameEl.setAttribute("data-raw-name", nameEl.textContent || "");

      header.addEventListener("click", e => {
        if (e.target.closest(".copy-id-btn")) return;
        toggleStep(header);
      });
      header.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleStep(header); }
      });
    });
  }

  // ── Highlight JSON blocks ───────────────────────────────────
  function initJsonHighlight() {
    document.querySelectorAll("pre.json-source").forEach(pre => {
      const raw = pre.textContent || "";
      pre.setAttribute("data-raw", raw);
      pre.innerHTML = colorizeJson(raw);
    });
  }

  // ── Toolbar buttons ─────────────────────────────────────────
  const btnExpand   = document.getElementById("btn-expand-all");
  const btnCollapse = document.getElementById("btn-collapse-all");
  if (btnExpand)   btnExpand.addEventListener("click",   () => setAllExpanded(true));
  if (btnCollapse) btnCollapse.addEventListener("click", () => setAllExpanded(false));

  // ── Init ────────────────────────────────────────────────────
  initHeaders();
  initJsonHighlight();
  initCopyIdButtons();
  initCopyJsonButtons();
  initCopyMsgButtons();
  initTimeline();
  initSearch();
})();
