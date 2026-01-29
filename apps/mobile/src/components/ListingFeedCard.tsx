import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Listing, ListingStatus, ListingType } from "../api/listingApi";
import { getSafeImageUri } from "../utils/imageUri";
import { Avatar } from "./Avatar";
import { ImageViewerModal } from "./ImageViewerModal";
import { useTheme } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MIN_IMAGE_HEIGHT = 300;
const MAX_IMAGE_HEIGHT = 600;

interface ListingFeedCardProps {
  listing: Listing;
  onPress?: () => void;
  onFavorite?: (listingId: string) => void;
  onComment?: (listingId: string) => void;
  onShare?: (listingId: string) => void;
  onContact?: (listing: Listing) => void;
  onUserPress?: (userId: string) => void;
  onViewFavorites?: (listingId: string) => void;
  showManagement?: boolean;
  onEdit?: (listingId: string) => void;
  onUpdateStatus?: (listingId: string, status: ListingStatus) => void;
  onDelete?: (listingId: string) => void;
  contacting?: boolean;
  priceContext?: {
    label: string;
    color: string;
    backgroundColor: string;
  } | null;
}

export function ListingFeedCard({
  listing,
  onPress,
  onFavorite,
  onComment,
  onShare,
  onContact,
  onUserPress,
  onViewFavorites,
  showManagement = false,
  onEdit,
  onUpdateStatus,
  onDelete,
  contacting = false,
  priceContext,
}: ListingFeedCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [manageVisible, setManageVisible] = useState(false);
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const manageSheetAnim = useRef(new Animated.Value(0)).current;
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
    if (!listing.user) return "Unknown";
    return listing.user.profile?.displayName || listing.user.email || "Unknown";
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

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function getListingTypeLabel(type: ListingType): string {
    const labels: Record<ListingType, string> = {
      [ListingType.ROOMMATE]: "Roommate",
      [ListingType.ACCOMMODATION]: "Accommodation",
      [ListingType.ITEM]: "Item",
      [ListingType.EVENT]: "Event",
      [ListingType.RIDE]: "Ride",
    };
    return labels[type] || type;
  }

  function getListingStatusLabel(status: ListingStatus): string {
    const labels: Record<ListingStatus, string> = {
      [ListingStatus.ACTIVE]: "Active",
      [ListingStatus.COMPLETED]: "Completed",
      [ListingStatus.CLOSED]: "Closed",
    };
    return labels[status] || status;
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

  function handleFavorite() {
    if (onFavorite) {
      onFavorite(listing.id);
    }
  }

  function handleComment() {
    if (onComment) {
      onComment(listing.id);
    } else if (onPress) {
      onPress();
    }
  }

  function handleShare() {
    if (onShare) {
      onShare(listing.id);
    }
  }

  function handleUserPress() {
    if (onUserPress && listing.user) {
      onUserPress(listing.user.id);
    }
  }

  function handleContact() {
    if (!onContact || contacting) {
      return;
    }
    onContact(listing);
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
      handleFavorite();
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

  function handleScroll(event: any) {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  }

  const images = (listing.images || [])
    .map((imageUri) =>
      typeof imageUri === "string" ? getSafeImageUri(imageUri) : null,
    )
    .filter((imageUri): imageUri is string => Boolean(imageUri));
  const hasMultipleImages = images.length > 1;

  const fallbackHeight = Math.min(
    MAX_IMAGE_HEIGHT,
    Math.max(MIN_IMAGE_HEIGHT, Math.round(SCREEN_WIDTH * 0.75)),
  );

  useEffect(() => {
    let isActive = true;
    images.forEach((uri) => {
      if (imageHeights[uri]) return;
      Image.getSize(
        uri,
        (width, height) => {
          if (!isActive) return;
          if (!width || !height) return;
          const ratio = width / height;
          const computed = Math.round(SCREEN_WIDTH / ratio);
          const clamped = Math.min(
            MAX_IMAGE_HEIGHT,
            Math.max(MIN_IMAGE_HEIGHT, computed),
          );
          setImageHeights((prev) => ({ ...prev, [uri]: clamped }));
        },
        () => undefined,
      );
    });
    return () => {
      isActive = false;
    };
  }, [images, imageHeights]);

  const resolvedHeights = images.map(
    (uri) => imageHeights[uri] ?? fallbackHeight,
  );
  const maxImageHeight = resolvedHeights.length
    ? Math.max(...resolvedHeights, fallbackHeight)
    : fallbackHeight;

  return (
    <View style={styles.card}>
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
            uri={listing.user?.profile?.avatarUrl || undefined}
            name={getUserDisplayName()}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{getUserDisplayName()}</Text>
            <Text style={styles.timestamp}>
              {formatTimeAgo(listing.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.listingType}>
            {getListingTypeLabel(listing.type)}
          </Text>
        </View>
      </View>

      {/* Images */}
      {images.length > 0 && (
        <View style={[styles.imageContainer, { height: maxImageHeight }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.imageScroll}
          >
            {images.map((imageUri, index) => (
              <TouchableOpacity
                key={`${imageUri}-${index}`}
                style={[styles.imageTouchable, { height: maxImageHeight }]}
                onPress={() => handleImagePress(index)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={[
                    styles.image,
                    { height: resolvedHeights[index] ?? fallbackHeight },
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Image indicators */}
          {hasMultipleImages && (
            <View style={styles.imageIndicators}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentImageIndex && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <View style={styles.actionButton}>
          <TouchableOpacity onPress={handleFavorite} activeOpacity={0.7}>
            <MaterialIcons
              name={listing.isFavorited ? "favorite" : "favorite-border"}
              size={24}
              color={
                listing.isFavorited
                  ? theme.colors.error
                  : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onViewFavorites?.(listing.id)}
            activeOpacity={0.7}
            disabled={!onViewFavorites}
          >
            <Text
              style={[
                styles.actionText,
                listing.isFavorited && styles.actionTextActive,
              ]}
            >
              {listing.favoriteCount || 0}
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
          <Text style={styles.actionText}>{listing.commentCount || 0}</Text>
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
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            contacting && styles.actionButtonDisabled,
          ]}
          onPress={handleContact}
          activeOpacity={0.7}
          disabled={contacting}
        >
          {contacting ? (
            <ActivityIndicator size="small" color={theme.colors.blue} />
          ) : (
            <MaterialIcons
              name="chat-bubble-outline"
              size={24}
              color={theme.colors.textSecondary}
            />
          )}
          <Text style={styles.actionText}>Contact</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />

        {listing.price && (
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {formatCurrency(listing.price, listing.currency || "USD")}
            </Text>
            {priceContext?.label ? (
              <View
                style={[
                  styles.priceContextPill,
                  { backgroundColor: priceContext.backgroundColor },
                ]}
              >
                <Text
                  style={[
                    styles.priceContextText,
                    { color: priceContext.color },
                  ]}
                >
                  {priceContext.label}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Content */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
        style={styles.contentContainer}
      >
        <Text style={styles.title}>{listing.title}</Text>
        {listing.description && (
          <Text style={styles.description} numberOfLines={3}>
            {listing.description}
          </Text>
        )}
        {(() => {
          const comments = listing.latestComments?.length
            ? [...listing.latestComments].sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              )
            : listing.latestComment
              ? [listing.latestComment]
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
              {listing.commentCount &&
                listing.commentCount > comments.length && (
                  <TouchableOpacity onPress={handleComment} activeOpacity={0.7}>
                    <Text style={styles.viewAllComments}>
                      View all {listing.commentCount} comments
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          );
        })()}
        {listing.location && (
          <View style={styles.metaContainer}>
            <MaterialIcons
              name="location-on"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.metaText}>{listing.location}</Text>
          </View>
        )}
        <View style={styles.footer}>
          <Text style={styles.viewsText}>{listing.views || 0} views</Text>
          {showManagement && (
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
      </TouchableOpacity>
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
                      outputRange: [260, 0],
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
              {(
                [
                  ListingStatus.ACTIVE,
                  ListingStatus.COMPLETED,
                  ListingStatus.CLOSED,
                ] as const
              ).map((status) => {
                const isActive = listing.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      isActive && styles.statusChipActive,
                    ]}
                    onPress={() => onUpdateStatus?.(listing.id, status)}
                    activeOpacity={0.7}
                    disabled={!onUpdateStatus || isActive}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        isActive && styles.statusChipTextActive,
                      ]}
                    >
                      {getListingStatusLabel(status)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.managementActions}>
              <TouchableOpacity
                style={styles.managementButton}
                onPress={() => onEdit?.(listing.id)}
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
                onPress={() => onDelete?.(listing.id)}
                activeOpacity={0.7}
                disabled={!onDelete}
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
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.background,
      marginBottom: theme.spacing.base,
      borderRadius: theme.spacing.base,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.base,
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
    headerRight: {
      marginLeft: theme.spacing.sm,
    },
    listingType: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.blue,
      textTransform: "uppercase",
    },
    imageContainer: {
      position: "relative",
      width: SCREEN_WIDTH,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    imageScroll: {
      width: SCREEN_WIDTH,
    },
    imageTouchable: {
      width: SCREEN_WIDTH,
      justifyContent: "center",
      alignItems: "center",
    },
    image: {
      width: SCREEN_WIDTH,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    imageIndicators: {
      position: "absolute",
      bottom: theme.spacing.sm,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    indicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.surfaceOverlayStrong,
    },
    indicatorActive: {
      backgroundColor: theme.colors.textInverse,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    actionsContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: theme.spacing.base,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginRight: theme.spacing.base,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
    },
    actionButtonDisabled: {
      opacity: 0.6,
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
    price: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    priceContainer: {
      alignItems: "flex-end",
      gap: 4,
    },
    priceContextPill: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: 999,
    },
    priceContextText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.base,
    },
    title: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      lineHeight: 20,
      marginBottom: theme.spacing.xs,
    },
    commentPreview: {
      marginBottom: theme.spacing.xs,
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
    metaContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: theme.spacing.xs,
    },
    metaText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.xs,
      justifyContent: "space-between",
    },
    viewsText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    managePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.spacing.xs,
      paddingVertical: 2,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    managePillText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    sheetOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: theme.colors.overlay,
    },
    sheetBackdrop: {
      flex: 1,
    },
    sheetContainer: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      paddingTop: theme.spacing.base,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.gray200,
      marginBottom: theme.spacing.base,
    },
    sheetTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    sheetSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    sheetSection: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    managementContainer: {
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    managementHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    managementTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    statusRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
    },
    statusChip: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    statusChipActive: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    statusChipText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    statusChipTextActive: {
      color: theme.colors.textInverse,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    managementActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    managementButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.background,
    },
    managementButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
    },
    deleteButton: {
      borderColor: theme.colors.error,
    },
    deleteButtonText: {
      color: theme.colors.error,
    },
    sheetClose: {
      marginTop: theme.spacing.sm,
      alignItems: "center",
    },
    sheetCloseText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
    },
  });
