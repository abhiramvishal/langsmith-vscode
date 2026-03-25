import * as assert from "assert";
import sinon from "sinon";

import { LangSmithClient } from "../../api/langsmithClient";

function createResponse(opts: {
  ok: boolean;
  status: number;
  statusText?: string;
  json?: any;
  text?: string;
}) {
  return {
    ok: opts.ok,
    status: opts.status,
    statusText: opts.statusText ?? "",
    text: async () => opts.text ?? "",
    json: async () => opts.json,
  } as unknown as Response;
}

describe("LangSmithClient", () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(globalThis, "fetch" as any);
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it("getProjects handles direct array response", async () => {
    const projects = [{ id: "p1", name: "Project 1", description: null, created_at: new Date().toISOString(), run_count: 0 }];

    fetchStub.resolves(
      createResponse({
        ok: true,
        status: 200,
        json: projects,
      })
    );

    const client = new LangSmithClient("https://example.com", "ls__test");
    const result = await client.getProjects();
    assert.deepStrictEqual(result, projects);
  });

  it("getProjects handles { projects: [...] } wrapper", async () => {
    const projects = [{ id: "p1", name: "Project 1", description: null, created_at: new Date().toISOString(), run_count: 0 }];
    fetchStub.resolves(
      createResponse({
        ok: true,
        status: 200,
        json: { projects },
      })
    );

    const client = new LangSmithClient("https://example.com", "ls__test");
    const result = await client.getProjects();
    assert.deepStrictEqual(result, projects);
  });

  it("getProjects handles { data: [...] } wrapper", async () => {
    const projects = [{ id: "p1", name: "Project 1", description: null, created_at: new Date().toISOString(), run_count: 0 }];
    fetchStub.resolves(
      createResponse({
        ok: true,
        status: 200,
        json: { data: projects },
      })
    );

    const client = new LangSmithClient("https://example.com", "ls__test");
    const result = await client.getProjects();
    assert.deepStrictEqual(result, projects);
  });

  it("getRuns passes correct query params", async () => {
    fetchStub.resolves(
      createResponse({
        ok: true,
        status: 200,
        json: { runs: [] },
      })
    );

    const client = new LangSmithClient("https://example.com", "ls__test");
    await client.getRuns("session 1/abc", 10);

    assert.strictEqual(fetchStub.callCount, 1);
    const calledUrl = fetchStub.getCall(0).args[0] as string;
    assert.strictEqual(
      calledUrl,
      "https://example.com/api/v1/runs?session_id=session%201%2Fabc&limit=10&order=desc"
    );
  });

  it("normalizeStatus handles variants", () => {
    assert.strictEqual(LangSmithClient.normalizeStatus("success"), "success");
    assert.strictEqual(LangSmithClient.normalizeStatus("SUCCESS"), "success");

    assert.strictEqual(LangSmithClient.normalizeStatus("error"), "error");
    assert.strictEqual(LangSmithClient.normalizeStatus("failed"), "error");
    assert.strictEqual(LangSmithClient.normalizeStatus("fail"), "error");

    assert.strictEqual(LangSmithClient.normalizeStatus("pending"), "pending");
    assert.strictEqual(LangSmithClient.normalizeStatus("running"), "pending");
    assert.strictEqual(LangSmithClient.normalizeStatus("in_progress"), "pending");
  });

  it("surfaces error details on non-200 responses (no retry on 401)", async () => {
    fetchStub.resolves(
      createResponse({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: "unauthorized",
      })
    );

    const client = new LangSmithClient("https://example.com", "ls__test");
    await assert.rejects(
      async () => client.getProjects(),
      (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        return msg.includes("401") && msg.includes("/api/v1/projects");
      }
    );

    assert.strictEqual(fetchStub.callCount, 1);
  });
});

