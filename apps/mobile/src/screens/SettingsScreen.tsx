import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/authContext';
import { getProfile, updateProfile, Profile } from '../api/profileApi';
import { useDataFetch } from '../hooks/useDataFetch';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import {
  exportExpensesCSV,
  exportTransactionsCSV,
  exportAllDataJSON,
  saveAndShareCSV,
  saveAndShareJSON,
} from '../api/exportApi';
import { inviteUserToApp } from '../api/friendApi';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { SettingsSection } from '../components/SettingsSection';
import { SettingsToggle } from '../components/SettingsToggle';
import { SettingsPicker, type SettingsPickerOption } from '../components/SettingsPicker';
import { SettingsButton } from '../components/SettingsButton';
import { SettingsDivider } from '../components/SettingsDivider';
import { ErrorState } from '../components/ErrorState';
import { theme } from '../theme';
import { useBottomNavPadding } from '../hooks/useBottomNavPadding';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToAccount?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

const CURRENCY_OPTIONS: SettingsPickerOption[] = [
  { label: 'US Dollar (USD)', value: 'USD' },
  { label: 'Euro (EUR)', value: 'EUR' },
  { label: 'British Pound (GBP)', value: 'GBP' },
  { label: 'Indian Rupee (INR)', value: 'INR' },
  { label: 'Canadian Dollar (CAD)', value: 'CAD' },
  { label: 'Australian Dollar (AUD)', value: 'AUD' },
  { label: 'Japanese Yen (JPY)', value: 'JPY' },
];

