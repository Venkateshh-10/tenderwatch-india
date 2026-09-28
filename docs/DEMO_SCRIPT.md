# Demo path

Use this when recording. Do not describe demo fixtures as live SerpApi results.

1. Open the dashboard. Say that TenderWatch helps an SME move from search results to a bid decision.
2. Open Company DNA and show the example SME profile.
3. If `.env.local` has `SERPAPI_API_KEY`, choose Discover Live Opportunities and wait for the real query log.
4. If the key is absent, the banner says Demo mode. Choose Load Demo Opportunities. The log says SerpApi was not called.
5. Open a notice. Show BID, REVIEW, or SKIP and the requirement table.
6. Open View evidence and Search provenance.
7. Open Time Machine. The first visit shows a snapshot time and “No verified change detected.”
8. Choose Check for updates. In demo mode the response says SerpApi was not called. The change list stays empty.
9. Open the evidence graph. Select the buyer node. Demo mode does not draw an official-announcement node.
10. Return to the dashboard. BID, REVIEW, SKIP, and CHANGED match the stored rows. CHANGED is 0 until a real diff exists.

Do not invent a corrigendum or a changed deadline. A change appears only after two stored snapshots differ.
