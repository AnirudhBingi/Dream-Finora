import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/authContext";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  Profile,
} from "../api/profileApi";
import { getApiBaseUrl } from "../api/getApiBaseUrl";
import { pickSquareAvatarImage } from "../utils/imagePicker";
import { Header, invalidateProfileCache } from "../components/Header";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

interface EditProfileScreenProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditProfileScreen({
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditProfileScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Fetch profile data
  const {
    data: profile,
    loading,
    error,
    refetch,
  } = useDataFetch<Profile | null>({
    fetchFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const profileData = await getProfile(token);
      if (profileData) {
        setDisplayName(profileData.displayName || "");
        setBio(profileData.bio || "");
        if (profileData.avatarUrl) {
          const fullUrl = profileData.avatarUrl.startsWith("http")
            ? profileData.avatarUrl
            : `${getApiBaseUrl()}${profileData.avatarUrl}`;
          setAvatarUri(fullUrl);
        }
      } else {
        setDisplayName("");
        setBio("");
        setAvatarUri("");
      }
      return profileData;
    },
    immediate: true,
    deps: [token],
  });

  async function handlePickImage() {
    try {
      const uri = await pickSquareAvatarImage({ quality: 0.9 });
      if (uri) {
        setAvatarUri(uri);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image");
    }
  }

  const { execute: handleSave, loading: saving } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error("Not authenticated");

      // Upload avatar first if a new one was selected
      if (avatarUri && avatarUri.startsWith("file://")) {
        const filename = avatarUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        await uploadAvatar(token, avatarUri, filename, type);
      }

      // Update profile
      const updatedProfile = await updateProfile(token, {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      // If avatar was uploaded, update the avatarUri with the new URL
      if (updatedProfile.avatarUrl) {
        const fullUrl = updatedProfile.avatarUrl.startsWith("http")
          ? updatedProfile.avatarUrl
          : `${getApiBaseUrl()}${updatedProfile.avatarUrl}`;
        setAvatarUri(fullUrl);
      }

      return updatedProfile;
    },
    onSuccess: () => {
      // Invalidate profile cache so Header shows updated avatar/name
      invalidateProfileCache();
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: onBack },
      ]);
    },
    onError: (errorMessage) => {
      Alert.alert("Error", errorMessage);
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Profile"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Profile"
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
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Edit Profile"
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
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {displayName[0]?.toUpperCase() ||
                    user?.email?.[0]?.toUpperCase() ||
                    "U"}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditOverlay}>
              <Text style={styles.avatarEditText}>Change Photo</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your display name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={() => handleSave()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
    content: {
      paddingHorizontal: theme.spacing.xl,
      // No paddingTop - SafeAreaView handles top spacing
      alignItems: "center",
    },
    avatarContainer: {
      marginBottom: theme.spacing.xl,
      position: "relative",
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.border,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.blue,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarPlaceholderText: {
      fontSize: theme.typography.fontSize["4xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.white,
    },
    avatarEditOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.overlay,
      paddingVertical: theme.spacing.sm,
      borderBottomLeftRadius: 60,
      borderBottomRightRadius: 60,
      alignItems: "center",
    },
    avatarEditText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    form: {
      width: "100%",
    },
    inputGroup: {
      marginBottom: 20,
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
    textArea: {
      height: 100,
      paddingTop: 12,
    },
    saveButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.base,
      alignItems: "center",
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    cancelButton: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.base,
      alignItems: "center",
    },
    cancelButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
