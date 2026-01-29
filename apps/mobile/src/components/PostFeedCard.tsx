import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Post } from "../api/postApi";
import { getSafeImageUri } from "../utils/imageUri";
import { Avatar } from "./Avatar";
import { ImageViewerModal } from "./ImageViewerModal";
import { useTheme } from "../theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const IMAGE_HEIGHT = Math.min(
  520,
  Math.max(260, Math.round(SCREEN_WIDTH * 0.75)),
);

interface PostFeedCardProps {
  post: Post;
  onPress?: () => void;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onUserPress?: (userId: string) => void;
  onViewLikes?: (postId: string) => void;
}

export function PostFeedCard({
  post,
  onPress,
  onLike,
  onComment,
  onShare,
  onUserPress,
  onViewLikes,
}: PostFeedCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
    };
  }, []);

  function getUserDisplayName(): string {
    if (!post.user) return "Unknown";
    return post.user.profile?.displayName || post.user.email || "Unknown";
  }

  function getCommentUserDisplayName(
    user:
      | {
          profile?: { displayName?: string | null } | null;
          email?: string | null;
        }
      | null
      | undefined,
  ): string {
    if (!user) return "Unknown";
    return user.profile?.displayName || user.email || "Unknown";
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

  function handleLike() {
    if (onLike) {
      onLike(post.id);
    }
  }

  function handleComment() {
    if (onComment) {
      onComment(post.id);
    } else if (onPress) {
      onPress();
    }
  }

  function handleShare() {
    if (onShare) {
      onShare(post.id);
    }
  }

  function handleUserPress() {
    if (onUserPress && post.user) {
      onUserPress(post.user.id);
    }
  }

  function openViewer(index: number) {
    setViewerIndex(index);
    setViewerVisible(true);
  }

  function handleImagePress(index: number) {
    const now = Date.now();
    if (now - lastTapRef.current < 250) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
      lastTapRef.current = 0;
      handleLike();
      return;
    }

    lastTapRef.current = now;
    if (singleTapTimeoutRef.current) {
      clearTimeout(singleTapTimeoutRef.current);
    }
    singleTapTimeoutRef.current = setTimeout(() => {
      openViewer(index);
    }, 250);
  }

  const images = (post.images || [])
    .map((imageUri) =>
      typeof imageUri === "string" ? getSafeImageUri(imageUri) : null,
    )
    .filter((imageUri): imageUri is string => Boolean(imageUri));
  const hasImages = images.length > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={handleUserPress}
          disabled={!onUserPress}
          activeOpacity={onUserPress ? 0.7 : 1}
        >
          <Avatar
            size={40}
            uri={post.user?.profile?.avatarUrl || undefined}
            name={getUserDisplayName()}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{getUserDisplayName()}</Text>
            <Text style={styles.timestamp}>
              {formatTimeAgo(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {post.content && (
        <Text style={styles.content} numberOfLines={4}>
          {post.content}
        </Text>
      )}

      {/* Images */}
      {hasImages && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.imageScroll}
          contentContainerStyle={styles.imageContainer}
        >
          {images.map((imageUri, index) => (
            <TouchableOpacity
              key={`${imageUri}-${index}`}
              style={styles.imageTouchable}
              onPress={() => handleImagePress(index)}
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

      {/* Location & Hashtags */}
      {(post.location || (post.hashtags && post.hashtags.length > 0)) && (
        <View style={styles.metaContainer}>
          {post.location && (
            <View style={styles.metaItem}>
              <MaterialIcons
                name="location-on"
                size={16}
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
                  .slice(0, 3)
                  .map((tag, index) => (
                    <Text key={index} style={styles.hashtag}>
                      {tag}
                    </Text>
                  ))}
                {post.hashtags.length > 3 && (
                  <Text style={styles.hashtagMore}>
                    +{post.hashtags.length - 3} more
                  </Text>
                )}
              </View>
            )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <View style={styles.actionButton}>
          <TouchableOpacity onPress={handleLike} activeOpacity={0.7}>
            <MaterialIcons
              name={post.isLiked ? "favorite" : "favorite-border"}
              size={24}
              color={
                post.isLiked ? theme.colors.error : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onViewLikes?.(post.id)}
            activeOpacity={0.7}
            disabled={!onViewLikes}
          >
            <Text
              style={[
                styles.actionText,
                post.isLiked && styles.actionTextActive,
              ]}
            >
              {post.likesCount || 0}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleComment}
          activeOpacity={0.7}
        >
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
          activeOpacity={0.7}
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
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.viewsText}>{post.viewsCount || 0}</Text>
        </View>
      </View>
      {(() => {
        const comments = post.latestComments?.length
          ? [...post.latestComments].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            )
          : post.latestComment
            ? [post.latestComment]
            : [];
        if (comments.length === 0) return null;
        return (
          <View style={styles.commentPreview}>
            {comments.slice(0, 2).map((comment) => (
              <Text
                key={comment.id}
                style={styles.commentPreviewText}
                numberOfLines={2}
              >
                <Text style={styles.commentPreviewName}>
                  {getCommentUserDisplayName(comment.user)}{" "}
                </Text>
                {comment.content}
              </Text>
            ))}
            {post.commentsCount && post.commentsCount > comments.length && (
              <TouchableOpacity onPress={handleComment} activeOpacity={0.7}>
                <Text style={styles.viewAllComments}>
                  View all {post.commentsCount} comments
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })()}
      <ImageViewerModal
        images={images}
        visible={viewerVisible}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </TouchableOpacity>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.background,
      marginBottom: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.base,
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
    },
    userInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    userDetails: {
      marginLeft: theme.spacing.sm,
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
    content: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      lineHeight: 22,
      marginBottom: theme.spacing.base,
      paddingHorizontal: theme.spacing.base,
    },
    imageScroll: {
      marginBottom: theme.spacing.base,
      width: SCREEN_WIDTH,
    },
    imageContainer: {
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
    metaContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: theme.spacing.base,
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    hashtagsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    hashtag: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.medium,
    },
    hashtagMore: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
    },
    actionsContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: theme.spacing.base,
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
    commentPreview: {
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.sm,
      gap: 4,
    },
    commentPreviewText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    commentPreviewName: {
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    viewAllComments: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
  });
