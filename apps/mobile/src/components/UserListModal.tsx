import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { UserSummary } from "../api/types";
import { Avatar } from "./Avatar";
import { useTheme } from "../theme";

interface UserListModalProps {
  title: string;
  users: UserSummary[];
  visible: boolean;
  loading?: boolean;
  emptyMessage?: string;
  onClose: () => void;
}

export function UserListModal({
  title,
  users,
  visible,
  loading = false,
  emptyMessage = "No users yet.",
  onClose,
}: UserListModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.blue} />
            </View>
          ) : users.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            <ScrollView>
              {users.map((user) => {
                const displayName =
                  user.profile?.displayName || user.email || "Unknown";
                return (
                  <View key={user.id} style={styles.userRow}>
                    <Avatar
                      size={40}
                      uri={user.profile?.avatarUrl || undefined}
                      name={displayName}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{displayName}</Text>
                      {user.profile?.displayName && (
                        <Text style={styles.userEmail}>{user.email}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: "flex-end",
    },
    container: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.spacing.lg,
      borderTopRightRadius: theme.spacing.lg,
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
      paddingBottom: theme.spacing.xl,
      maxHeight: "80%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.base,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    closeText: {
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.medium,
    },
    loadingContainer: {
      paddingVertical: theme.spacing.lg,
      alignItems: "center",
    },
    emptyContainer: {
      paddingVertical: theme.spacing.lg,
      alignItems: "center",
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
    },
    userRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    userInfo: {
      marginLeft: theme.spacing.sm,
      flex: 1,
    },
    userName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    userEmail: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
  });
