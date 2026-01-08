import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export type SocialProvider = 'google' | 'apple';

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
  const isApple = provider === 'apple';
  const isIOS = Platform.OS === 'ios';

  // Apple button styling: black on iOS, white with border on Android
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      height: 52,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      borderWidth: 1,
    };

    if (isApple) {
      if (isIOS) {
        baseStyle.backgroundColor = '#000000';
        baseStyle.borderColor = '#000000';
      } else {
        baseStyle.backgroundColor = '#FFFFFF';
        baseStyle.borderColor = '#E5E7EB';
      }
    } else {
      // Google
      baseStyle.backgroundColor = '#FFFFFF';
      baseStyle.borderColor = '#E5E7EB';
    }

    if (disabled) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    if (isApple && isIOS) {
      return { color: '#FFFFFF' };
    }
    return { color: '#111827' };
  };

  const getIcon = () => {
    if (isApple) {
      return '🍎'; // Using emoji for now, can be replaced with SVG/PNG icon
    }
    return 'G'; // Using letter for now, can be replaced with Google logo SVG/PNG
  };

  const getText = () => {
    if (isApple) {
      return 'Continue with Apple';
    }
    return 'Continue with Google';
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

const styles = StyleSheet.create({
  iconContainer: {
    marginRight: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

