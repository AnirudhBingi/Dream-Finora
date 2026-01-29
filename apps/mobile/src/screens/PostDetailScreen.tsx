import React, { useMemo, useState, useEffect, useCallback } from "react";
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
  TextInput,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getPostById,
  toggleLike,
  getPostComments,
  addPostComment,
  deletePostComment,
  sharePost,
  updatePost,
  deletePost,
  Post,
  PostComment,
} from "../api/postApi";
import { getApiBaseUrl } from "../api/getApiBaseUrl";
import { getSafeImageUri } from "../utils/imageUri";
import { Header } from "../components/Header";
import { Avatar } from "../components/Avatar";
import { SkeletonDetailScreen } from "../components/SkeletonLoader";
import { ErrorState } from "../components/ErrorState";
import { ImageViewerModal } from "../components/ImageViewerModal";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const IMAGE_HEIGHT = Math.min(
  560,
  Math.max(300, Math.round(SCREEN_WIDTH * 0.8)),
);

interface PostDetailScreenProps {
  postId: string;
  onBack: () => void;
  onRefresh?: () => void;
  onEdit?: (postId: string) => void;
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function PostDetailScreen({
  postId,
  onBack,
  onRefresh,
  onEdit,
  onNavigateToUserProfile,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: PostDetailScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const {
    data: post,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<Post>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getPostById(token, postId);
    },
    immediate: true,
    deps: [token, postId],
  });

  const loadComments = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingComments(true);
      const commentsData = await getPostComments(token, postId);
      setComments(commentsData);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [token, postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleToggleLike() {
    if (!token || !post || liking) return;

    try {
      setLiking(true);
      await toggleLike(token, post.id);
      await refetch(); // Reload to get updated like status
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to toggle like",
      );
    } finally {
      setLiking(false);
    }
  }

  async function handleAddComment() {
    if (!token || !commentText.trim() || postingComment) return;

    try {
      setPostingComment(true);
      await addPostComment(token, postId, commentText.trim());
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
              await deletePostComment(token, postId, commentId);
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
    if (!token || !post || sharing) return;

    try {
      setSharing(true);
      await sharePost(token, post.id);

      // Create share link (similar to listings)
      const shareLink = `${getApiBaseUrl()}/posts/${post.id}`;

      await Share.share({ message: shareLink });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to share post",
      );
    } finally {
      setSharing(false);
    }
  }

