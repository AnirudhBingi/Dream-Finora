import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const getStrengthConfig = () => {
    switch (strength) {
      case "weak":
        return {
          color: theme.colors.error,
          label: "Weak",
          widthPercent: 25,
          requirements: {
            minLength: password.length >= 6,
            hasLetter: /[a-zA-Z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[^a-zA-Z\d]/.test(password),
          },
        };
      case "fair":
        return {
          color: theme.colors.warning,
          label: "Fair",
          widthPercent: 50,
          requirements: {
            minLength: password.length >= 6,
            hasLetter: /[a-zA-Z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[^a-zA-Z\d]/.test(password),
          },
        };
      case "good":
        return {
          color: theme.colors.blue,
          label: "Good",
          widthPercent: 75,
          requirements: {
            minLength: password.length >= 6,
            hasLetter: /[a-zA-Z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[^a-zA-Z\d]/.test(password),
          },
        };
      case "strong":
        return {
          color: theme.colors.success,
          label: "Strong",
          widthPercent: 100,
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

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => {
    return (
      <View style={styles.requirementItem}>
        <MaterialIcons
          name={met ? "check-circle" : "radio-button-unchecked"}
          size={16}
          color={met ? theme.colors.success : theme.colors.textTertiary}
        />
        <Text style={[styles.requirementText, met && styles.requirementMet]}>
          {text}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.meterContainer}>
        <View style={styles.meterBackground}>
          <View
            style={[
              styles.meterFill,
              {
                flex: 0,
                width: `${config.widthPercent}%`,
                backgroundColor: config.color,
              },
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

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    meterContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    meterBackground: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      overflow: "hidden",
    },
    meterFill: {
      height: "100%",
      borderRadius: 2,
    },
    strengthLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      minWidth: 50,
    },
    requirementsContainer: {
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    requirementItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    requirementText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    requirementMet: {
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
