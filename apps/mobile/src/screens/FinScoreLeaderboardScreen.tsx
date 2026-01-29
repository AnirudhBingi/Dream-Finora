import React from "react";
import { LeaderboardScreen } from "./LeaderboardScreen";

export type FinScoreLeaderboardScreenProps = React.ComponentProps<
  typeof LeaderboardScreen
>;

export function FinScoreLeaderboardScreen(
  props: FinScoreLeaderboardScreenProps,
) {
  return <LeaderboardScreen {...props} />;
}
