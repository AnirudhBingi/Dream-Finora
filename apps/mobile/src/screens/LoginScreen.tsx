import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../auth/authContext';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import { PasswordInput } from '../components/PasswordInput';
import { SocialSignInButton } from '../components/SocialSignInButton';

interface LoginScreenProps {
  onSwitchToRegister: () => void;
  onForgotPassword?: () => void;
}

export function LoginScreen({ onSwitchToRegister, onForgotPassword }: LoginScreenProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
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
    setIdentifierError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError('');
  };

  async function handleLogin() {
    // Reset errors
    setIdentifierError('');
    setPasswordError('');

    // Validation
    if (!identifier.trim()) {
      setIdentifierError('Please enter your email or mobile number');
      return;
    }

    if (!validateEmail(identifier.trim()) && !validateMobile(identifier.trim())) {
      setIdentifierError('Please enter a valid email or mobile number');
      return;
    }

    if (!password.trim()) {
      setPasswordError('Please enter your password');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
      // Navigation will happen automatically via auth state change
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid email/mobile number or password';
      setPasswordError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleSignIn() {
    Alert.alert(
      'Coming Soon',
      'Google sign-in will be available soon! Please use email and password for now.',
      [{ text: 'OK' }]
    );
  }

  function handleAppleSignIn() {
    Alert.alert(
      'Coming Soon',
      'Apple sign-in will be available soon! Please use email and password for now.',
      [{ text: 'OK' }]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            {Platform.OS === 'ios' && (
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
                Don't have an account?{' '}
                <Text style={styles.switchTextBold} onPress={onSwitchToRegister}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1', // Indigo
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 32,
  },
  socialContainer: {
    gap: 12,
    marginBottom: 24,
  },
  appleButton: {
    marginTop: 0,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    width: '100%',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  loginButton: {
    marginTop: 8,
  },
  switchContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#6B7280',
  },
  switchTextBold: {
    color: '#6366F1',
    fontWeight: '600',
  },
});
