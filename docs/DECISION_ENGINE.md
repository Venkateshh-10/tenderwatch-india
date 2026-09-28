# Decision engine

The verdict is not a match percentage. `src/lib/readiness/evaluate.ts` compares extracted requirements with Company DNA.

## Evidence status

- VERIFIED: an explicit fact from a Tier A page, or a clear date or money fact in a Tier A snippet.
- SUPPORTED: a credible official or announcement source that is not enough for a hard block.
- UNVERIFIED: a possible fact from media, an aggregator, or an unclassified page.
- UNKNOWN: nothing usable was found.

Only a VERIFIED mandatory failure becomes an automatic blocker. A missing estimated value, tender fee, buyer, or department does not create a concern and cannot block BID. Unknown turnover, age, or EMD stays UNKNOWN when the tender never states that requirement.

Critical unknowns, which keep a relevant notice in REVIEW, are an unknown closing date with no supported active status, a mandatory certification or registration that is not verified, a stated mandatory turnover or experience requirement that is still unresolved, and a preferred-state mismatch. An informational experience mention does not force REVIEW. A registration the company already holds, such as GST, does not block BID. A verified mandatory registration the company does not hold is a hard blocker.

## Verdicts

- BID: a real procurement identity was extracted, the capability fit is strong, the source is Tier A or B, the deadline is still open or an active status was read from the official page, and there is no verified hard blocker and no critical unknown.
- REVIEW: the notice looks relevant, but procurement identity or important eligibility evidence is still incomplete.
- SKIP: a verified hard requirement fails, a verified deadline has passed, or the notice does not match the company capabilities.

Hard checks include turnover, company age, experience that the company cannot have reached, missing mandatory certifications, EMD above the configured limit, and a verified past closing date.

Company data may be the example SME profile. Tender facts are stored only from SerpApi results.

A later check re-runs the same rules on the updated text. Time Machine does not change a verdict by itself. It only records fields that differ between snapshots.
