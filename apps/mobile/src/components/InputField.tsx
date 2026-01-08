import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export function InputField({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  placeholderTextColor = '#9CA3AF',
  ...textInputProps
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const getInputStyle = () => {
    const baseStyle: ViewStyle = {
      backgroundColor: isFocused ? '#FFFFFF' : '#F9FAFB',
      borderWidth: 2,
      borderColor: error ? '#EF4444' : isFocused ? '#6366F1' : '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: '#111827',
      minHeight: 52,
    };

    if (leftIcon) {
      baseStyle.paddingLeft = 48;
    }

    if (rightIcon) {
      baseStyle.paddingRight = 48;
    }

    if (isFocused && Platform.OS === 'ios') {
      baseStyle.shadowColor = '#6366F1';
      baseStyle.shadowOffset = { width: 0, height: 0 };
      baseStyle.shadowOpacity = 0.1;
      baseStyle.shadowRadius = 4;
    }

    if (error) {
      baseStyle.backgroundColor = '#FEF2F2';
    }

    return baseStyle;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      )}
      
      <View style={styles.inputWrapper}>
        {leftIcon && (
          <MaterialIcons
            name={leftIcon}
            size={20}
            color={error ? '#EF4444' : isFocused ? '#6366F1' : '#6B7280'}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[getInputStyle(), style]}
          placeholderTextColor={placeholderTextColor}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          {...textInputProps}
        />
        
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={rightIcon}
              size={20}
              color={error ? '#EF4444' : isFocused ? '#6366F1' : '#6B7280'}
            />
          </TouchableOpacity>
        )}
      </View>

      {(error || helperText) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  labelError: {
    color: '#EF4444',
  },
  inputWrapper: {
    position: 'relative',
  },
  leftIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
    padding: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  errorText: {
    color: '#EF4444',
  },
});

