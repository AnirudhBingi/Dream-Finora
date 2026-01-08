import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useAuth } from '../auth/authContext';
import { CurrencyPicker, SUPPORTED_CURRENCIES } from '../components/CurrencyPicker';
import { getProfile, updateProfile } from '../api/profileApi';
import { exportExpensesCSV, exportTransactionsCSV, exportAllDataJSON, saveAndShareCSV, saveAndShareJSON } from '../api/exportApi';
import { inviteUserToApp } from '../api/friendApi';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigateToAccount?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function SettingsScreen({ onBack, onNavigateToAccount, onNavigateToProfile, onNavigateToNotifications, onNavigateToSettings }: SettingsScreenProps) {
  const { token, user, logout } = useAuth();
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('USD');
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>('USD');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [pushNotifications, setPushNotifications] = useState<boolean>(true);
  const [expenseReminders, setExpenseReminders] = useState<boolean>(true);
  const [choreReminders, setChoreReminders] = useState<boolean>(true);
  const [messageNotifications, setMessageNotifications] = useState<boolean>(true);
  const [listingNotifications, setListingNotifications] = useState<boolean>(true);
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [trustScoreVisibility, setTrustScoreVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [exportingExpenses, setExportingExpenses] = useState(false);
  const [exportingTransactions, setExportingTransactions] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMobile, setInviteMobile] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [token]);

  async function loadSettings() {
    if (!token) return;

    try {
      setLoading(true);
      const profile = await getProfile(token);
      if (profile) {
        setPrimaryCurrency(profile.primaryCurrency || 'USD');
        setHomeCountryCurrency(profile.homeCountryCurrency || 'USD');
        setNotificationsEnabled(profile.notificationsEnabled ?? true);
        setEmailNotifications(profile.emailNotifications ?? true);
        setPushNotifications(profile.pushNotifications ?? true);
        setExpenseReminders(profile.expenseReminders ?? true);
        setChoreReminders(profile.choreReminders ?? true);
        setMessageNotifications(profile.messageNotifications ?? true);
        setListingNotifications(profile.listingNotifications ?? true);
        setProfileVisibility(profile.profileVisibility || 'public');
        setTrustScoreVisibility(profile.trustScoreVisibility || 'public');
      } else {
        setPrimaryCurrency('USD');
        setHomeCountryCurrency('USD');
      }
    } catch (err) {
      // Default values if loading fails
      setPrimaryCurrency('USD');
      setHomeCountryCurrency('USD');
    } finally {
      setLoading(false);
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

  async function handleSaveNotifications() {
    if (!token) return;

    try {
      setSavingNotifications(true);
      await updateProfile(token, {
        notificationsEnabled,
        emailNotifications,
        pushNotifications,
        expenseReminders,
        choreReminders,
        messageNotifications,
        listingNotifications,
      });
      Alert.alert('Success', 'Notification preferences saved successfully');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to save notification preferences',
      );
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleExportExpenses() {
    if (!token) return;

    try {
      setExportingExpenses(true);
      const csv = await exportExpensesCSV(token);
      const filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      await saveAndShareCSV(csv, filename);
      Alert.alert('Success', 'Expenses exported successfully');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to export expenses');
    } finally {
      setExportingExpenses(false);
    }
  }

  async function handleExportTransactions() {
    if (!token) return;

    try {
      setExportingTransactions(true);
      const csv = await exportTransactionsCSV(token);
      const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      await saveAndShareCSV(csv, filename);
      Alert.alert('Success', 'Finance data exported successfully');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to export finance data');
    } finally {
      setExportingTransactions(false);
    }
  }

  async function handleExportAll() {
    if (!token) return;

    try {
      setExportingAll(true);
      const data = await exportAllDataJSON(token);
      const filename = `dreamfinora_export_${new Date().toISOString().split('T')[0]}.json`;
      await saveAndShareJSON(data, filename);
      Alert.alert('Success', 'All data exported successfully');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExportingAll(false);
    }
  }

  async function handleSavePrivacy() {
    if (!token) return;

    try {
      setSavingPrivacy(true);
      await updateProfile(token, {
        profileVisibility,
        trustScoreVisibility,
      });
      Alert.alert('Success', 'Privacy preferences saved successfully');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to save privacy preferences',
      );
    } finally {
      setSavingPrivacy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Settings"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        showSettings={false}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>

          {/* Account & Profile Navigation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account & Profile</Text>
            
            {onNavigateToAccount && (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={onNavigateToAccount}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Account Settings</Text>
                  <Text style={styles.settingDescription}>
                    Email, password, security, and account management
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#6B7280" />
              </TouchableOpacity>
            )}

            {onNavigateToProfile && (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={onNavigateToProfile}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>My Space</Text>
                  <Text style={styles.settingDescription}>
                    Profile, display name, avatar, bio, and preferences
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#6B7280" />
              </TouchableOpacity>
            )}
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
                <Text style={styles.settingLabel}>Enable Notifications</Text>
                <Text style={styles.settingDescription}>
                  Master switch for all notifications
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive push notifications for expenses, chores, and messages
                </Text>
              </View>
              <Switch
                value={pushNotifications && notificationsEnabled}
                onValueChange={setPushNotifications}
                disabled={!notificationsEnabled}
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
                value={emailNotifications && notificationsEnabled}
                onValueChange={setEmailNotifications}
                disabled={!notificationsEnabled}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Expense Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get notified about expense updates and settlements
                </Text>
              </View>
              <Switch
                value={expenseReminders && notificationsEnabled}
                onValueChange={setExpenseReminders}
                disabled={!notificationsEnabled}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Chore Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get notified about chore assignments and due dates
                </Text>
              </View>
              <Switch
                value={choreReminders && notificationsEnabled}
                onValueChange={setChoreReminders}
                disabled={!notificationsEnabled}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Message Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get notified when you receive new messages
                </Text>
              </View>
              <Switch
                value={messageNotifications && notificationsEnabled}
                onValueChange={setMessageNotifications}
                disabled={!notificationsEnabled}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Listing Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get notified about listing interactions and interest
                </Text>
              </View>
              <Switch
                value={listingNotifications && notificationsEnabled}
                onValueChange={setListingNotifications}
                disabled={!notificationsEnabled}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, savingNotifications && styles.saveButtonDisabled]}
              onPress={handleSaveNotifications}
              disabled={savingNotifications}
              activeOpacity={0.7}
            >
              {savingNotifications ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Notification Preferences</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Privacy Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Profile Visibility</Text>
                <Text style={styles.settingDescription}>
                  Who can see your profile information
                </Text>
              </View>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    const options = ['public', 'friends', 'private'];
                    const currentIndex = options.indexOf(profileVisibility);
                    const nextIndex = (currentIndex + 1) % options.length;
                    setProfileVisibility(options[nextIndex] as 'public' | 'friends' | 'private');
                  }}
                >
                  <Text style={styles.pickerText}>
                    {profileVisibility.charAt(0).toUpperCase() + profileVisibility.slice(1)}
                  </Text>
                  <Icon name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Trust Score Visibility</Text>
                <Text style={styles.settingDescription}>
                  Who can see your trust score
                </Text>
              </View>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    const options = ['public', 'friends', 'private'];
                    const currentIndex = options.indexOf(trustScoreVisibility);
                    const nextIndex = (currentIndex + 1) % options.length;
                    setTrustScoreVisibility(options[nextIndex] as 'public' | 'friends' | 'private');
                  }}
                >
                  <Text style={styles.pickerText}>
                    {trustScoreVisibility.charAt(0).toUpperCase() + trustScoreVisibility.slice(1)}
                  </Text>
                  <Icon name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, savingPrivacy && styles.saveButtonDisabled]}
              onPress={handleSavePrivacy}
              disabled={savingPrivacy}
              activeOpacity={0.7}
            >
              {savingPrivacy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Privacy Preferences</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Data Export */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Export</Text>
            <Text style={styles.sectionDescription}>
              Export your data for backup or analysis
            </Text>

            <TouchableOpacity
              style={[styles.exportButton, exportingExpenses && styles.exportButtonDisabled]}
              onPress={handleExportExpenses}
              disabled={exportingExpenses}
              activeOpacity={0.7}
            >
              {exportingExpenses ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <>
                  <MaterialIcons name="file-download" size={20} color="#2563EB" />
                  <Text style={styles.exportButtonText}>Export Expenses (CSV)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, exportingTransactions && styles.exportButtonDisabled]}
              onPress={handleExportTransactions}
              disabled={exportingTransactions}
              activeOpacity={0.7}
            >
              {exportingTransactions ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <>
                  <MaterialIcons name="file-download" size={20} color="#2563EB" />
                  <Text style={styles.exportButtonText}>Export Finance Data (CSV)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, exportingAll && styles.exportButtonDisabled]}
              onPress={handleExportAll}
              disabled={exportingAll}
              activeOpacity={0.7}
            >
              {exportingAll ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <>
                  <MaterialIcons name="download" size={20} color="#2563EB" />
                  <Text style={styles.exportButtonText}>Export All Data (JSON)</Text>
                </>
              )}
            </TouchableOpacity>
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
              <Icon name="chevron-right" size={24} color="#6B7280" />
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
              <Icon name="chevron-right" size={24} color="#6B7280" />
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
              <Icon name="chevron-right" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                Alert.alert(
                  'Logout',
                  'Are you sure you want to logout?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Logout',
                      style: 'destructive',
                      onPress: async () => {
                        await logout();
                      },
                    },
                  ],
                );
              }}
              activeOpacity={0.7}
            >
              <Icon name="logout" size={20} color="#EF4444" />
              <Text style={styles.logoutButtonText}>Logout</Text>
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    minWidth: 100,
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
  },
});

