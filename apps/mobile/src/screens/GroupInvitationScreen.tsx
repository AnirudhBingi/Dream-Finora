import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getGroupInvitation, acceptGroupInvitation, declineGroupInvitation, GroupInvitation } from '../api/groupApi';

interface GroupInvitationScreenProps {
  invitationToken: string;
  onBack: () => void;
  onAccept?: (groupId: string) => void;
}

export function GroupInvitationScreen({
  invitationToken,
  onBack,
  onAccept,
}: GroupInvitationScreenProps) {
  const { token, user } = useAuth();
  const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitation();
  }, [token, invitationToken]);

  async function loadInvitation() {
    if (!token) {
      setError('Please log in to view this invitation');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getGroupInvitation(token);
      setInvitation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!token || !invitation) return;

    try {
      setProcessing(true);
      const result = await acceptGroupInvitation(token, invitationToken);
      Alert.alert('Success', `You've joined "${result.groupName}"!`, [
        { text: 'OK', onPress: () => {
          onAccept?.(result.groupId);
          onBack();
        }},
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setProcessing(false);
    }
  }

  async function handleDecline() {
    if (!token || !invitation) return;

    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await declineGroupInvitation(token, invitationToken);
              Alert.alert('Success', 'Invitation declined', [
                { text: 'OK', onPress: onBack },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to decline invitation');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }

  function isExpired(): boolean {
    if (!invitation) return false;
    return new Date() > new Date(invitation.expiresAt);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading invitation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invitation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invitation</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Invitation not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInvitation}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const expired = isExpired();
  const alreadyProcessed = invitation.status !== 'pending';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Invitation</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Inviter Info */}
          <View style={styles.inviterCard}>
            <View style={styles.inviterAvatar}>
              {invitation.inviter.profile?.avatarUrl ? (
                <Image
                  source={{ uri: invitation.inviter.profile.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {(invitation.inviter.profile?.displayName || invitation.inviter.email || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.inviterName}>
              {invitation.inviter.profile?.displayName || invitation.inviter.email}
            </Text>
            <Text style={styles.inviterLabel}>invited you to join</Text>
          </View>

          {/* Group Info */}
          <View style={styles.groupCard}>
            <View style={styles.groupIcon}>
              <MaterialIcons name="group" size={32} color="#2563EB" />
            </View>
            <Text style={styles.groupName}>{invitation.group.name}</Text>
            {invitation.group.description && (
              <Text style={styles.groupDescription}>{invitation.group.description}</Text>
            )}
            <Text style={styles.groupMeta}>
              Created {formatDate(invitation.group.createdAt)}
            </Text>
          </View>

          {/* Status Messages */}
          {expired && (
            <View style={styles.statusCard}>
              <MaterialIcons name="schedule" size={24} color="#EF4444" />
              <Text style={styles.statusText}>This invitation has expired</Text>
            </View>
          )}

          {alreadyProcessed && !expired && (
            <View style={styles.statusCard}>
              <MaterialIcons
                name={invitation.status === 'accepted' ? 'check-circle' : 'cancel'}
                size={24}
                color={invitation.status === 'accepted' ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.statusText}>
                This invitation has been {invitation.status}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {!expired && !alreadyProcessed && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.acceptButton, processing && styles.buttonDisabled]}
                onPress={handleAccept}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.acceptButtonText}>Join Group</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.declineButton, processing && styles.buttonDisabled]}
                onPress={handleDecline}
                disabled={processing}
              >
                <MaterialIcons name="cancel" size={20} color="#EF4444" />
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inviterCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inviterAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inviterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  inviterLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  groupCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  groupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  actionsContainer: {
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  declineButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

