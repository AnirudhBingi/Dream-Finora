import React from "react";
import { UnifiedFeedScreen } from "./UnifiedFeedScreen";

interface GroupFeedScreenProps {
  groupId: string;
  onCreatePost?: () => void;
  onCreateListing?: () => void;
  onViewPost?: (postId: string) => void;
  onViewListing?: (listingId: string) => void;
  onEditListing?: (listingId: string) => void;
  onNavigateToMessage?: (chatId: string, otherUser: any) => void;
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onBack: () => void;
}

export function GroupFeedScreen(props: GroupFeedScreenProps) {
  const { groupId, ...rest } = props;
  return <UnifiedFeedScreen {...rest} groupId={groupId} />;
}
