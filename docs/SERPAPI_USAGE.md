# SerpApi usage

The key is `SERPAPI_API_KEY` in `.env.local`. It is never exposed with a `NEXT_PUBLIC_` variable.

## Google Search

Engine: `google`.

Parameters: `gl=in`, `hl=en`, `google_domain=google.co.in`.

Used to discover indexed notices on official domains and with procurement phrases such as "notice inviting tender" and "request for proposal", combined with the company capabilities and preferred states.

## Google News

Engine: `google_news`.

Parameters: `gl=in`, `hl=en`.

Used for procurement announcements and context. A news item is supporting evidence. It does not become a verified eligibility fact by itself.

## Query planner

`src/lib/search/query-planner.ts` builds at most 5 Google queries and 2 news queries. Discovery prefers `site:eprocure.gov.in`, `site:gem.gov.in`, `site:gov.in "Notice Inviting Tender"`, and `site:nic.in "Request for Proposal"`, plus the company capability, a preferred state, and the current year.

Before a hit becomes a tender, `classifySearchHit` requires a strong procurement signal. Official portals with that signal are HIGH. Secondary pages with the same language are MEDIUM. LOW and rejected hits stay out of Discover and the dashboard. Google News is supporting context only, and only when it matches an already identified tender. A SerpApi timeout is retried once with a longer limit.

Check for updates uses `planChangeQueries`: at most 4 queries, mixing a reference search, corrigendum or amendment wording, and one Google News query. Those calls bypass the cache. A hit is kept only when it contains the tender reference, matches the primary URL, or shares enough of the title. If every change query fails, or the key is missing, the API returns “Live search unavailable” and does not substitute other data. A previously stored successful run can still be shown with its retrieval time.

## Provenance

Each execution stores the engine, query, parameters, time, result count, status, and whether a previous live response was reused from cache. Refresh Live bypasses the cache. Demo rows record the query text and state that SerpApi was not called.

## Credits

Discovery is sequential. Responses are cached by engine, query, and localization. The default cache window is 12 hours (`SEARCH_CACHE_TTL_HOURS`).
