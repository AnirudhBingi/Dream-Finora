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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { pickMultipleImages } from "../utils/imagePicker";
import { useAuth } from "../auth/authContext";
import { createPost, CreatePostDto, uploadPostImages } from "../api/postApi";
import { Header } from "../components/Header";
import { useTheme } from "../theme";

interface CreatePostScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  groupId?: string;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function CreatePostScreen({
  onBack,
  onSuccess,
  groupId,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: CreatePostScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [content, setContent] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!token) return;

    // Validate that post has either content or images
    if (!content.trim() && imageUris.length === 0) {
      Alert.alert("Error", "Please add content or at least one image");
      return;
    }

    setSaving(true);
    try {
      // Parse hashtags (comma-separated, trim whitespace)
      const hashtags = (hashtagsInput || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

      const postData: CreatePostDto = {
        content: content.trim() || undefined,
        images: undefined, // Don't send local file:// URIs
        groupId,
        location: location.trim() || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
      };

      // Create post first (without images)
      const post = await createPost(token, postData);

      // Upload images if any were selected
      if (imageUris.length > 0) {
        try {
          await uploadPostImages(token, post.id, imageUris);
        } catch (err) {
          console.error("Failed to upload images:", err);
          Alert.alert("Warning", "Post created but image upload failed");
        }
      }

      Alert.alert("Success", "Post created successfully!", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create post",
      );
    } finally {
      setSaving(false);
    }
  }

  async function pickImages() {
    try {
      const newUris = await pickMultipleImages({ maxImages: 10 });
      if (newUris.length > 0) {
        setImageUris([...imageUris, ...newUris]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick images");
    }
  }

  function removeImage(index: number) {
    setImageUris(imageUris.filter((_, i) => i !== index));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Create Post"
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
          <View style={styles.form}>
            <View style={styles.heroSection}>
              <MaterialIcons
                name="auto-awesome"
                size={28}
                color={theme.colors.blue}
              />
              <Text style={styles.heroTitle}>Share a Moment</Text>
              <Text style={styles.heroSubtitle}>
                Inspire the Finora community with tips, wins, or updates.
              </Text>
            </View>

            <SectionCard title="Post" icon="edit">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Content (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="What's on your mind?"
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={5000}
                />
                <Text style={styles.characterCount}>{content.length}/5000</Text>
              </View>
            </SectionCard>

            <SectionCard title="Photos" icon="photo-library">
              {imageUris.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imageScroll}
                  contentContainerStyle={styles.imageContainer}
                >
                  {imageUris.map((uri, index) => (
                    <View key={index} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={pickImages}
              >
                <MaterialIcons
                  name="add-photo-alternate"
                  size={24}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.imageUploadButtonText}>
                  {imageUris.length > 0 ? "Add More Images" : "Add Images"}
                </Text>
              </TouchableOpacity>
            </SectionCard>

            <SectionCard title="Context" icon="place">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location (Optional)</Text>
                <View style={styles.inputRow}>
                  <MaterialIcons
                    name="place"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                  <TextInput
                    style={styles.rowInput}
                    placeholder="e.g., New York, NY"
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hashtags (Optional)</Text>
                <View style={styles.inputRow}>
                  <MaterialIcons
                    name="tag"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                  <TextInput
                    style={styles.rowInput}
                    placeholder="e.g., finance, savings, tips"
                    value={hashtagsInput}
                    onChangeText={setHashtagsInput}
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.hintText}>
                  Separate multiple hashtags with commas
                </Text>
              </View>
            </SectionCard>

            {/* Post Button */}
            <TouchableOpacity
              style={[styles.postButton, saving && styles.postButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SectionCardProps {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  children: React.ReactNode;
}

function SectionCard({ title, icon, children }: SectionCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name={icon} size={18} color={theme.colors.blue} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: theme.spacing.xl,
    },
    form: {
      marginTop: theme.spacing.sm,
    },
    heroSection: {
      alignItems: "center",
      marginBottom: theme.spacing["2xl"],
      paddingTop: theme.spacing.sm,
    },
    heroTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.sm,
    },
    heroSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: theme.spacing.xs,
    },
    card: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      ...theme.shadows.sm,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.base,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.base,
    },
    inputGroup: {
      marginBottom: theme.spacing.xl,
    },
    label: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.background,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.background,
    },
    rowInput: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
    },
    textArea: {
      minHeight: 120,
      paddingTop: theme.spacing.md,
    },
    characterCount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      textAlign: "right",
      marginTop: theme.spacing.xs,
    },
    hintText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      fontStyle: "italic",
    },
    imageScroll: {
      marginBottom: theme.spacing.md,
    },
    imageContainer: {
      paddingRight: 24,
    },
    imageWrapper: {
      position: "relative",
      marginRight: 12,
    },
    imagePreview: {
      width: 100,
      height: 100,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    removeImageButton: {
      position: "absolute",
      top: -8,
      right: -8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.error,
      justifyContent: "center",
      alignItems: "center",
    },
    removeImageText: {
      color: theme.colors.textInverse,
      fontSize: 18,
      fontWeight: "bold",
    },
    imageUploadButton: {
      borderWidth: 2,
      borderColor: theme.colors.borderDark,
      borderStyle: "dashed",
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.xl,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 100,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    imageUploadButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    postButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    postButtonDisabled: {
      opacity: 0.5,
    },
    postButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    cancelButton: {
      backgroundColor: "transparent",
      borderRadius: theme.spacing.sm,
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 44,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.blue,
    },
    cancelButtonText: {
      color: theme.colors.blue,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
