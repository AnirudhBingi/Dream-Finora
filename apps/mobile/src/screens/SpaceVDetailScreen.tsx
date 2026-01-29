import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Image,
  Modal,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/authContext";
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
} from "../api/listingApi";
import { getSafeImageUri } from "../utils/imageUri";
import { startConversation } from "../api/messagingApi";
import { MaterialIcons } from "@expo/vector-icons";
import { TextInput } from "react-native";
import { SkeletonDetailScreen } from "../components/SkeletonLoader";
import { ErrorState } from "../components/ErrorState";
import { ImageViewerModal } from "../components/ImageViewerModal";
import { useDataFetch } from "../hooks/useDataFetch";
import { Header } from "../components/Header";
import { Avatar } from "../components/Avatar";
import { useTheme } from "../theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const IMAGE_HEIGHT = Math.min(
  560,
  Math.max(300, Math.round(SCREEN_WIDTH * 0.8)),
);

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [comments, setComments] = useState<ListingComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editingComment, setEditingComment] = useState<ListingComment | null>(
    null,
  );
  const [editCommentText, setEditCommentText] = useState("");
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [manageVisible, setManageVisible] = useState(false);
  const commentInputRef = useRef<TextInput>(null);
  const manageSheetAnim = useRef(new Animated.Value(0)).current;

  const {
    data: listing,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<Listing>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getListingById(token, spacevId);
    },
    immediate: true,
    deps: [token, spacevId],
  });

  const loadComments = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingComments(true);
      const commentsData = await getComments(token, spacevId);
      setComments(commentsData);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [token, spacevId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleToggleFavorite() {
    if (!token || !listing || favoriting) return;

    try {
      setFavoriting(true);
      const result = await toggleFavorite(token, listing.id);
      await refetch(); // Reload to get updated favorite status
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to toggle favorite",
      );
    } finally {
      setFavoriting(false);
    }
  }

  async function handleAddComment() {
    if (!token || !commentText.trim() || postingComment) return;

    try {
      setPostingComment(true);
      await addComment(token, spacevId, commentText.trim());
      setCommentText("");
      await loadComments();
      await refetch(); // Update comment count
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to add comment",
      );
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
    setEditCommentText("");
  }

  async function handleSaveEdit() {
    if (!token || !editingComment || !editCommentText.trim()) {
      Alert.alert("Error", "Comment cannot be empty");
      return;
    }

    try {
      await editComment(
        token,
        spacevId,
        editingComment.id,
        editCommentText.trim(),
      );
      setEditingComment(null);
      setEditCommentText("");
      await loadComments();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to edit comment",
      );
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!token) return;

    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(token, spacevId, commentId);
              await loadComments();
              await refetch(); // Update comment count
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to delete comment",
              );
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

      await Share.share({ message: shareLink });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to generate share link",
      );
    } finally {
      setSharing(false);
    }
  }

  async function handleUpdateStatus(status: ListingStatus) {
    if (!token || !listing) return;

    try {
      setUpdating(true);
      await updateListingStatus(token, listing.id, status);
      await refetch();
      if (onRefresh) onRefresh();
      Alert.alert("Success", `SpaceV listing marked as ${status}`);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update SpaceV listing",
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!token || !listing) return;

    Alert.alert(
      "Delete SpaceV Listing",
      "Are you sure you want to delete this SpaceV listing? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setUpdating(true);
              await deleteListing(token, listing.id);
              Alert.alert("Success", "SpaceV listing deleted successfully", [
                { text: "OK", onPress: onBack },
              ]);
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Failed to delete SpaceV listing",
              );
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  }

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function getUserDisplayName(
    user: Listing["user"] | undefined | null,
  ): string {
    if (!user) return "Unknown";
    // Safely access profile and email with proper null checks
    const displayName = user.profile?.displayName;
    const email = user.email;
    return displayName || email || "Unknown";
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  function getListingTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      roommate: "Roommate",
      accommodation: "Accommodation",
      item: "Item",
      event: "Event",
      ride: "Ride",
    };
    return labels[type] || type;
  }

  function getStatusColor(status: ListingStatus): string {
    const colors: Record<ListingStatus, string> = {
      [ListingStatus.ACTIVE]: theme.colors.success,
      [ListingStatus.COMPLETED]: theme.colors.info,
      [ListingStatus.CLOSED]: theme.colors.textSecondary,
    };
    return colors[status] || theme.colors.textSecondary;
  }

  function getStatusLabel(status: ListingStatus): string {
    if (status === ListingStatus.COMPLETED && listing?.type === "item") {
      return "Sold";
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function openManageSheet() {
    setManageVisible(true);
    Animated.timing(manageSheetAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  function closeManageSheet() {
    Animated.timing(manageSheetAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setManageVisible(false));
  }

  const isOwner = listing?.userId === user?.id;

  const images = (listing?.images || [])
    .map((imageUrl) =>
      typeof imageUrl === "string" ? getSafeImageUri(imageUrl) : null,
    )
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  const hasImages = images.length > 0;
  const rightActions = undefined;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="SpaceV Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState
          message={error || "SpaceV listing not found"}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
          <View style={styles.userHeader}>
            <Avatar
              size={50}
              uri={listing.user?.profile?.avatarUrl || undefined}
              name={getUserDisplayName(listing.user)}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {getUserDisplayName(listing.user)}
              </Text>
              <Text style={styles.timestamp}>
                {formatTimeAgo(listing.createdAt)}
              </Text>
            </View>
          </View>

          {hasImages && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageScroll}
            >
              {images.map((imageUrl, index) => (
                <TouchableOpacity
                  key={`${imageUrl}-${index}`}
                  style={styles.imageTouchable}
                  onPress={() => {
                    setViewerIndex(index);
                    setViewerVisible(true);
                  }}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.listingImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
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
                  {formatCurrency(listing.price, listing.currency || "USD")}
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
                  {listing.status.charAt(0).toUpperCase() +
                    listing.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.viewsText}>{listing.views} views</Text>
            </View>

            {listing.location && (
              <View style={styles.locationContainer}>
                <MaterialIcons
                  name="location-on"
                  size={18}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.locationText}>{listing.location}</Text>
              </View>
            )}

            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{listing.description}</Text>
            </View>

            <View style={styles.interactionContainer}>
              <TouchableOpacity
                style={[
                  styles.interactionButton,
                  (favoriting || !token) && styles.interactionButtonDisabled,
                ]}
                onPress={handleToggleFavorite}
                disabled={favoriting || !token}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={listing.isFavorited ? "favorite" : "favorite-border"}
                  size={20}
                  color={
                    listing.isFavorited
                      ? theme.colors.error
                      : theme.colors.gray500
                  }
                />
                <Text
                  style={[
                    styles.interactionButtonText,
                    listing.isFavorited && styles.interactionButtonTextActive,
                  ]}
                >
                  {listing.favoriteCount || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.interactionButton}
                onPress={() => commentInputRef.current?.focus()}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="comment"
                  size={20}
                  color={theme.colors.gray500}
                />
                <Text style={styles.interactionButtonText}>
                  {listing.commentCount || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.interactionButton,
                  (sharing || !token) && styles.interactionButtonDisabled,
                ]}
                onPress={handleShare}
                disabled={sharing || !token}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="share"
                  size={20}
                  color={theme.colors.gray500}
                />
                <Text style={styles.interactionButtonText}>Share</Text>
              </TouchableOpacity>

              {!isOwner && (
                <TouchableOpacity
                  style={[
                    styles.interactionButton,
                    contacting && styles.interactionButtonDisabled,
                  ]}
                  onPress={async () => {
                    if (!token || !listing || contacting) return;
                    try {
                      setContacting(true);
                      const conversation = await startConversation(
                        token,
                        listing?.user?.id || "",
                        `Hi! I'm interested in your SpaceV listing: ${listing.title}`,
                      );
                      if (onNavigateToMessage && listing?.user) {
                        onNavigateToMessage(conversation.id, listing.user);
                      }
                    } catch (err) {
                      Alert.alert(
                        "Error",
                        err instanceof Error
                          ? err.message
                          : "Failed to start conversation",
                      );
                    } finally {
                      setContacting(false);
                    }
                  }}
                  disabled={contacting}
                >
                  {contacting ? (
                    <ActivityIndicator size="small" color={theme.colors.blue} />
                  ) : (
                    <MaterialIcons
                      name="chat-bubble-outline"
                      size={20}
                      color={theme.colors.gray500}
                    />
                  )}
                  <Text style={styles.interactionButtonText}>Contact</Text>
                </TouchableOpacity>
              )}
              {isOwner && (
                <TouchableOpacity
                  style={styles.managePill}
                  onPress={openManageSheet}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="settings"
                    size={14}
                    color={theme.colors.blue}
                  />
                  <Text style={styles.managePillText}>Manage</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text style={styles.commentsSectionTitle}>
                Comments ({listing.commentCount || 0})
              </Text>

              {loadingComments ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.blue}
                  style={styles.commentsLoading}
                />
              ) : comments.length === 0 ? (
                <Text style={styles.noCommentsText}>
                  No comments yet. Be the first to comment!
                </Text>
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
                            {comment?.user?.profile?.displayName ||
                              comment?.user?.email ||
                              "Unknown"}
                          </Text>
                        </TouchableOpacity>
                        {comment.userId === user?.id && (
                          <View style={styles.commentActions}>
                            <TouchableOpacity
                              onPress={() => handleEditComment(comment)}
                              style={styles.editCommentButton}
                            >
                              <MaterialIcons
                                name="edit"
                                size={16}
                                color={theme.colors.blue}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteComment(comment.id)}
                              style={styles.deleteCommentButton}
                            >
                              <MaterialIcons
                                name="delete-outline"
                                size={16}
                                color={theme.colors.error}
                              />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                      <Text style={styles.commentContent}>
                        {comment.content}
                      </Text>
                      <Text style={styles.commentTime}>
                        {new Date(comment.createdAt).toLocaleDateString()}
                        {comment.updatedAt !== comment.createdAt && " (edited)"}
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
                  placeholderTextColor={theme.colors.textTertiary}
                  ref={commentInputRef}
                />
                <TouchableOpacity
                  style={[
                    styles.postCommentButton,
                    (!commentText.trim() || postingComment) &&
                      styles.postCommentButtonDisabled,
                  ]}
                  onPress={handleAddComment}
                  disabled={!commentText.trim() || postingComment}
                >
                  {postingComment ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textInverse}
                    />
                  ) : (
                    <MaterialIcons
                      name="send"
                      size={20}
                      color={theme.colors.textInverse}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={manageVisible}
        transparent
        animationType="none"
        onRequestClose={closeManageSheet}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={closeManageSheet}
          />
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                transform: [
                  {
                    translateY: manageSheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Manage listing</Text>
            <Text style={styles.sheetSubtitle}>{listing.title}</Text>
            <Text style={styles.sheetSection}>Status</Text>
            <View style={styles.statusRow}>
              {[
                ListingStatus.ACTIVE,
                ListingStatus.COMPLETED,
                ListingStatus.CLOSED,
              ].map((status) => {
                const isActive = listing.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      isActive && styles.statusChipActive,
                    ]}
                    onPress={() => {
                      if (isActive) return;
                      closeManageSheet();
                      handleUpdateStatus(status);
                    }}
                    activeOpacity={0.7}
                    disabled={updating || isActive}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        isActive && styles.statusChipTextActive,
                      ]}
                    >
                      {getStatusLabel(status)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.managementActions}>
              <TouchableOpacity
                style={styles.managementButton}
                onPress={() => {
                  closeManageSheet();
                  onEdit?.(spacevId);
                }}
                activeOpacity={0.7}
                disabled={!onEdit}
              >
                <MaterialIcons
                  name="edit"
                  size={18}
                  color={theme.colors.blue}
                />
                <Text style={styles.managementButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.managementButton, styles.deleteButton]}
                onPress={() => {
                  closeManageSheet();
                  handleDelete();
                }}
                activeOpacity={0.7}
                disabled={updating}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={18}
                  color={theme.colors.error}
                />
                <Text
                  style={[styles.managementButtonText, styles.deleteButtonText]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.sheetClose}
              onPress={closeManageSheet}
            >
              <Text style={styles.sheetCloseText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <ImageViewerModal
        images={images}
        visible={viewerVisible}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />

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
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={styles.modalCloseButton}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              value={editCommentText}
              onChangeText={setEditCommentText}
              placeholder="Update your comment..."
              placeholderTextColor={theme.colors.textTertiary}
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

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: 0,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray500,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    errorText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      textAlign: "center",
      marginBottom: theme.spacing.base,
    },
    userHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.base,
      paddingVertical: theme.spacing.base,
      paddingHorizontal: theme.spacing.xl,
    },
    userInfo: {
      marginLeft: theme.spacing.base,
      flex: 1,
    },
    userName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    timestamp: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    imageScroll: {
      marginBottom: theme.spacing.base,
      width: SCREEN_WIDTH,
    },
    imageTouchable: {
      width: SCREEN_WIDTH,
      height: IMAGE_HEIGHT,
    },
    listingImage: {
      width: SCREEN_WIDTH,
      height: IMAGE_HEIGHT,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    listingCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.base,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.base,
      marginHorizontal: theme.spacing.base,
      marginTop: theme.spacing.base,
    },
    listingHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: theme.spacing.md,
    },
    listingType: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      marginBottom: theme.spacing.xs,
    },
    listingTitle: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    listingPrice: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.base,
      gap: theme.spacing.md,
    },
    statusBadge: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.spacing.base,
    },
    statusText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textInverse,
      textTransform: "uppercase",
    },
    viewsText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.base,
      gap: theme.spacing.xs,
    },
    locationText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    descriptionContainer: {
      marginBottom: theme.spacing.base,
    },
    descriptionLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      marginBottom: theme.spacing.sm,
    },
    descriptionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      lineHeight: 24,
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: "flex-end",
    },
    sheetBackdrop: {
      flex: 1,
    },
    sheetContainer: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: theme.spacing.lg,
      paddingBottom: 36,
    },
    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      alignSelf: "center",
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.gray200,
    },
    sheetTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    sheetSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 4,
      marginBottom: theme.spacing.base,
    },
    sheetSection: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray500,
      textTransform: "uppercase",
      marginBottom: theme.spacing.sm,
    },
    statusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.base,
    },
    statusChip: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    statusChipActive: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    statusChipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    statusChipTextActive: {
      color: theme.colors.textInverse,
    },
    managementActions: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.base,
    },
    managementButton: {
      flex: 1,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.blueLight,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    managementButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.blue,
    },
    deleteButton: {
      backgroundColor: theme.colors.errorBackground,
    },
    deleteButtonText: {
      color: theme.colors.error,
    },
    sheetClose: {
      alignSelf: "center",
      paddingVertical: theme.spacing.sm,
    },
    sheetCloseText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    interactionContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: theme.spacing.base,
      paddingHorizontal: theme.spacing.xl,
    },
    interactionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginRight: theme.spacing.base,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    managePill: {
      marginLeft: "auto",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      borderRadius: theme.spacing.lg,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.blueLight,
    },
    managePillText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.blue,
    },
    interactionButtonDisabled: {
      opacity: 0.5,
    },
    interactionButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    interactionButtonTextActive: {
      color: theme.colors.error,
    },
    commentsSection: {
      marginTop: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: theme.spacing.xl,
    },
    commentsSectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
    },
    commentsLoading: {
      marginVertical: theme.spacing.base,
    },
    noCommentsText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: theme.spacing.xl,
    },
    commentsList: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.base,
    },
    commentCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    commentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    commentAuthor: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    commentActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    editCommentButton: {
      padding: theme.spacing.xs,
    },
    deleteCommentButton: {
      padding: theme.spacing.xs,
    },
    commentContent: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      lineHeight: 20,
      marginBottom: theme.spacing.xs,
    },
    commentTime: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray400,
    },
    addCommentContainer: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      alignItems: "flex-end",
    },
    commentInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: theme.spacing.sm,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      minHeight: 44,
      maxHeight: 100,
    },
    postCommentButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    postCommentButtonDisabled: {
      opacity: 0.5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: theme.spacing.lg,
      paddingBottom: 40,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.base,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    modalCloseButton: {
      padding: theme.spacing.xs,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      minHeight: 100,
      marginBottom: theme.spacing.base,
    },
    modalActions: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.sm,
      alignItems: "center",
    },
    modalCancelButton: {
      backgroundColor: theme.colors.backgroundTertiary,
    },
    modalCancelButtonText: {
      color: theme.colors.gray700,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    modalSaveButton: {
      backgroundColor: theme.colors.blue,
    },
    modalSaveButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
