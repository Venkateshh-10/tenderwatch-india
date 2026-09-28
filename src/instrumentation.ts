export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { resolvedSqlitePath } = await import("./lib/server-env");
    console.info(JSON.stringify({ event: "database", path: resolvedSqlitePath() }));
  }
}
