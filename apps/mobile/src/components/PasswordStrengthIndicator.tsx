import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({
  strength,
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const getStrengthConfig = () => {
    switch (strength) {
      case 'weak':
        return {
          color: '#EF4444',
          label: 'Weak',
          width: '25%',
          requirements: {
            minLength: password.length >= 6,
            hasLetter: /[a-zA-Z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[^a-zA-Z\d]/.test(password),
          },
        };
      case 'fair':
        return {
          color: '#F59E0B',
          label: 'Fair',
          width: '50%',
          requirements: {
            minLength: password.length >= 6,
            hasLetter: /[a-zA-Z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[^a-zA-Z\d]/.test(password),
          },
        };
      case 'good':
        return {
          color: '#3B82F6',
          label: 'Good',
          width: '75%',
          requirements: {
            minLength: password.length >= 6,
            hasLetter: /[a-zA-Z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[^a-zA-Z\d]/.test(password),
          },
        };
      case 'strong':
        return {
          color: '#10B981',
          label: 'Strong',
          width: '100%',
          requirements: {
            minLength: password.length >= 6,
            hasLetter: /[a-zA-Z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[^a-zA-Z\d]/.test(password),
          },
        };
    }
  };

  const config = getStrengthConfig();

  return (
    <View style={styles.container}>
      <View style={styles.meterContainer}>
        <View style={styles.meterBackground}>
          <View
            style={[
              styles.meterFill,
              { width: config.width, backgroundColor: config.color },
            ]}
          />
        </View>
        <Text style={[styles.strengthLabel, { color: config.color }]}>
          {config.label}
        </Text>
      </View>

      {showRequirements && password.length > 0 && (
        <View style={styles.requirementsContainer}>
          <RequirementItem
            met={config.requirements.minLength}
            text="At least 6 characters"
          />
          <RequirementItem
            met={config.requirements.hasLetter}
            text="Contains letters"
          />
          <RequirementItem
            met={config.requirements.hasNumber}
            text="Contains numbers"
          />
          <RequirementItem
            met={config.requirements.hasSpecial}
            text="Contains special characters"
          />
        </View>
      )}
    </View>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.requirementItem}>
      <MaterialIcons
        name={met ? 'check-circle' : 'radio-button-unchecked'}
        size={16}
        color={met ? '#10B981' : '#9CA3AF'}
      />
      <Text style={[styles.requirementText, met && styles.requirementMet]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  meterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meterBackground: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
  },
  requirementsContainer: {
    marginTop: 12,
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 12,
    color: '#6B7280',
  },
  requirementMet: {
    color: '#10B981',
    fontWeight: '500',
  },
});

