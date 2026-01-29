import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { useTheme } from "../theme";

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordScreen({
  onBackToLogin,
}: ForgotPasswordScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError("");
  };

  async function handleSendResetLink() {
    setEmailError("");

    if (!email.trim()) {
      setEmailError("Please enter your email address");
      return;
    }

    if (!validateEmail(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement forgot password API call
      // await forgotPassword(email.trim());

      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsSubmitted(true);
      Alert.alert(
        "Reset Link Sent",
        "We've sent a password reset link to your email. Please check your inbox.",
        [{ text: "OK", onPress: onBackToLogin }],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send reset link. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.successIconContainer}>
              <MaterialIcons
                name="check-circle"
                size={80}
                color={theme.colors.success}
              />
            </View>
            <Text style={styles.successTitle}>Reset Link Sent!</Text>
            <Text style={styles.successMessage}>
              We've sent a password reset link to{"\n"}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
            <Text style={styles.successSubtext}>
              Please check your email and follow the instructions to reset your
              password.
            </Text>
            <Button
              title="Back to Login"
              onPress={onBackToLogin}
              style={styles.backButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <Button
            title="← Back"
            onPress={onBackToLogin}
            variant="text"
            size="small"
            style={styles.backButtonTop}
          />

          {/* Logo/Icon Placeholder */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <MaterialIcons
                name="lock-reset"
                size={40}
                color={theme.colors.white}
              />
            </View>
          </View>

          {/* Hero Section */}
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your email and we'll send you a reset link.
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <InputField
              label="Email Address"
              placeholder="Enter your email address"
              value={email}
              onChangeText={handleEmailChange}
              error={emailError}
              leftIcon="email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isLoading}
            />

            <Button
              title="Send Reset Link"
              onPress={handleSendResetLink}
              loading={isLoading}
              disabled={isLoading}
              style={styles.sendButton}
            />

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                Remember your password?{" "}
                <Text style={styles.switchTextBold} onPress={onBackToLogin}>
                  Login
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing["4xl"],
      paddingBottom: theme.spacing["2xl"],
    },
    backButtonTop: {
      alignSelf: "flex-start",
      marginBottom: theme.spacing.base,
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: theme.spacing.base,
    },
    logoPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: theme.typography.fontSize["4xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      textAlign: "center",
      marginBottom: theme.spacing["2xl"],
      lineHeight: 24,
    },
    form: {
      width: "100%",
    },
    sendButton: {
      marginTop: theme.spacing.sm,
    },
    switchContainer: {
      marginTop: theme.spacing.xl,
      alignItems: "center",
    },
    switchText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    switchTextBold: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    successIconContainer: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    successTitle: {
      fontSize: theme.typography.fontSize["3xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: "center",
      marginBottom: theme.spacing.base,
    },
    successMessage: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray700,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
      lineHeight: 24,
    },
    emailText: {
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    successSubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing["2xl"],
      lineHeight: 20,
    },
    backButton: {
      marginTop: 8,
    },
  });
