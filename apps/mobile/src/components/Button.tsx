import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size
    if (size === 'small') {
      baseStyle.paddingVertical = 8;
      baseStyle.paddingHorizontal = 16;
      baseStyle.minHeight = 36;
    } else if (size === 'medium') {
      baseStyle.paddingVertical = 12;
      baseStyle.paddingHorizontal = 24;
      baseStyle.minHeight = 48;
    } else {
      baseStyle.paddingVertical = 14;
      baseStyle.paddingHorizontal = 32;
      baseStyle.minHeight = 52;
    }

    // Variant
    if (variant === 'primary') {
      baseStyle.backgroundColor = '#6366F1'; // Indigo-500
      if (Platform.OS === 'ios') {
        baseStyle.shadowColor = '#000';
        baseStyle.shadowOffset = { width: 0, height: 2 };
        baseStyle.shadowOpacity = 0.1;
        baseStyle.shadowRadius = 4;
      } else {
        baseStyle.elevation = 3;
      }
    } else if (variant === 'secondary') {
      baseStyle.backgroundColor = 'transparent';
      baseStyle.borderWidth = 2;
      baseStyle.borderColor = '#6366F1';
    } else if (variant === 'danger') {
      baseStyle.backgroundColor = '#EF4444'; // Red-500
      if (Platform.OS === 'ios') {
        baseStyle.shadowColor = '#000';
        baseStyle.shadowOffset = { width: 0, height: 2 };
        baseStyle.shadowOpacity = 0.1;
        baseStyle.shadowRadius = 4;
      } else {
        baseStyle.elevation = 3;
      }
    } else {
      // text variant
      baseStyle.backgroundColor = 'transparent';
      baseStyle.paddingVertical = 8;
      baseStyle.paddingHorizontal = 12;
      baseStyle.minHeight = 44;
    }

    // Disabled state
    if (isDisabled && variant !== 'text') {
      baseStyle.opacity = 0.5;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: size === 'small' ? 14 : size === 'medium' ? 16 : 18,
      fontWeight: '600',
    };

    if (variant === 'primary' || variant === 'danger') {
      baseStyle.color = '#FFFFFF';
    } else if (variant === 'secondary') {
      baseStyle.color = '#6366F1';
    } else {
      // text variant
      baseStyle.color = '#6366F1';
      baseStyle.fontSize = 14;
      baseStyle.fontWeight = '500';
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#6366F1'}
          size="small"
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

