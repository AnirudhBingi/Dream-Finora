import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { getAvatarUrl } from '../utils/avatar';

interface AvatarProps {
  avatarUrl: string | null | undefined;
  displayName: string;
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
 * @param size - Size of the avatar in pixels (default: 48)
 * @param style - Additional styles for the container
 * @param textStyle - Additional styles for the initials text
 * @param borderColor - Border color (default: transparent)
 * @param borderWidth - Border width (default: 0)
 */
export function Avatar({
  avatarUrl,
  displayName,
  size = 48,
  style,
  textStyle,
  borderColor = 'transparent',
  borderWidth = 0,
}: AvatarProps) {
  const processedAvatarUrl = getAvatarUrl(avatarUrl || null);
  const initials = displayName
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
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
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
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
              backgroundColor: getInitialsBackgroundColor(displayName),
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              {
                fontSize: size * 0.4,
                fontWeight: '700' as const,
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
function getInitialsBackgroundColor(displayName: string): string {
  // Use a simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate a color from the hash (using indigo/purple palette)
  const hue = Math.abs(hash) % 360;
  // Use a more vibrant color palette
  const colors = [
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#10B981', // Green
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#14B8A6', // Teal
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

