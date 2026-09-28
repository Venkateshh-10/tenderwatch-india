import { cache } from "react";
import { serpApiKeyPresent } from "@/lib/mode";
import { countWatchlist, latestDiscoverySession, latestLiveRetrieval, searchActivity } from "@/lib/tenders/queries";

export const getDeskSnapshot = cache(async () => {
  const [activity, session, lastVerified, watchCount] = await Promise.all([
    searchActivity(),
    latestDiscoverySession(),
    latestLiveRetrieval(),
    countWatchlist(),
  ]);
  return {
    liveSearch: serpApiKeyPresent(),
    historicalSearches: activity.executed,
    historicalRaw: activity.rawResults,
    session,
    lastVerified,
    watchCount,
  };
});