  async function handleDelete() {
    if (!token || !post || deleting) return;

    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deletePost(token, post.id);
              Alert.alert("Success", "Post deleted successfully", [
                { text: "OK", onPress: onBack },
              ]);
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to delete post",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  function getUserDisplayName(postUser?: Post["user"]): string {
    if (!postUser) return "Unknown";
    return postUser.profile?.displayName || postUser.email || "Unknown";
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

  const isOwner = post && user && post.userId === user.id;

  const images = (post?.images || [])
    .map((imageUri) =>
      typeof imageUri === "string" ? getSafeImageUri(imageUri) : null,
    )
    .filter((imageUri): imageUri is string => Boolean(imageUri));
  const hasImages = images.length > 0;

  const rightActions = isOwner ? (
    <View style={styles.headerActions}>
      {onEdit && (
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => onEdit(post.id)}
        >
          <MaterialIcons name="edit" size={24} color={theme.colors.blue} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.headerActionButton}
        onPress={handleDelete}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator size="small" color={theme.colors.error} />
        ) : (
          <MaterialIcons
            name="delete-outline"
            size={24}
            color={theme.colors.error}
          />
        )}
      </TouchableOpacity>
    </View>
  ) : undefined;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Post Details"
          onBack={onBack}
          rightActions={rightActions}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Post Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState
          message={error || "Failed to load post"}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Post Details"
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
          {/* User Header */}
          <TouchableOpacity
            style={styles.userHeader}
            onPress={() => {
              const userId = post.user?.id || post.userId;
              if (!userId) return;
              if (user?.id && userId === user.id) {
                onNavigateToProfile?.();
                return;
              }
              onNavigateToUserProfile?.(userId);
            }}
            disabled={
              (!onNavigateToUserProfile && !onNavigateToProfile) ||
              !(post.user?.id || post.userId)
            }
            activeOpacity={
              onNavigateToUserProfile || onNavigateToProfile ? 0.7 : 1
            }
          >
            <Avatar
              size={50}
              uri={post.user?.profile?.avatarUrl || undefined}
              name={getUserDisplayName(post.user)}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {getUserDisplayName(post.user)}
              </Text>
              <Text style={styles.timestamp}>
                {formatTimeAgo(post.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Images */}
          {hasImages && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageScroll}
            >
              {images.map((imageUri, index) => (
                <TouchableOpacity
                  key={`${imageUri}-${index}`}
                  style={styles.imageTouchable}
                  onPress={() => {
                    setViewerIndex(index);
                    setViewerVisible(true);
                  }}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Content */}
          {post.content && (
            <View style={styles.contentContainer}>
              <Text style={styles.contentText}>{post.content}</Text>
            </View>
          )}

          {/* Location & Hashtags */}
          {(post.location || (post.hashtags && post.hashtags.length > 0)) && (
            <View style={styles.metaContainer}>
              {post.location && (
                <View style={styles.metaItem}>
                  <MaterialIcons
                    name="location-on"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.metaText}>{post.location}</Text>
                </View>
              )}
              {post.hashtags &&
                Array.isArray(post.hashtags) &&
                post.hashtags.length > 0 && (
                  <View style={styles.hashtagsContainer}>
                    {post.hashtags
                      .filter((tag) => tag != null && typeof tag === "string")
                      .map((tag, index) => (
                        <Text key={index} style={styles.hashtag}>
                          {tag}
                        </Text>
                      ))}
                  </View>
                )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleToggleLike}
              disabled={liking}
            >
              <MaterialIcons
                name={post.isLiked ? "favorite" : "favorite-border"}
                size={24}
                color={
                  post.isLiked ? theme.colors.error : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.actionText,
                  post.isLiked && styles.actionTextActive,
                ]}
              >
                {post.likesCount || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} disabled>
              <MaterialIcons
                name="comment"
                size={24}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.actionText}>{post.commentsCount || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
              disabled={sharing}
            >
              <MaterialIcons
                name="share"
                size={24}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.actionText}>{post.sharesCount || 0}</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />

            <View style={styles.viewsContainer}>
              <MaterialIcons
                name="visibility"
                size={18}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.viewsText}>{post.viewsCount || 0} views</Text>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionTitle}>
              Comments ({post.commentsCount || 0})
            </Text>

            {/* Add Comment */}
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
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

            {/* Comments List */}
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
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Avatar
                    size={36}
                    uri={comment.user?.profile?.avatarUrl || undefined}
                    name={getUserDisplayName(comment.user as Post["user"])}
                  />
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>
                        {getUserDisplayName(comment.user as Post["user"])}
                      </Text>
                      <Text style={styles.commentTime}>
                        {formatTimeAgo(comment.createdAt)}
                      </Text>
                      {comment.userId === user?.id && (
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
                      )}
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      <ImageViewerModal
        images={images}
        visible={viewerVisible}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
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
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: 0,
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
    image: {
      width: SCREEN_WIDTH,
      height: IMAGE_HEIGHT,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    contentContainer: {
      marginBottom: theme.spacing.base,
      paddingHorizontal: theme.spacing.xl,
    },
    contentText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      lineHeight: 24,
    },
    metaContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: theme.spacing.base,
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    hashtagsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    hashtag: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.medium,
    },
    actionsContainer: {
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
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginRight: theme.spacing.base,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    actionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    actionTextActive: {
      color: theme.colors.error,
    },
    spacer: {
      flex: 1,
    },
    viewsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    viewsText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    commentsSection: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.xl,
    },
    commentsSectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
    },
    addCommentContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.base,
      paddingBottom: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    commentInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      maxHeight: 100,
    },
    postCommentButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.sm,
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    postCommentButtonDisabled: {
      opacity: 0.5,
    },
    commentsLoading: {
      marginVertical: theme.spacing.base,
    },
    noCommentsText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: theme.spacing.xl,
    },
    commentItem: {
      flexDirection: "row",
      marginBottom: theme.spacing.base,
    },
    commentContent: {
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    commentHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    commentAuthor: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    commentTime: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    deleteCommentButton: {
      marginLeft: "auto",
      padding: theme.spacing.xs,
    },
    commentText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },
    headerActions: {
      flexDirection: "row",
      gap: theme.spacing.base,
    },
    headerActionButton: {
      padding: theme.spacing.xs,
    },
  });
