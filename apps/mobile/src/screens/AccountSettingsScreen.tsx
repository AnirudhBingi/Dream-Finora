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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import {
  getAccountInfo,
  changePassword,
  updateEmail,
  deleteAccount,
  AccountInfo,
  ChangePasswordDto,
  UpdateEmailDto,
  DeleteAccountDto,
} from '../api/accountApi';

interface AccountSettingsScreenProps {
  onBack: () => void;
}

export function AccountSettingsScreen({ onBack }: AccountSettingsScreenProps) {
  const { token, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  
  // Email update state
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  
  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    loadAccountInfo();
  }, [token]);

  async function loadAccountInfo() {
    if (!token) return;

    try {
      setLoading(true);
      const info = await getAccountInfo(token);
      setAccountInfo(info);
      setNewEmail(info.email);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load account info');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateEmail() {
    if (!token || !accountInfo) return;

    if (!newEmail || !emailPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newEmail === accountInfo.email) {
      Alert.alert('Info', 'Email is the same as current email');
      return;
    }

    try {
      setUpdatingEmail(true);
      const data: UpdateEmailDto = {
        email: newEmail.trim(),
        password: emailPassword,
      };
      await updateEmail(token, data);
      Alert.alert('Success', 'Email updated successfully', [
        { text: 'OK', onPress: () => {
          setEmailPassword('');
          loadAccountInfo();
        }},
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      setUpdatingEmail(false);
    }
  }

  async function handleChangePassword() {
    if (!token) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      const data: ChangePasswordDto = {
        currentPassword,
        newPassword,
      };
      await changePassword(token, data);
      Alert.alert('Success', 'Password changed successfully', [
        { text: 'OK', onPress: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setShowPasswordFields(false);
        }},
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!token || !deletePassword) {
      Alert.alert('Error', 'Please enter your password to confirm account deletion');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAccount(true);
              const data: DeleteAccountDto = { password: deletePassword };
              await deleteAccount(token, data);
              Alert.alert('Account Deleted', 'Your account has been deleted successfully', [
                { text: 'OK', onPress: logout },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete account');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading account info...</Text>
        </View>
      </View>
    );
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
            <Text style={styles.title}>Account Settings</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Account Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{accountInfo?.email}</Text>
              {accountInfo?.emailVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={16} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Account Created</Text>
              <Text style={styles.infoValue}>
                {accountInfo?.createdAt
                  ? new Date(accountInfo.createdAt).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Update Email */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Email</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Email</Text>
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Enter new email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={emailPassword}
                onChangeText={setEmailPassword}
                placeholder="Enter your password to confirm"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, updatingEmail && styles.saveButtonDisabled]}
              onPress={handleUpdateEmail}
              disabled={updatingEmail}
              activeOpacity={0.7}
            >
              {updatingEmail ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Update Email</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Change Password */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change Password</Text>
            
            {!showPasswordFields ? (
              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={() => setShowPasswordFields(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="lock" size={20} color="#2563EB" />
                <Text style={styles.changePasswordButtonText}>Change Password</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Current Password</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min 6 characters)"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.saveButton, styles.halfButton, changingPassword && styles.saveButtonDisabled]}
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                    activeOpacity={0.7}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelButton, styles.halfButton]}
                    onPress={() => {
                      setShowPasswordFields(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Delete Account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            
            {!showDeleteConfirm ? (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => setShowDeleteConfirm(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.dangerText}>
                  This action cannot be undone. All your data will be permanently deleted.
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Enter Password to Confirm</Text>
                  <TextInput
                    style={styles.input}
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.deleteConfirmButton, styles.halfButton, deletingAccount && styles.saveButtonDisabled]}
                    onPress={handleDeleteAccount}
                    disabled={deletingAccount}
                    activeOpacity={0.7}
                  >
                    {deletingAccount ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelButton, styles.halfButton]}
                    onPress={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
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
  infoItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  halfButton: {
    flex: 1,
  },
  changePasswordButton: {
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
  },
  changePasswordButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
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
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  dangerText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteConfirmButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

