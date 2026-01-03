import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons name="error-outline" size={64} color="#EF4444" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    minHeight: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

/**
 * Helper function to get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return 'The requested item could not be found.';
    }

    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') || message.includes('403')) {
      return 'You do not have permission to perform this action.';
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401') || message.includes('token')) {
      return 'Your session has expired. Please log in again.';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Please check your input and try again.';
    }

    // Server errors
    if (message.includes('server') || message.includes('500') || message.includes('internal')) {
      return 'A server error occurred. Please try again later.';
    }

    // Return the original message if we can't categorize it
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

