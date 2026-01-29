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
import { useAuth } from "../auth/authContext";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { PasswordInput } from "../components/PasswordInput";
import { SocialSignInButton } from "../components/SocialSignInButton";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

interface LoginScreenProps {
  onSwitchToRegister: () => void;
  onForgotPassword?: () => void;
}

export function LoginScreen({
  onSwitchToRegister,
  onForgotPassword,
}: LoginScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { login } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile: string): boolean => {
    const mobileRegex = /^\+?[1-9]\d{1,14}$/;
    return mobileRegex.test(mobile);
  };

  const handleIdentifierChange = (text: string) => {
    setIdentifier(text);
    setIdentifierError("");
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError("");
  };

  const { execute: handleLogin, loading: isLoading } = useAsyncOperation({
    operationFn: async () => {
      // Reset errors
      setIdentifierError("");
      setPasswordError("");

      // Validation
      if (!identifier.trim()) {
        setIdentifierError("Please enter your email or mobile number");
        throw new Error("Please enter your email or mobile number");
      }

      if (
        !validateEmail(identifier.trim()) &&
        !validateMobile(identifier.trim())
      ) {
        setIdentifierError("Please enter a valid email or mobile number");
        throw new Error("Please enter a valid email or mobile number");
      }

      if (!password.trim()) {
        setPasswordError("Please enter your password");
        throw new Error("Please enter your password");
      }

      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters");
        throw new Error("Password must be at least 6 characters");
      }

      await login(identifier.trim(), password);
      // Navigation will happen automatically via auth state change
    },
    onError: (errorMessage) => {
      setPasswordError(errorMessage);
    },
  });

  function handleGoogleSignIn() {
    Alert.alert(
      "Coming Soon",
      "Google sign-in will be available soon! Please use email and password for now.",
      [{ text: "OK" }],
    );
  }

  function handleAppleSignIn() {
    Alert.alert(
      "Coming Soon",
      "Apple sign-in will be available soon! Please use email and password for now.",
      [{ text: "OK" }],
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
          {/* Logo/Icon Placeholder */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>DF</Text>
            </View>
          </View>

          {/* Hero Section */}
          <Text style={styles.title}>Dream Finora</Text>
          <Text style={styles.subtitle}>Your trusted travel companion</Text>

          {/* Social Sign-In Buttons */}
          <View style={styles.socialContainer}>
            <SocialSignInButton
              provider="google"
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            />
            {Platform.OS === "ios" && (
              <SocialSignInButton
                provider="apple"
                onPress={handleAppleSignIn}
                disabled={isLoading}
                style={styles.appleButton}
              />
            )}
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email/Password Form */}
          <View style={styles.form}>
            <InputField
              label="Email or Mobile Number"
              placeholder="Enter your email or mobile number"
              value={identifier}
              onChangeText={handleIdentifierChange}
              error={identifierError}
              leftIcon="email"
              autoCapitalize="none"
              keyboardType="default"
              autoComplete="username"
              editable={!isLoading}
            />

            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={handlePasswordChange}
              error={passwordError}
              leftIcon="lock"
              editable={!isLoading}
            />

            {onForgotPassword && (
              <Button
                title="Forgot Password?"
                onPress={onForgotPassword}
                variant="text"
                size="small"
                style={styles.forgotPasswordButton}
              />
            )}

            <Button
              title="Login"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
            />

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                Don't have an account?{" "}
                <Text
                  style={styles.switchTextBold}
                  onPress={onSwitchToRegister}
                >
                  Register
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
    logoText: {
      fontSize: theme.typography.fontSize["4xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textInverse,
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
    },
    socialContainer: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    appleButton: {
      marginTop: 0,
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: theme.spacing.base,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    form: {
      width: "100%",
    },
    forgotPasswordButton: {
      alignSelf: "flex-end",
      marginTop: -theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    loginButton: {
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
  });