const THEME_OPTIONS: SettingsPickerOption[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

const FONT_SIZE_OPTIONS: SettingsPickerOption[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

const VISIBILITY_OPTIONS: SettingsPickerOption[] = [
  { label: 'Public', value: 'public' },
  { label: 'Friends Only', value: 'friends' },
  { label: 'Private', value: 'private' },
];

export function SettingsScreen({
  onBack,
  onNavigateToProfile,
  onNavigateToAccount,
  onNavigateToNotifications,
  onNavigateToSettings,
}: SettingsScreenProps) {
  const { token, user, logout } = useAuth();
  const bottomPadding = useBottomNavPadding();

  // State for all settings
  const [theme_, setTheme] = useState('system');
  const [fontSize, setFontSize] = useState('medium');
  const [highContrast, setHighContrast] = useState(false);
  const [primaryCurrency, setPrimaryCurrency] = useState('USD');
  const [homeCountryCurrency, setHomeCountryCurrency] = useState('USD');

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [expenseReminders, setExpenseReminders] = useState(true);
  const [choreReminders, setChoreReminders] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [listingNotifications, setListingNotifications] = useState(true);

  const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [trustScoreVisibility, setTrustScoreVisibility] = useState<'public' | 'friends' | 'private'>('public');

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMobile, setInviteMobile] = useState('');

  // Fetch profile
  const { data: profile, loading, error } = useDataFetch<Profile>({
    fetchFn: async () => {
      if (!token) throw new Error('No authentication token');
      return getProfile(token);
    },
    immediate: true,
    deps: [token],
    transform: (data: Profile) => {
      if (data) {
        setTheme(data.theme || 'system');
        setFontSize(data.fontSize || 'medium');
        setHighContrast(data.highContrast ?? false);
        setPrimaryCurrency(data.primaryCurrency || 'USD');
        setHomeCountryCurrency(data.homeCountryCurrency || 'USD');
        setNotificationsEnabled(data.notificationsEnabled ?? true);
        setEmailNotifications(data.emailNotifications ?? true);
        setPushNotifications(data.pushNotifications ?? true);
        setExpenseReminders(data.expenseReminders ?? true);
        setChoreReminders(data.choreReminders ?? true);
        setMessageNotifications(data.messageNotifications ?? true);
        setListingNotifications(data.listingNotifications ?? true);
        setProfileVisibility((data.profileVisibility as any) || 'public');
        setTrustScoreVisibility((data.trustScoreVisibility as any) || 'public');
      }
      return data;
    },
  });

  // Save settings
  const { execute: saveSettings, loading: savingSettings } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error('No authentication token');
      return updateProfile(token, {
        theme: theme_,
        fontSize,
        highContrast,
        primaryCurrency,
        homeCountryCurrency,
        notificationsEnabled,
        emailNotifications,
        pushNotifications,
        expenseReminders,
        choreReminders,
        messageNotifications,
        listingNotifications,
        profileVisibility,
        trustScoreVisibility,
      });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Settings saved successfully');
    },
  });

  // Save notification preferences
  const { execute: saveNotifications, loading: savingNotifications } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error('No authentication token');
      return updateProfile(token, {
        notificationsEnabled,
        emailNotifications,
        pushNotifications,
        expenseReminders,
        choreReminders,
        messageNotifications,
        listingNotifications,
      });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Notification preferences saved');
    },
  });

  // Export data
  const { execute: exportExpenses, loading: exportingExpenses } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error('No authentication token');
      const csv = await exportExpensesCSV(token);
      const filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      await saveAndShareCSV(csv, filename);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Expenses exported');
    },
  });

  const { execute: exportTransactions, loading: exportingTransactions } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error('No authentication token');
      const csv = await exportTransactionsCSV(token);
      const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      await saveAndShareCSV(csv, filename);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Transactions exported');
    },
  });

  const { execute: exportAll, loading: exportingAll } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error('No authentication token');
      const data = await exportAllDataJSON(token);
      const filename = `dreamfinora_export_${new Date().toISOString().split('T')[0]}.json`;
      await saveAndShareJSON(data, filename);
    },
    onSuccess: () => {
      Alert.alert('Success', 'All data exported');
    },
  });

  // Invite user
  const { execute: handleInvite, loading: inviting } = useAsyncOperation({
    operationFn: async () => {
      if (!inviteEmail && !inviteMobile) {
        throw new Error('Please enter email or mobile number');
      }
      return inviteUserToApp(token!, {
        email: inviteEmail || undefined,
        mobileNumber: inviteMobile || undefined,
      });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Invitation sent');
      setInviteEmail('');
      setInviteMobile('');
      setShowInviteForm(false);
    },
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: () => logout(),
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Settings" onBack={onBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Settings" onBack={onBack} />
        <ErrorState message={error} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Settings" onBack={onBack} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account & Profile Section */}
        <SettingsSection title="Account & Profile" defaultExpanded={true}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={onNavigateToProfile}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>Edit Profile</Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <SettingsDivider />

          <SettingsPicker
            label="Profile Visibility"
            value={profileVisibility}
            onChange={(value) => setProfileVisibility(value as any)}
            options={VISIBILITY_OPTIONS}
            description="Who can see your profile"
          />

          <SettingsPicker
            label="Trust Score Visibility"
            value={trustScoreVisibility}
            onChange={(value) => setTrustScoreVisibility(value as any)}
            options={VISIBILITY_OPTIONS}
            description="Who can see your trust score"
          />

          <SettingsDivider />

          <SettingsButton
            label="Save Privacy Settings"
            onPress={() => saveSettings()}
            loading={savingSettings}
          />
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection title="Preferences">
          <SettingsPicker
            label="Theme"
            value={theme_}
            onChange={setTheme}
            options={THEME_OPTIONS}
            description="Choose your preferred theme"
          />

          <SettingsPicker
            label="Font Size"
            value={fontSize}
            onChange={setFontSize}
            options={FONT_SIZE_OPTIONS}
            description="Adjust text size for readability"
          />

          <SettingsToggle
            label="High Contrast"
            value={highContrast}
            onChange={setHighContrast}
            description="Increase visual contrast for accessibility"
          />

          <SettingsDivider />

          <SettingsPicker
            label="Primary Currency"
            value={primaryCurrency}
            onChange={setPrimaryCurrency}
            options={CURRENCY_OPTIONS}
            description="Default currency for expenses"
          />

          <SettingsPicker
            label="Home Country Currency"
            value={homeCountryCurrency}
            onChange={setHomeCountryCurrency}
            options={CURRENCY_OPTIONS}
            description="Your home currency for reference"
          />

          <SettingsDivider />

          <SettingsButton
            label="Save Preferences"
            onPress={() => saveSettings()}
            loading={savingSettings}
          />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications">
          <SettingsToggle
            label="All Notifications"
            value={notificationsEnabled}
            onChange={setNotificationsEnabled}
            description="Enable or disable all notifications"
          />

          <SettingsDivider />

          <SettingsToggle
            label="Email Notifications"
            value={emailNotifications}
            onChange={setEmailNotifications}
            description="Receive updates via email"
            disabled={!notificationsEnabled}
          />

          <SettingsToggle
            label="Push Notifications"
            value={pushNotifications}
            onChange={setPushNotifications}
            description="Receive push notifications on device"
            disabled={!notificationsEnabled}
          />

          <SettingsDivider />

          <SettingsToggle
            label="Expense Reminders"
            value={expenseReminders}
            onChange={setExpenseReminders}
            description="Get reminded about pending expenses"
            disabled={!notificationsEnabled}
          />

          <SettingsToggle
            label="Chore Reminders"
            value={choreReminders}
            onChange={setChoreReminders}
            description="Get reminded about assigned chores"
            disabled={!notificationsEnabled}
          />

          <SettingsToggle
            label="Message Notifications"
            value={messageNotifications}
            onChange={setMessageNotifications}
            description="Get notified about new messages"
            disabled={!notificationsEnabled}
          />

          <SettingsToggle
            label="Listing Notifications"
            value={listingNotifications}
            onChange={setListingNotifications}
            description="Get notified about listing activity"
            disabled={!notificationsEnabled}
          />

          <SettingsDivider />

          <SettingsButton
            label="Save Notification Settings"
            onPress={() => saveNotifications()}
            loading={savingNotifications}
          />
        </SettingsSection>

        {/* Data & Privacy Section */}
        <SettingsSection title="Data & Privacy">
          <SettingsButton
            label="Export Expenses (CSV)"
            onPress={() => exportExpenses()}
            loading={exportingExpenses}
          />

          <SettingsButton
            label="Export Transactions (CSV)"
            onPress={() => exportTransactions()}
            loading={exportingTransactions}
          />

          <SettingsButton
            label="Export All Data (JSON)"
            onPress={() => exportAll()}
            loading={exportingAll}
            variant="secondary"
          />
        </SettingsSection>

        {/* Support & About Section */}
        <SettingsSection title="Support & About">
          <SettingsButton
            label="Invite User to App"
            onPress={() => setShowInviteForm(true)}
            variant="secondary"
          />

          <SettingsButton
            label="Logout"
            onPress={handleLogout}
            variant="danger"
          />
        </SettingsSection>

        <View style={{ height: bottomPadding }} />
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteForm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteForm(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInviteForm(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite User</Text>

            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={styles.orText}>OR</Text>

            <TextInput
              style={styles.input}
              placeholder="Mobile number"
              value={inviteMobile}
              onChangeText={setInviteMobile}
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <SettingsButton
              label="Send Invitation"
              onPress={() => handleInvite()}
              loading={inviting}
            />

            <SettingsButton
              label="Cancel"
              onPress={() => setShowInviteForm(false)}
              variant="secondary"
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundSecondary,
  },
  settingLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: theme.spacing.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  orText: {
    textAlign: 'center',
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
  },
});
