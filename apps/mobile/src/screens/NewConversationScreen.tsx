import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getFriends, Friend } from "../api/friendApi";
import { getGroups, Group } from "../api/groupApi";
import { startConversation } from "../api/messagingApi";
import { Header } from "../components/Header";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

interface NewConversationScreenProps {
  onBack: () => void;
  onConversationStarted?: (
    chatId: string,
    otherUser?: any,
    group?: Group,
  ) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

type TabType = "friends" | "groups";

export function NewConversationScreen({
  onBack,
  onConversationStarted,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: NewConversationScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);

  interface ConversationData {
    friends: Friend[];
    groups: Group[];
  }

  const { data, loading, error, refresh, refetch } =
    useDataFetch<ConversationData>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        const [friendsData, groupsData] = await Promise.all([
          getFriends(token),
          getGroups(token),
        ]);

        // Handle friends
        const friendsList = Array.isArray(friendsData)
          ? friendsData.filter((f) => f.status === "accepted")
          : [];

        // Handle groups - can be array or paginated response
        let groupsList: Group[] = [];
        if (Array.isArray(groupsData)) {
          groupsList = groupsData;
        } else if (
          groupsData &&
          typeof groupsData === "object" &&
          "groups" in groupsData
        ) {
          groupsList = (groupsData as any).groups || [];
        }

        return {
          friends: friendsList,
          groups: groupsList,
        };
      },
      immediate: true,
      deps: [token],
    });

  const friends = data?.friends ?? [];
  const groups = data?.groups ?? [];

  const { execute: handleStartConversation, loading: startingConversation } =
    useAsyncOperation({
      operationFn: async (friend: Friend) => {
        if (!token || !friend.friend) throw new Error("Not authenticated");
        const friendId = friend.friend.id || friend.friendId;
        if (!friendId) throw new Error("Friend ID not found");
        setStartingId(friendId);
        try {
          const conversation = await startConversation(token, friendId);
          if (onConversationStarted) {
            onConversationStarted(conversation.id, friend.friend);
          }
          return conversation;
        } finally {
          setStartingId(null);
        }
      },
      onError: (errorMessage) => {
        console.error("Failed to start conversation:", errorMessage);
        setStartingId(null);
      },
    });

  async function handleStartGroupChat(group: Group) {
    if (!token) return;

    // TODO: Implement group chat creation/joining
    // For now, we'll need to add backend support for group chats
    // This is a placeholder
    console.log("Group chat not yet implemented:", group.id);
  }

  function getUserDisplayName(friend: Friend): string {
    return (
      friend.friend?.profile?.displayName || friend.friend?.email || "Unknown"
    );
  }

  function getGroupDisplayName(group: Group): string {
    return group.name || "Unnamed Group";
  }

  // Filter data based on search query
  const filteredFriends = Array.isArray(friends)
    ? friends.filter((friend) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const displayName = getUserDisplayName(friend).toLowerCase();
        const email = friend.friend?.email?.toLowerCase() || "";
        return displayName.includes(query) || email.includes(query);
      })
    : [];

  const filteredGroups = Array.isArray(groups)
    ? groups.filter((group) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const name = getGroupDisplayName(group).toLowerCase();
        const description = group.description?.toLowerCase() || "";
        return name.includes(query) || description.includes(query);
      })
    : [];

  const renderFriend = ({ item }: { item: Friend }) => {
    const displayName = getUserDisplayName(item);

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleStartConversation(item)}
        disabled={
          startingConversation ||
          startingId === item.friend?.id ||
          startingId === item.friendId
        }
        activeOpacity={0.7}
      >
        <Avatar
          avatarUrl={item.friend?.profile?.avatarUrl}
          displayName={displayName}
          size={52}
          borderWidth={2}
          borderColor={theme.colors.background}
        />
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{displayName}</Text>
          {item.friend?.email && item.friend?.profile?.displayName && (
            <Text style={styles.itemSubtext}>{item.friend.email}</Text>
          )}
        </View>
        {startingConversation &&
        (startingId === item.friend?.id || startingId === item.friendId) ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={theme.colors.textTertiary}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item }: { item: Group }) => {
    const displayName = getGroupDisplayName(item);
    const isStarting = startingId === item.id || false;
    const memberCount = item.members?.length || 0;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleStartGroupChat(item)}
        disabled={true} // Disabled until group chat is implemented
        activeOpacity={0.7}
      >
        {item.avatarUrl ? (
          <View
            style={[
              styles.groupAvatar,
              { backgroundColor: theme.colors.primaryBackground },
            ]}
          >
            <Text
              style={[styles.groupAvatarText, { color: theme.colors.primary }]}
            >
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.groupAvatar,
              { backgroundColor: theme.colors.primaryBackground },
            ]}
          >
            <Text
              style={[styles.groupAvatarText, { color: theme.colors.primary }]}
            >
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{displayName}</Text>
          <Text style={styles.itemSubtext}>
            {memberCount} member{memberCount !== 1 ? "s" : ""}
            {item.description ? ` • ${item.description}` : ""}
          </Text>
        </View>
        {false ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={theme.colors.textTertiary}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <Header
          title="New Message"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <Header
          title="New Message"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Header
        title="New Message"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons
            name="search"
            size={20}
            color={theme.colors.textTertiary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends or groups..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.searchClear}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="close"
                size={18}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "friends" && styles.tabActive]}
          onPress={() => setActiveTab("friends")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "friends" && styles.tabTextActive,
            ]}
          >
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "groups" && styles.tabActive]}
          onPress={() => setActiveTab("groups")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "groups" && styles.tabTextActive,
            ]}
          >
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === "friends" ? (
        filteredFriends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="people-outline"
              size={48}
              color={theme.colors.textTertiary}
            />
            <Text style={styles.emptyText}>
              {searchQuery ? "No friends found" : "No friends yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? "Try a different search term"
                : "Add friends to start conversations"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredFriends}
            renderItem={renderFriend}
            keyExtractor={(item, index) => item.id || `friend-${index}`}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : filteredGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="group"
            size={48}
            color={theme.colors.textTertiary}
          />
          <Text style={styles.emptyText}>
            {searchQuery ? "No groups found" : "No groups yet"}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? "Try a different search term"
              : "Create or join a group to start group chats"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          renderItem={renderGroup}
          keyExtractor={(item, index) => item.id || `group-${index}`}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      gap: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      padding: 0,
    },
    searchClear: {
      padding: 4,
    },
    tabsContainer: {
      flexDirection: "row",
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingHorizontal: theme.spacing.base,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      fontSize: theme.typography.fontSize.sm + 1,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    listContent: {
      padding: 16,
    },
    itemCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: 14,
      marginBottom: theme.spacing.md,
      borderRadius: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    itemContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
      gap: 4,
    },
    itemName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
    },
    itemSubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    groupAvatar: {
      width: 52,
      height: 52,
      borderRadius: theme.spacing.base,
      justifyContent: "center",
      alignItems: "center",
    },
    groupAvatarText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.5,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing["2xl"],
    },
    emptyText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.base,
      marginBottom: 4,
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
  });
