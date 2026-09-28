# Decision engine

The verdict is not a match percentage. `src/lib/readiness/evaluate.ts` compares extracted requirements with Company DNA.

## Evidence status

- VERIFIED: an explicit fact from a Tier A page, or a clear date or money fact in a Tier A snippet.
- SUPPORTED: a credible official or announcement source that is not enough for a hard block.
- UNVERIFIED: a possible fact from media, an aggregator, or an unclassified page.
- UNKNOWN: nothing usable was found.

Only a VERIFIED mandatory failure becomes an automatic blocker. Unknown turnover, age, EMD, or deadline stays UNKNOWN.

## Verdicts

- BID: strong capability match, Tier A or B source, and no verified hard blocker or material concern.
- REVIEW: relevant, but evidence is incomplete or a concern needs a person.
- SKIP: a verified hard requirement fails, or the notice does not match the company capabilities.

Hard checks include turnover, company age, experience that the company cannot have reached, missing mandatory certifications, EMD above the configured limit, and a verified past closing date.

Company data may be the example SME profile. Tender facts are not seeded in live mode.
