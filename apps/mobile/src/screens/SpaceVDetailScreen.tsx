import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/authContext';
import {
  getListingById,
  Listing,
  ListingStatus,
  updateListingStatus,
  deleteListing,
  toggleFavorite,
  getComments,
  addComment,
  editComment,
  deleteComment,
  generateShareLink,
  ListingComment,
} from '../api/listingApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { startConversation } from '../api/messagingApi';
import { MaterialIcons } from '@expo/vector-icons';
import { TextInput } from 'react-native';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { Header } from '../components/Header';

interface SpaceVDetailScreenProps {
  spacevId: string;
  onBack: () => void;
  onRefresh?: () => void;
  onNavigateToMessage?: (chatId: string, otherUser: any) => void;
  onEdit?: (spacevId: string) => void;
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function SpaceVDetailScreen({
  spacevId,
  onBack,
  onRefresh,
  onNavigateToMessage,
  onEdit,
  onNavigateToUserProfile,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: SpaceVDetailScreenProps) {
  const { token, user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [comments, setComments] = useState<ListingComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editingComment, setEditingComment] = useState<ListingComment | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  useEffect(() => {
    loadListing();
    loadComments();
  }, [token, spacevId]);

  async function loadListing() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const listingData = await getListingById(token, spacevId);
      setListing(listingData);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadComments() {
    if (!token) return;

    try {
      setLoadingComments(true);
      const commentsData = await getComments(token, spacevId);
      setComments(commentsData);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleToggleFavorite() {
    if (!token || !listing || favoriting) return;

    try {
      setFavoriting(true);
      const result = await toggleFavorite(token, listing.id);
      await loadListing(); // Reload to get updated favorite status
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to toggle favorite');
    } finally {
      setFavoriting(false);
    }
  }

  async function handleAddComment() {
    if (!token || !commentText.trim() || postingComment) return;

    try {
      setPostingComment(true);
      await addComment(token, spacevId, commentText.trim());
      setCommentText('');
      await loadComments();
      await loadListing(); // Update comment count
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setPostingComment(false);
    }
  }

  function handleEditComment(comment: ListingComment) {
    setEditingComment(comment);
    setEditCommentText(comment.content);
  }

  function handleCancelEdit() {
    setEditingComment(null);
    setEditCommentText('');
  }

  async function handleSaveEdit() {
    if (!token || !editingComment || !editCommentText.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    try {
      await editComment(token, spacevId, editingComment.id, editCommentText.trim());
      setEditingComment(null);
      setEditCommentText('');
      await loadComments();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to edit comment');
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!token) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComment(token, spacevId, commentId);
              await loadComments();
              await loadListing(); // Update comment count
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete comment');
            }
          },
        },
      ],
    );
  }

