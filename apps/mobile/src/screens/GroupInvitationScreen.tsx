import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getGroupInvitation,
  acceptGroupInvitation,
  declineGroupInvitation,
  GroupInvitation,
} from "../api/groupApi";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface GroupInvitationScreenProps {
  invitationToken: string;
  onBack: () => void;
  onAccept?: (groupId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function GroupInvitationScreen({
  invitationToken,
  onBack,
  onAccept,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: GroupInvitationScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [processing, setProcessing] = useState(false);

  const {
    data: invitation,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<GroupInvitation>({
    fetchFn: async () => {
      if (!token) throw new Error("Please log in to view this invitation");
      return getGroupInvitation(token);
    },
    immediate: true,
    deps: [token, invitationToken],
  });

  async function handleAccept() {
    if (!token || !invitation) return;

    try {
      setProcessing(true);
      const result = await acceptGroupInvitation(token, invitationToken);
      Alert.alert("Success", `You've joined "${result.groupName}"!`, [
        {
          text: "OK",
          onPress: () => {
            onAccept?.(result.groupId);
            onBack();
          },
        },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to accept invitation",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleDecline() {
    if (!token || !invitation) return;

    Alert.alert(
      "Decline Invitation",
      "Are you sure you want to decline this invitation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);
              await declineGroupInvitation(token, invitationToken);
              Alert.alert("Success", "Invitation declined", [
                { text: "OK", onPress: onBack },
              ]);
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Failed to decline invitation",
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }

  function isExpired(): boolean {
    if (!invitation) return false;
    return new Date() > new Date(invitation.expiresAt);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading invitation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invitation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Group Invitation"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>
            {error || "Invitation not found"}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const expired = isExpired();
  const alreadyProcessed = invitation.status !== "pending";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Group Invitation"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Inviter Info */}
          <View style={styles.inviterCard}>
            <View style={styles.inviterAvatar}>
              {invitation.inviter.profile?.avatarUrl ? (
                <Image
                  source={{ uri: invitation.inviter.profile.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {(
                    invitation.inviter.profile?.displayName ||
                    invitation.inviter.email ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.inviterName}>
              {invitation.inviter.profile?.displayName ||
                invitation.inviter.email}
            </Text>
            <Text style={styles.inviterLabel}>invited you to join</Text>
          </View>

          {/* Group Info */}
          <View style={styles.groupCard}>
            <View style={styles.groupIcon}>
              <MaterialIcons name="group" size={32} color={theme.colors.blue} />
            </View>
            <Text style={styles.groupName}>{invitation.group.name}</Text>
            {invitation.group.description && (
              <Text style={styles.groupDescription}>
                {invitation.group.description}
              </Text>
            )}
            <Text style={styles.groupMeta}>
              Created {formatDate(invitation.group.createdAt)}
            </Text>
          </View>

          {/* Status Messages */}
          {expired && (
            <View style={styles.statusCard}>
              <MaterialIcons
                name="schedule"
                size={24}
                color={theme.colors.error}
              />
              <Text style={styles.statusText}>This invitation has expired</Text>
            </View>
          )}

          {alreadyProcessed && !expired && (
            <View style={styles.statusCard}>
              <MaterialIcons
                name={
                  invitation.status === "accepted" ? "check-circle" : "cancel"
                }
                size={24}
                color={
                  invitation.status === "accepted"
                    ? theme.colors.success
                    : theme.colors.error
                }
              />
              <Text style={styles.statusText}>
                This invitation has been {invitation.status}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {!expired && !alreadyProcessed && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  processing && styles.buttonDisabled,
                ]}
                onPress={handleAccept}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={theme.colors.white}
                    />
                    <Text style={styles.acceptButtonText}>Join Group</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.declineButton,
                  processing && styles.buttonDisabled,
                ]}
                onPress={handleDecline}
                disabled={processing}
              >
                <MaterialIcons
                  name="cancel"
                  size={20}
                  color={theme.colors.error}
                />
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      padding: theme.spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing["2xl"],
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing["2xl"],
    },
    errorText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      textAlign: "center",
    },
    retryButton: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
    },
    retryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    inviterCard: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inviterAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.blue,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    avatarImage: {
      width: 64,
      height: 64,
      borderRadius: 32,
    },
    avatarText: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.white,
    },
    inviterName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray800,
      marginBottom: 4,
    },
    inviterLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    groupCard: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    groupIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.blueBackground,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    groupName: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray800,
      marginBottom: theme.spacing.sm,
      textAlign: "center",
    },
    groupDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
    },
    groupMeta: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    statusCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.errorBackground,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
    },
    statusText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginLeft: theme.spacing.sm,
      flex: 1,
    },
    actionsContainer: {
      gap: 12,
    },
    acceptButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.base,
      gap: theme.spacing.sm,
    },
    acceptButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    declineButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    declineButtonText: {
      color: theme.colors.error,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
}
