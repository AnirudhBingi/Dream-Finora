import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getAccountInfo,
  changePassword,
  updateEmail,
  deleteAccount,
  AccountInfo,
  ChangePasswordDto,
  UpdateEmailDto,
  DeleteAccountDto,
} from "../api/accountApi";
import { Header } from "../components/Header";
import { useTheme } from "../theme";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";

interface AccountSettingsScreenProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function AccountSettingsScreen({
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: AccountSettingsScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, logout } = useAuth();

  // Email update state
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    data: accountInfo,
    loading,
    refetch,
  } = useDataFetch<AccountInfo>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getAccountInfo(token);
    },
    immediate: true,
    deps: [token],
    transform: (info) => {
      setNewEmail(info.email);
      return info;
    },
  });

  const { loading: updatingEmail, execute: executeUpdateEmail } =
    useAsyncOperation({
      operationFn: async () => {
        if (!token || !accountInfo)
          throw new Error("Missing token or account info");
        if (!newEmail || !emailPassword)
          throw new Error("Please fill in all fields");
        if (newEmail === accountInfo.email)
          throw new Error("Email is the same as current email");

        await updateEmail(token, { email: newEmail, password: emailPassword });
        return null;
      },
      onSuccess: () => {
        Alert.alert("Success", "Email updated successfully");
        refetch();
        setEmailPassword("");
      },
    });

  const { loading: changingPassword, execute: executeChangePassword } =
    useAsyncOperation({
      operationFn: async () => {
        if (!token) throw new Error("No authentication token");
        if (!currentPassword || !newPassword || !confirmPassword) {
          throw new Error("Please fill in all fields");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("New passwords do not match");
        }

        await changePassword(token, { currentPassword, newPassword });
        return null;
      },
      onSuccess: () => {
        Alert.alert("Success", "Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordFields(false);
      },
    });

  const { loading: deletingAccount, execute: executeDeleteAccount } =
    useAsyncOperation({
      operationFn: async () => {
        if (!token) throw new Error("No authentication token");
        if (!deletePassword) throw new Error("Please enter your password");

        await deleteAccount(token, { password: deletePassword });
        return null;
      },
      onSuccess: () => {
        Alert.alert("Success", "Account deleted successfully");
        logout();
      },
    });

  async function handleUpdateEmail() {
    await executeUpdateEmail();
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }
    await executeChangePassword();
  }

  function handleDeleteAccount() {
    if (!token || !deletePassword) {
      Alert.alert(
        "Error",
        "Please enter your password to confirm account deletion",
      );
      return;
    }

    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => executeDeleteAccount(),
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading account info...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Account Settings"
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
          {/* Account Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{accountInfo?.email}</Text>
              {accountInfo?.emailVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons
                    name="verified"
                    size={16}
                    color={theme.colors.success}
                  />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Account Created</Text>
              <Text style={styles.infoValue}>
                {accountInfo?.createdAt
                  ? new Date(accountInfo.createdAt).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
          </View>

          {/* Update Email */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Email</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Email</Text>
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Enter new email"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={emailPassword}
                onChangeText={setEmailPassword}
                placeholder="Enter your password to confirm"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                updatingEmail && styles.saveButtonDisabled,
              ]}
              onPress={handleUpdateEmail}
              disabled={updatingEmail}
              activeOpacity={0.7}
            >
              {updatingEmail ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.saveButtonText}>Update Email</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Change Password */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change Password</Text>

            {!showPasswordFields ? (
              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={() => setShowPasswordFields(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={theme.colors.blue}
                />
                <Text style={styles.changePasswordButtonText}>
                  Change Password
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Current Password</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor={theme.colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min 6 characters)"
                    placeholderTextColor={theme.colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={theme.colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      styles.halfButton,
                      changingPassword && styles.saveButtonDisabled,
                    ]}
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                    activeOpacity={0.7}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color={theme.colors.textInverse} />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelButton, styles.halfButton]}
                    onPress={() => {
                      setShowPasswordFields(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Delete Account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>

            {!showDeleteConfirm ? (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => setShowDeleteConfirm(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={20}
                  color={theme.colors.error}
                />
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.dangerText}>
                  This action cannot be undone. All your data will be
                  permanently deleted.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Enter Password to Confirm</Text>
                  <TextInput
                    style={styles.input}
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.deleteConfirmButton,
                      styles.halfButton,
                      deletingAccount && styles.saveButtonDisabled,
                    ]}
                    onPress={handleDeleteAccount}
                    disabled={deletingAccount}
                    activeOpacity={0.7}
                  >
                    {deletingAccount ? (
                      <ActivityIndicator color={theme.colors.textInverse} />
                    ) : (
                      <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelButton, styles.halfButton]}
                    onPress={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword("");
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: theme.spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    section: {
      marginBottom: theme.spacing["2xl"],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
    },
    infoItem: {
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    infoLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
    },
    verifiedBadge: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
      gap: 4,
    },
    verifiedText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.medium,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.background,
    },
    saveButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.sm,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    cancelButton: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    buttonRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    halfButton: {
      flex: 1,
    },
    changePasswordButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      backgroundColor: theme.colors.background,
    },
    changePasswordButtonText: {
      color: theme.colors.blue,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.error,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      backgroundColor: theme.colors.background,
    },
    deleteButtonText: {
      color: theme.colors.error,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    dangerText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: theme.spacing.base,
      lineHeight: 20,
    },
    deleteConfirmButton: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteConfirmButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