  async function handleShare() {
    if (!token || !listing || sharing) return;

    try {
      setSharing(true);
      const { shareLink } = await generateShareLink(token, listing.id);
      
      // Show share link in alert (user can manually copy)
      Alert.alert(
        'Share Link',
        shareLink,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setSharing(false);
    }
  }

  async function handleUpdateStatus(status: ListingStatus) {
    if (!token || !listing) return;

    try {
      setUpdating(true);
      await updateListingStatus(token, listing.id, status);
      await loadListing();
      if (onRefresh) onRefresh();
      Alert.alert('Success', `SpaceV listing marked as ${status}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update SpaceV listing');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!token || !listing) return;

    Alert.alert(
      'Delete SpaceV Listing',
      'Are you sure you want to delete this SpaceV listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await deleteListing(token, listing.id);
              Alert.alert('Success', 'SpaceV listing deleted successfully', [
                { text: 'OK', onPress: onBack },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete SpaceV listing');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  function getUserDisplayName(user: Listing['user'] | undefined | null): string {
    if (!user) return 'Unknown';
    // Safely access profile and email with proper null checks
    const displayName = user.profile?.displayName;
    const email = user.email;
    return displayName || email || 'Unknown';
  }

  function getListingTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      roommate: 'Roommate',
      accommodation: 'Accommodation',
      item: 'Item',
      event: 'Event',
      ride: 'Ride',
    };
    return labels[type] || type;
  }

  function getStatusColor(status: ListingStatus): string {
    const colors: Record<ListingStatus, string> = {
      [ListingStatus.ACTIVE]: '#10B981',
      [ListingStatus.COMPLETED]: '#3B82F6',
      [ListingStatus.CLOSED]: '#6B7280',
    };
    return colors[status] || '#6B7280';
  }

  // Prepare right actions for header (Edit and Delete buttons for owner)
  const isOwner = listing?.userId === user?.id;
  const rightActions = listing && isOwner ? (
    <>
      {onEdit && (
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => onEdit(spacevId)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Edit listing"
        >
          <MaterialIcons name="edit" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.headerActionButton}
        onPress={handleDelete}
        activeOpacity={0.7}
        disabled={updating}
        accessibilityRole="button"
        accessibilityLabel="Delete listing"
      >
        <MaterialIcons name="delete-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </>
  ) : undefined;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="SpaceV Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="SpaceV Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error || 'SpaceV listing not found'} onRetry={loadListing} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="SpaceV Details"
        onBack={onBack}
        rightActions={rightActions}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>

          {listing.images && listing.images.length > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageScroll}
            >
              {listing.images.map((imageUrl, index) => (
                <Image
                  key={index}
                  source={{
                    uri: imageUrl.startsWith('http')
                      ? imageUrl
                      : `${getApiBaseUrl()}${imageUrl}`,
                  }}
                  style={styles.listingImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.listingCard}>
            <View style={styles.listingHeader}>
              <View>
                <Text style={styles.listingType}>
                  {getListingTypeLabel(listing.type)}
                </Text>
                <Text style={styles.listingTitle}>{listing.title}</Text>
              </View>
              {listing.price && (
                <Text style={styles.listingPrice}>
                  {formatCurrency(listing.price, listing.currency || 'USD')}
                </Text>
              )}
            </View>

            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(listing.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.viewsText}>{listing.views} views</Text>
            </View>

            {listing.location && (
              <View style={styles.locationContainer}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>{listing.location}</Text>
              </View>
            )}

            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{listing.description}</Text>
            </View>

            <TouchableOpacity
              style={styles.creatorContainer}
              onPress={() => {
                if (onNavigateToUserProfile && listing?.user?.id) {
                  onNavigateToUserProfile(listing.user.id);
                }
              }}
              activeOpacity={0.7}
              disabled={!onNavigateToUserProfile || !listing?.user?.id}
            >
              <Text style={styles.creatorLabel}>Posted by</Text>
              <Text style={styles.creatorText}>{getUserDisplayName(listing?.user)}</Text>
            </TouchableOpacity>

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text style={styles.commentsSectionTitle}>
                Comments ({listing.commentCount || 0})
              </Text>

              {loadingComments ? (
                <ActivityIndicator size="small" color="#2563EB" style={styles.commentsLoading} />
              ) : comments.length === 0 ? (
                <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
              ) : (
                <View style={styles.commentsList}>
                  {comments.map((comment) => (
                    <View key={comment.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <TouchableOpacity
                          onPress={() => {
                            if (onNavigateToUserProfile && comment.userId) {
                              onNavigateToUserProfile(comment.userId);
                            }
                          }}
                          activeOpacity={0.7}
                          disabled={!onNavigateToUserProfile || !comment.userId}
                        >
                          <Text style={styles.commentAuthor}>
                            {comment?.user?.profile?.displayName || comment?.user?.email || 'Unknown'}
                          </Text>
                        </TouchableOpacity>
                        {comment.userId === user?.id && (
                          <View style={styles.commentActions}>
                            <TouchableOpacity
                              onPress={() => handleEditComment(comment)}
                              style={styles.editCommentButton}
                            >
                              <MaterialIcons name="edit-outline" size={16} color="#2563EB" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteComment(comment.id)}
                              style={styles.deleteCommentButton}
                            >
                              <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                      <Text style={styles.commentTime}>
                        {new Date(comment.createdAt).toLocaleDateString()}
                        {comment.updatedAt !== comment.createdAt && ' (edited)'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Comment Form */}
              <View style={styles.addCommentContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  style={[
                    styles.postCommentButton,
                    (!commentText.trim() || postingComment) && styles.postCommentButtonDisabled,
                  ]}
                  onPress={handleAddComment}
                  disabled={!commentText.trim() || postingComment}
                >
                  {postingComment ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialIcons name="send" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {isOwner && (
              <View style={styles.ownerActions}>
                <Text style={styles.ownerActionsLabel}>Manage SpaceV Listing</Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => {
                    if (onEdit) {
                      onEdit(spacevId);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="edit" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Edit SpaceV</Text>
                </TouchableOpacity>
                {listing.status === ListingStatus.ACTIVE && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleUpdateStatus(ListingStatus.COMPLETED)}
                      disabled={updating}
                    >
                      <Text style={styles.actionButtonText}>Mark as Completed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.closeButton]}
                      onPress={() => handleUpdateStatus(ListingStatus.CLOSED)}
                      disabled={updating}
                    >
                      <Text style={styles.actionButtonText}>Close Listing</Text>
                    </TouchableOpacity>
                  </>
                )}
                {(listing.status === ListingStatus.COMPLETED ||
                  listing.status === ListingStatus.CLOSED) && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.reopenButton]}
                    onPress={() => handleUpdateStatus(ListingStatus.ACTIVE)}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Reopen Listing</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={handleDelete}
                  disabled={updating}
                >
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                    Delete SpaceV Listing
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!isOwner && (
              <TouchableOpacity
                style={[styles.contactButton, contacting && styles.contactButtonDisabled]}
                onPress={async () => {
                  if (!token || !listing || contacting) return;

                  try {
                    setContacting(true);
                    const conversation = await startConversation(
                      token,
                      listing?.user?.id || '',
                      `Hi! I'm interested in your SpaceV listing: ${listing.title}`,
                    );
                    if (onNavigateToMessage && listing?.user) {
                      onNavigateToMessage(conversation.id, listing.user);
                    }
                  } catch (err) {
                    Alert.alert(
                      'Error',
                      err instanceof Error ? err.message : 'Failed to start conversation',
                    );
                  } finally {
                    setContacting(false);
                  }
                }}
                disabled={contacting}
              >
                {contacting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.contactButtonText}>Contact Creator</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Edit Comment Modal */}
      <Modal
        visible={editingComment !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Comment</Text>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              value={editCommentText}
              onChangeText={setEditCommentText}
              placeholder="Update your comment..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveEdit}
                disabled={!editCommentText.trim()}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerActionButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  imageScroll: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listingImage: {
    width: 350,
    height: 250,
    backgroundColor: '#F3F4F6',
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  listingType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  listingPrice: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  viewsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#374151',
  },
  descriptionContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  creatorContainer: {
    marginBottom: 16,
  },
  creatorLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  creatorText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  ownerActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ownerActionsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  closeButton: {
    backgroundColor: '#6B7280',
  },
  reopenButton: {
    backgroundColor: '#2563EB',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  editButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#fff',
  },
  contactButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  contactButtonDisabled: {
    opacity: 0.6,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  interactionContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  interactionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  interactionButtonTextActive: {
    color: '#EF4444',
  },
  commentsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  commentsLoading: {
    marginVertical: 16,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
  commentsList: {
    gap: 12,
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  commentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editCommentButton: {
    padding: 4,
  },
  deleteCommentButton: {
    padding: 4,
  },
  commentContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  addCommentContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 44,
    maxHeight: 100,
  },
  postCommentButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCommentButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalCancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#2563EB',
  },
  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

