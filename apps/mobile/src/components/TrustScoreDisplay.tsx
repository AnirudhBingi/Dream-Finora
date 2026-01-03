import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface TrustScoreDisplayProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  onPress?: () => void;
}

export function TrustScoreDisplay({
  score,
  size = 'medium',
  showLabel = true,
  onPress,
}: TrustScoreDisplayProps) {
  const color = getTrustScoreColor(score);
  const sizeStyles = getSizeStyles(size);

  const content = (
    <View style={[styles.container, sizeStyles.container, onPress && styles.pressable]}>
      <View style={[styles.circle, sizeStyles.circle, { borderColor: color }]}>
        <Text style={[styles.score, sizeStyles.score, { color }]}>
          {score}
        </Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, sizeStyles.label]}>Trust Score</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

export function TrustScoreBadge({ score, size = 'small' }: { score: number; size?: 'small' | 'medium' }) {
  const color = getTrustScoreColor(score);
  const badgeSize = size === 'small' ? 20 : 24;

  return (
    <View style={[styles.badge, { backgroundColor: `${color}20`, width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
      <MaterialIcons name="star" size={badgeSize * 0.6} color={color} />
    </View>
  );
}

function getTrustScoreColor(score: number): string {
  if (score >= 90) return '#10B981'; // Green
  if (score >= 70) return '#3B82F6'; // Blue
  if (score >= 50) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}

function getSizeStyles(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return {
        container: { marginVertical: 4 },
        circle: { width: 48, height: 48, borderRadius: 24 },
        score: { fontSize: 16, fontWeight: '600' as const },
        label: { fontSize: 10, marginTop: 4 },
      };
    case 'large':
      return {
        container: { marginVertical: 8 },
        circle: { width: 120, height: 120, borderRadius: 60 },
        score: { fontSize: 48, fontWeight: '700' as const },
        label: { fontSize: 16, marginTop: 8 },
      };
    default: // medium
      return {
        container: { marginVertical: 6 },
        circle: { width: 80, height: 80, borderRadius: 40 },
        score: { fontSize: 32, fontWeight: '700' as const },
        label: { fontSize: 14, marginTop: 6 },
      };
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    opacity: 1,
  },
  circle: {
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  score: {
    fontWeight: '700',
  },
  label: {
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

