import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Linking } from 'expo-linking';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { acceptUserInvitation } from '../api/friendApi';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordStrengthIndicator, PasswordStrength } from '../components/PasswordStrengthIndicator';
import { SocialSignInButton } from '../components/SocialSignInButton';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export function RegisterScreen({ onSwitchToLogin }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak');
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const { register, token, isAuthenticated } = useAuth();

  useEffect(() => {
    checkInvitationToken();
  }, []);

  useEffect(() => {
    async function acceptInvitationIfNeeded() {
      if (invitationToken && token && isAuthenticated) {
        try {
          await acceptUserInvitation(token, invitationToken);
          Alert.alert('Success', 'You\'ve been added as a friend!');
          setInvitationToken(null);
        } catch (err) {
          console.error('Failed to accept invitation:', err);
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
      console.log('No invitation token in URL');
    }

    const subscription = Linking.addEventListener('url', handleDeepLink);
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
      console.error('Error handling deep link:', err);
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
    setEmailError('');
  };

  const handleMobileChange = (text: string) => {
    setMobileNumber(text);
    setMobileError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError('');
  };

  const handlePasswordStrengthChange = (strength: PasswordStrength) => {
    setPasswordStrength(strength);
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    setConfirmPasswordError('');
  };

  async function handleRegister() {
    // Reset errors
    setEmailError('');
    setMobileError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Validation
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (mobileNumber.trim() && !validateMobile(mobileNumber)) {
      setMobileError('Please provide a valid mobile number (e.g., +1234567890)');
      return;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await register(email.trim(), password, mobileNumber.trim() || undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not create account';
      Alert.alert('Registration Failed', errorMessage);
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
          <Text style={styles.subtitle}>Create your account</Text>

          {/* Invitation Banner */}
          {invitationToken && (
            <View style={styles.invitationBanner}>
              <MaterialIcons name="mail" size={20} color="#6366F1" />
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
                Already have an account?{' '}
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
    marginBottom: 24,
  },
  invitationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  invitationText: {
    flex: 1,
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
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
  registerButton: {
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
