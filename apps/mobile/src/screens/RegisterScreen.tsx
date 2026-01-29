import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import * as Linking from "expo-linking";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
// Note: acceptUserInvitation will be implemented when invitation system is ready
// import { acceptUserInvitation } from '../api/friendApi';
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { PasswordInput } from "../components/PasswordInput";
import {
  PasswordStrengthIndicator,
  PasswordStrength,
} from "../components/PasswordStrengthIndicator";
import { SocialSignInButton } from "../components/SocialSignInButton";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export function RegisterScreen({ onSwitchToLogin }: RegisterScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] =
    useState<PasswordStrength>("weak");
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const { register, token, isAuthenticated } = useAuth();

  useEffect(() => {
    checkInvitationToken();
  }, []);

  // Accept invitation after successful registration
  useEffect(() => {
    async function acceptInvitationIfNeeded() {
      if (invitationToken && token && isAuthenticated) {
        try {
          // TODO: Implement acceptUserInvitation when invitation system is ready
          // await acceptUserInvitation(token, invitationToken);
          console.log("Invitation token received:", invitationToken);
          Alert.alert(
            "Success",
            "Registration successful! Invitation will be processed.",
          );
          setInvitationToken(null);
        } catch (err) {
          console.error("Failed to accept invitation:", err);
        }
      }
    }
    acceptInvitationIfNeeded();
  }, [token, isAuthenticated, invitationToken]);

  async function checkInvitationToken() {
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        const parsed = Linking.parse(url);
        const inviteToken = parsed.queryParams?.invite as string;
        if (inviteToken) {
          setInvitationToken(inviteToken);
        }
      }
    } catch (err) {
      console.log("No invitation token in URL");
    }

    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }

  async function handleDeepLink(event: { url: string }) {
    try {
      const parsed = Linking.parse(event.url);
      const inviteToken = parsed.queryParams?.invite as string;
      if (inviteToken) {
        setInvitationToken(inviteToken);
      }
    } catch (err) {
      console.error("Error handling deep link:", err);
    }
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile: string): boolean => {
    if (!mobile.trim()) return true; // Optional
    const mobileRegex = /^\+?[1-9]\d{1,14}$/;
    return mobileRegex.test(mobile.trim());
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError("");
  };

  const handleMobileChange = (text: string) => {
    setMobileNumber(text);
    setMobileError("");
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError("");
  };

  const handlePasswordStrengthChange = (strength: PasswordStrength) => {
    setPasswordStrength(strength);
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    setConfirmPasswordError("");
  };

  const { execute: handleRegister, loading: isLoading } = useAsyncOperation({
    operationFn: async () => {
      // Reset errors
      setEmailError("");
      setMobileError("");
      setPasswordError("");
      setConfirmPasswordError("");

      // Validation
      if (!email.trim()) {
        setEmailError("Please enter your email");
        throw new Error("Please enter your email");
      }

      if (!validateEmail(email.trim())) {
        setEmailError("Please enter a valid email address");
        throw new Error("Please enter a valid email address");
      }

      if (mobileNumber.trim() && !validateMobile(mobileNumber.trim())) {
        setMobileError("Please enter a valid mobile number");
        throw new Error("Please enter a valid mobile number");
      }

      if (!password.trim()) {
        setPasswordError("Please enter a password");
        throw new Error("Please enter a password");
      }

      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters");
        throw new Error("Password must be at least 6 characters");
      }

      if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match");
        throw new Error("Passwords do not match");
      }

      await register(email.trim(), password, mobileNumber.trim() || undefined);
      // Navigation will happen automatically via auth state change
    },
    onError: (errorMessage) => {
      if (
        !emailError &&
        !mobileError &&
        !passwordError &&
        !confirmPasswordError
      ) {
        setPasswordError(errorMessage);
      }
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
          <Text style={styles.subtitle}>Create your account</Text>

          {/* Invitation Banner */}
          {invitationToken && (
            <View style={styles.invitationBanner}>
              <MaterialIcons
                name="mail"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.invitationText}>
                You've been invited to join Dream Finora!
              </Text>
            </View>
          )}

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

          {/* Registration Form */}
          <View style={styles.form}>
            <InputField
              label="Email *"
              placeholder="Enter your email"
              value={email}
              onChangeText={handleEmailChange}
              error={emailError}
              leftIcon="email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isLoading}
            />

            <InputField
              label="Mobile Number (optional)"
              placeholder="e.g., +1234567890"
              value={mobileNumber}
              onChangeText={handleMobileChange}
              error={mobileError}
              leftIcon="phone"
              autoCapitalize="none"
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!isLoading}
            />

            <PasswordInput
              label="Password *"
              placeholder="Create a password (min 6 characters)"
              value={password}
              onChangeText={handlePasswordChange}
              error={passwordError}
              leftIcon="lock"
              showStrengthIndicator={true}
              onStrengthChange={handlePasswordStrengthChange}
              editable={!isLoading}
            />

            {password.length > 0 && (
              <PasswordStrengthIndicator
                strength={passwordStrength}
                password={password}
                showRequirements={true}
              />
            )}

            <PasswordInput
              label="Confirm Password *"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              error={confirmPasswordError}
              leftIcon="lock"
              editable={!isLoading}
            />

            <Button
              title="Register"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              style={styles.registerButton}
            />

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                Already have an account?{" "}
                <Text style={styles.switchTextBold} onPress={onSwitchToLogin}>
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
      marginBottom: theme.spacing.xl,
    },
    invitationBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primaryBackground,
      padding: theme.spacing.md,
      borderRadius: 12,
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    invitationText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
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
    registerButton: {
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
