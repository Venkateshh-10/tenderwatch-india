import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { serpApiKeyPresent } from "@/lib/mode";
import { projectRoot, resolvedSqlitePath, serverEnv } from "@/lib/server-env";

const ORIGINAL = process.env.SERPAPI_API_KEY;

afterEach(() => {
  if (ORIGINAL == null) delete process.env.SERPAPI_API_KEY;
  else process.env.SERPAPI_API_KEY = ORIGINAL;
  delete process.env.NEXT_PUBLIC_SERPAPI_API_KEY;
});

describe("server env and database path", () => {
  it("resolves SQLite from the project root", () => {
    const file = resolvedSqlitePath();
    expect(path.isAbsolute(file)).toBe(true);
    expect(file).toBe(path.join(projectRoot(), "prisma", "dev.db"));
    expect(projectRoot().endsWith("tenderwatch-india") || projectRoot() === path.resolve(process.cwd())).toBe(true);
  });

  it("treats only the server key as live search", () => {
    delete process.env.SERPAPI_API_KEY;
    process.env.NEXT_PUBLIC_SERPAPI_API_KEY = "public-key";
    expect(serverEnv("NEXT_PUBLIC_SERPAPI_API_KEY")).toBe("");
    expect(serpApiKeyPresent()).toBe(false);
    process.env.SERPAPI_API_KEY = "server-key";
    expect(serpApiKeyPresent()).toBe(true);
  });
});
