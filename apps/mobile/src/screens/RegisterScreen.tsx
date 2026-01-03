import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Linking } from 'expo-linking';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { acceptUserInvitation } from '../api/friendApi';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export function RegisterScreen({ onSwitchToLogin }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const { register, token, isAuthenticated } = useAuth();

  useEffect(() => {
    // Check for invitation token in URL
    checkInvitationToken();
  }, []);

  // Accept invitation after successful registration
  useEffect(() => {
    async function acceptInvitationIfNeeded() {
      if (invitationToken && token && isAuthenticated) {
        try {
          await acceptUserInvitation(token, invitationToken);
          Alert.alert('Success', 'You\'ve been added as a friend!');
          setInvitationToken(null); // Clear token after acceptance
        } catch (err) {
          console.error('Failed to accept invitation:', err);
          // Don't show error to user - invitation might have expired or been used
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
          await loadInvitationDetails(inviteToken);
        }
      }
    } catch (err) {
      console.log('No invitation token in URL');
    }

    // Also listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }

  async function handleDeepLink(event: { url: string }) {
    try {
      const parsed = Linking.parse(event.url);
      const inviteToken = parsed.queryParams?.invite as string;
      if (inviteToken) {
        setInvitationToken(inviteToken);
        await loadInvitationDetails(inviteToken);
      }
    } catch (err) {
      console.error('Error handling deep link:', err);
    }
  }

  async function loadInvitationDetails(token: string) {
    try {
      setLoadingInvitation(true);
      // Try to fetch invitation details (this endpoint might not require auth)
      // If it fails, we'll just store the token and accept it after registration
      try {
        // Note: getUserInvitation might require auth, so we'll handle errors gracefully
        // For now, we'll just store the token and accept it after registration
      } catch (err) {
        // It's okay if we can't fetch details now - we'll accept after registration
        console.log('Could not fetch invitation details (will accept after registration)');
      }
    } catch (err) {
      console.error('Failed to load invitation:', err);
    } finally {
      setLoadingInvitation(false);
    }
  }

  async function handleRegister() {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    // Validate mobile number format if provided (E.164 format: +1234567890)
    if (mobileNumber.trim() && !/^\+?[1-9]\d{1,14}$/.test(mobileNumber.trim())) {
      Alert.alert('Error', 'Please provide a valid mobile number (e.g., +1234567890)');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting registration for:', email.trim());
      await register(email.trim(), password, mobileNumber.trim() || undefined);
      console.log('Registration successful');
      
      // If there's an invitation token, accept it after registration
      // Note: We'll need to wait for auth state to update, so we'll handle this
      // in a useEffect that watches for token changes, or we can do it here with a delay
      if (invitationToken) {
        // Store the invitation token to accept after auth state updates
        // The acceptance will happen in a useEffect that watches for token changes
        console.log('Invitation token will be accepted after auth state updates');
      }
      
      // Navigation will happen automatically via auth state change
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not create account';
      console.error('Registration error:', error);
      console.error('Error message:', errorMessage);
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Dream Finora</Text>
        <Text style={styles.subtitle}>Create Account</Text>

        {invitationToken && (
          <View style={styles.invitationBanner}>
            <MaterialIcons name="mail" size={20} color="#2563EB" />
            <Text style={styles.invitationText}>
              You've been invited to join Dream Finora!
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email *"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Mobile Number (optional, e.g., +1234567890)"
            placeholderTextColor="#9CA3AF"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            autoCapitalize="none"
            keyboardType="phone-pad"
            autoComplete="tel"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters) *"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#9CA3AF"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={onSwitchToLogin}
            disabled={isLoading}
          >
            <Text style={styles.switchText}>
              Already have an account? <Text style={styles.switchTextBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    color: '#6B7280',
    fontSize: 14,
  },
  switchTextBold: {
    color: '#2563EB',
    fontWeight: '600',
  },
});

