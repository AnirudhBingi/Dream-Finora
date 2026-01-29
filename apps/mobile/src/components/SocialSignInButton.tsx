import React, { useMemo } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
  ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

export type SocialProvider = "google" | "apple";

interface SocialSignInButtonProps {
  provider: SocialProvider;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function SocialSignInButton({
  provider,
  onPress,
  disabled = false,
  style,
}: SocialSignInButtonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isApple = provider === "apple";
  const isIOS = Platform.OS === "ios";

  // Apple button styling: black on iOS, white with border on Android
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      height: 52,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      borderWidth: 1,
    };

    if (isApple) {
      if (isIOS) {
        baseStyle.backgroundColor = theme.colors.black;
        baseStyle.borderColor = theme.colors.black;
      } else {
        baseStyle.backgroundColor = theme.colors.background;
        baseStyle.borderColor = theme.colors.border;
      }
    } else {
      // Google
      baseStyle.backgroundColor = theme.colors.background;
      baseStyle.borderColor = theme.colors.border;
    }

    if (disabled) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    if (isApple && isIOS) {
      return { color: theme.colors.textInverse };
    }
    return { color: theme.colors.textPrimary };
  };

  const getIcon = () => {
    if (isApple) {
      return "🍎"; // Using emoji for now, can be replaced with SVG/PNG icon
    }
    return "G"; // Using letter for now, can be replaced with Google logo SVG/PNG
  };

  const getText = () => {
    if (isApple) {
      return "Continue with Apple";
    }
    return "Continue with Google";
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>{getIcon()}</Text>
      </View>
      <Text style={[styles.buttonText, getTextStyle()]}>{getText()}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    iconContainer: {
      marginRight: theme.spacing.md,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    iconText: {
      fontSize: theme.typography.fontSize.lg,
    },
    buttonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
