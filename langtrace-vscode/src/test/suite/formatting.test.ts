import * as assert from "assert";
import * as vscode from "vscode";
import sinon from "sinon";

import {
  formatLatency,
  formatTokens,
  formatTimestamp,
  getStatusColor,
  getStatusIcon,
} from "../../utils/formatting";

describe("formatting", () => {
  describe("formatLatency", () => {
    it("formats <1000ms as ms", () => {
      assert.strictEqual(formatLatency(999), "999ms");
    });

    it("formats exactly 1000ms as 1s", () => {
      assert.strictEqual(formatLatency(1000), "1s");
    });

    it("formats >1000ms as seconds", () => {
      assert.strictEqual(formatLatency(1500), "1.5s");
    });
  });

  describe("formatTokens", () => {
    it("formats <1000 as integer", () => {
      assert.strictEqual(formatTokens(999), "999");
    });

    it("formats exactly 1000 as 1k", () => {
      assert.strictEqual(formatTokens(1000), "1k");
    });

    it("formats >1000 as k with decimals", () => {
      assert.strictEqual(formatTokens(1500), "1.5k");
    });
  });

  describe("formatTimestamp", () => {
    it("formats seconds/minutes/hours/days relative time", () => {
      const clock = sinon.useFakeTimers({
        now: new Date("2026-01-13T00:00:00.000Z").getTime(),
      });

      try {
        const base = new Date("2026-01-13T00:00:00.000Z");

        const secIso = new Date(base.getTime() - 30 * 1000).toISOString();
        assert.strictEqual(formatTimestamp(secIso), "30s ago");

        const minIso = new Date(base.getTime() - 3 * 60 * 1000).toISOString();
        assert.strictEqual(formatTimestamp(minIso), "3 mins ago");

        const hourIso = new Date(base.getTime() - 5 * 60 * 60 * 1000).toISOString();
        assert.strictEqual(formatTimestamp(hourIso), "5 hours ago");

        const dayIso = new Date(base.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
        assert.strictEqual(formatTimestamp(dayIso), "Jan 10");
      } finally {
        clock.restore();
      }
    });
  });

  describe("getStatusIcon", () => {
    it("returns the correct icon for success/error/pending", () => {
      assert.strictEqual(getStatusIcon("success"), "$(check)");
      assert.strictEqual(getStatusIcon("error"), "$(error)");
      assert.strictEqual(getStatusIcon("pending"), "$(sync~spin)");
    });
  });

  describe("getStatusColor", () => {
    it("returns the correct ThemeColor ids for success/error/pending", () => {
      const success = getStatusColor("success") as vscode.ThemeColor;
      const error = getStatusColor("error") as vscode.ThemeColor;
      const pending = getStatusColor("pending") as vscode.ThemeColor;

      assert.strictEqual(success.id, "testing.iconPassed");
      assert.strictEqual(error.id, "testing.iconFailed");
      assert.strictEqual(pending.id, "testing.iconQueued");
    });
  });
});

