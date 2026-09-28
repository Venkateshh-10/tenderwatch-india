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

GeM `showbidDocument` links are fetched as documents. A PDF whose text is extracted is `VERIFIED_SOURCE`. An official URL that cannot be read stays `DISCOVERED_OFFICIAL`. Before a hit becomes a tender, `classifySearchHit` separates source authority from tender confidence. HIGH requires both an official procurement path and tender identity such as an NIT, RFP, EOI, bid number, or bid document. An official homepage, embassy page, survey, or portal listing without that identity is rejected or LOW. A corrigendum, amendment, extension, or cancellation is a change candidate: it can attach to an existing tender and does not become a card. Secondary pages with a real identity are MEDIUM. LOW and rejected hits stay out of Discover and the dashboard. After classification, TenderWatch fetches the text of the best 8 official candidates and reruns extraction and readiness on that text. Google News stays supporting context, and only when a reference, bid number, or strong title overlap matches a tender. A SerpApi timeout is retried once with a longer limit. A later discovery removes stored live rows that no longer pass this gate. Source rows from those searches are kept.

Check for updates uses `planChangeQueries`: at most 4 queries, mixing a reference search, corrigendum or amendment wording, and one Google News query. Those calls bypass the cache. A hit is kept only when it contains the tender reference, matches the primary URL, or shares enough of the title. If every change query fails, or the key is missing, the API returns “Live search unavailable” and does not substitute other data. A previously stored successful run can still be shown with its retrieval time.

## Provenance

Each execution stores the engine, query, parameters, time, result count, status, and whether a previous live response was reused from cache. Refresh Live bypasses the cache. Demo rows record the query text and state that SerpApi was not called.

## Credits

Discovery is sequential. Responses are cached by engine, query, and localization. The default cache window is 12 hours (`SEARCH_CACHE_TTL_HOURS`).
