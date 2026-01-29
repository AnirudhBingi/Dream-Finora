import React, { useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { getAvatarUrl } from "../utils/avatar";
import { useTheme } from "../theme";

interface AvatarProps {
  avatarUrl?: string | null;
  displayName?: string;
  uri?: string;
  name?: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  borderColor?: string;
  borderWidth?: number;
}

/**
 * Reusable Avatar component that displays user profile pictures with initials fallback.
 *
 * Pattern (inspired by Facebook/Instagram):
 * - If avatarUrl exists and is valid, display the image
 * - If avatarUrl is missing or fails to load, show initials in a colored circle
 * - Always use getAvatarUrl utility to process the URL properly
 * - Consistent sizing, colors, and styling across the app
 *
 * @param avatarUrl - The raw avatar URL from the API (can be relative or absolute)
 * @param displayName - User's display name or email (used for initials fallback)
 * @param uri - Alias for avatarUrl (legacy prop)
 * @param name - Alias for displayName (legacy prop)
 * @param size - Size of the avatar in pixels (default: 48)
 * @param style - Additional styles for the container
 * @param textStyle - Additional styles for the initials text
 * @param borderColor - Border color (default: transparent)
 * @param borderWidth - Border width (default: 0)
 */
export function Avatar({
  avatarUrl,
  displayName,
  uri,
  name,
  size = 48,
  style,
  textStyle,
  borderColor = "transparent",
  borderWidth = 0,
}: AvatarProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedAvatarUrl = avatarUrl ?? uri ?? null;
  const resolvedDisplayName = displayName ?? name ?? "Unknown";
  const processedAvatarUrl = getAvatarUrl(resolvedAvatarUrl);
  const safeDisplayName = resolvedDisplayName || "Unknown";
  const initials = safeDisplayName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth,
    borderColor,
  };

  return (
    <View style={[styles.container, avatarStyle, style]}>
      {processedAvatarUrl ? (
        <Image
          source={{ uri: processedAvatarUrl }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
          resizeMode="cover"
          onError={() => {
            // Silently fail - will show initials as fallback
            // The component will re-render with processedAvatarUrl = null
          }}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: getInitialsBackgroundColor(
                safeDisplayName,
                theme,
              ),
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              {
                fontSize: size * 0.4,
                fontWeight: "700" as const,
              },
              textStyle,
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Generate a consistent background color for initials based on the display name.
 * This ensures the same user always gets the same color (like Facebook/Instagram).
 */
function getInitialsBackgroundColor(
  displayName: string,
  theme: ReturnType<typeof useTheme>["theme"],
): string {
  // Use a simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use theme colors for consistent palette, with intentional design colors for avatar variety
  // Purple, Pink, and Teal are intentional design choices for avatar initials variety
  // These specific hex values provide visual diversity while maintaining brand consistency
  const colors = [
    theme.colors.primary, // Indigo
    "#8B5CF6", // Purple - Intentional design value for avatar variety
    "#EC4899", // Pink - Intentional design value for avatar variety
    theme.colors.warning, // Amber
    theme.colors.success, // Green
    theme.colors.blue, // Blue
    theme.colors.error, // Red
    "#14B8A6", // Teal - Intentional design value for avatar variety
  ];

  return colors[Math.abs(hash) % colors.length];
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      overflow: "hidden",
      backgroundColor: theme.colors.backgroundTertiary,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    placeholder: {
      justifyContent: "center",
      alignItems: "center",
    },
    initials: {
      color: theme.colors.textInverse,
      textAlign: "center",
    },
  });
