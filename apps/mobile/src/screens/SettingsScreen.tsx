import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { CurrencyPicker, SUPPORTED_CURRENCIES } from '../components/CurrencyPicker';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { token, user } = useAuth();
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('USD');
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [token]);

  async function loadSettings() {
    if (!token) return;

    try {
      const profile = await getProfile(token);
      if (profile) {
        setPrimaryCurrency(profile.primaryCurrency || 'USD');
        setHomeCountryCurrency(profile.homeCountryCurrency || 'USD');
      } else {
        setPrimaryCurrency('USD');
        setHomeCountryCurrency('USD');
      }
    } catch (err) {
      // Default to USD if loading fails
    setPrimaryCurrency('USD');
    setHomeCountryCurrency('USD');
    }
  }

  async function handleSaveCurrency() {
    if (!token) return;

    try {
      setSaving(true);
      await updateProfile(token, {
        primaryCurrency,
        homeCountryCurrency,
      });
      Alert.alert('Success', 'Currency preferences saved successfully');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to save currency preferences',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Settings</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Currency Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Currency & Wallet</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Primary Currency</Text>
                <Text style={styles.settingDescription}>
                  Default currency for displaying Billchop balances and expenses
                </Text>
              </View>
              <CurrencyPicker
                selectedCurrency={primaryCurrency}
                onSelectCurrency={setPrimaryCurrency}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Home Country Currency</Text>
                <Text style={styles.settingDescription}>
                  Currency for your personal finances (My Wallet accounts and transactions)
                </Text>
              </View>
              <CurrencyPicker
                selectedCurrency={homeCountryCurrency}
                onSelectCurrency={setHomeCountryCurrency}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveCurrency}
              disabled={saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Currency Preferences</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Notification Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive push notifications for expenses, chores, and messages
                </Text>
              </View>
              <Switch
                value={true}
                onValueChange={(value) => {
                  // TODO: Save notification preference
                  Alert.alert('Info', 'Notification settings will be saved in a future update');
                }}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive email notifications for important updates
                </Text>
              </View>
              <Switch
                value={false}
                onValueChange={(value) => {
                  // TODO: Save email notification preference
                  Alert.alert('Info', 'Email notification settings will be saved in a future update');
                }}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* App Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                Alert.alert('Info', 'About screen coming soon');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>About</Text>
                <Text style={styles.settingDescription}>
                  App version and information
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                Alert.alert('Info', 'Privacy policy coming soon');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
                <Text style={styles.settingDescription}>
                  How we handle your data
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                Alert.alert('Info', 'Terms of service coming soon');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Terms of Service</Text>
                <Text style={styles.settingDescription}>
                  Terms and conditions
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
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
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 60,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

