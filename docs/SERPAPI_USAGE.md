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

`src/lib/search/query-planner.ts` builds at most 5 Google queries and 2 news queries, and drops duplicate text. The planner also has a smaller change-query helper for a later monitoring pass. That pass is not wired to the UI yet.

## Provenance

Each execution stores the engine, query, parameters, time, result count, status, and whether a previous live response was reused from cache. Refresh Live bypasses the cache. Demo rows record the query text and state that SerpApi was not called.

## Credits

Discovery is sequential. Responses are cached by engine, query, and localization. The default cache window is 12 hours (`SEARCH_CACHE_TTL_HOURS`).
