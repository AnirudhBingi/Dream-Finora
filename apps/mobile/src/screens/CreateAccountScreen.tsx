import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { createAccount, CreateAccountDto } from '../api/financeApi';

interface CreateAccountScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateAccountScreen({ onBack, onSuccess }: CreateAccountScreenProps) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!token) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    try {
      setSaving(true);

      const accountData: CreateAccountDto = {
        name: name.trim(),
        currency: currency || 'USD',
      };

      await createAccount(token, accountData);

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Account</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Main Account, Savings, Cash"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Currency</Text>
              <TextInput
                style={styles.input}
                placeholder="USD"
                value={currency}
                onChangeText={setCurrency}
                autoCapitalize="characters"
                maxLength={3}
              />
              <Text style={styles.helperText}>
                Enter 3-letter currency code (e.g., USD, EUR, GBP)
              </Text>
            </View>

            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={20} color="#2563EB" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                This account will start with a balance of $0.00. Add transactions to track your finances!
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 24, // lg: 24px
  },
  content: {
    paddingHorizontal: 24, // lg: 24px
    // No paddingTop - SafeAreaView handles top spacing
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24, // lg: 24px
  },
  backButton: {
    paddingVertical: 8, // sm: 8px
    paddingHorizontal: 4, // xs: 4px
    minHeight: 44, // Touch target
  },
  backButtonText: {
    fontSize: 16, // Body: 16px
    color: '#2563EB', // Primary Blue
    fontWeight: '500', // Medium
  },
  headerTitle: {
    fontSize: 24, // H2: 24px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
  },
  placeholder: {
    width: 60, // Match back button width
  },
  form: {
    marginTop: 8, // sm: 8px
  },
  inputGroup: {
    marginBottom: 24, // lg: 24px
  },
  label: {
    fontSize: 12, // Labels: 12px
    fontWeight: '500', // Medium
    color: '#374151', // Gray-700
    marginBottom: 4, // xs: 4px
    textTransform: 'uppercase', // Labels: Uppercase
    letterSpacing: 0.5, // Labels: Letter-spacing: 0.5px
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB', // Gray-300
    borderRadius: 8, // Input: 8px
    padding: 12, // md: 12px (3 * 4px)
    paddingHorizontal: 16, // md: 16px
    fontSize: 16, // Input: 16px (prevents zoom on iOS)
    color: '#111827', // Gray-900
  },
  helperText: {
    fontSize: 12, // Small: 12px
    color: '#6B7280', // Gray-500
    marginTop: 4, // xs: 4px
  },
  infoBox: {
    backgroundColor: '#F3F4F6', // Gray-100
    borderRadius: 8, // Button: 8px
    padding: 16, // md: 16px
    marginBottom: 24, // lg: 24px
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12, // md: 12px
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
    lineHeight: 21, // 1.5 line-height
  },
  saveButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12, // md: 12px (3 * 4px)
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563EB', // Primary Blue
  },
  cancelButtonText: {
    color: '#2563EB', // Primary Blue
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
});

