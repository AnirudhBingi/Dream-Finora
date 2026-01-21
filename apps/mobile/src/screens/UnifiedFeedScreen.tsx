import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Share,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../auth/authContext';
import { getPosts, PostsResponse, Post, getPostLikes, sharePost } from '../api/postApi';
import {
  getListings,
  Listing,
  ListingType,
  ListingStatus,
  toggleFavorite,
  generateShareLink,
  getListingFavorites,
  updateListingStatus,
  deleteListing,
} from '../api/listingApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { startConversation } from '../api/messagingApi';
import { toggleLike } from '../api/postApi';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { PostFeedCard } from '../components/PostFeedCard';
import { ListingFeedCard } from '../components/ListingFeedCard';
import { UserListModal } from '../components/UserListModal';
import { UserSummary } from '../api/types';
import { CollapsibleHeader } from '../components/CollapsibleHeader';
import { useBottomNavPadding } from '../hooks/useBottomNavPadding';
import { useDataFetch } from '../hooks/useDataFetch';
import { theme } from '../theme';

type FeedItem =
  | { type: 'post'; data: Post }
  | { type: 'listing'; data: Listing };

const SEARCH_HISTORY_KEY = 'spacev_search_history';
const MAX_SEARCH_HISTORY = 8;

interface UnifiedFeedScreenProps {
  onCreatePost?: () => void;
  onCreateListing?: () => void;
  onViewPost?: (postId: string) => void;
  onViewListing?: (listingId: string) => void;
  onEditListing?: (listingId: string) => void;
  onNavigateToMessage?: (chatId: string, otherUser: any) => void;
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onBack: () => void;
  groupId?: string;
}

export function UnifiedFeedScreen({
  onCreatePost,
  onCreateListing,
  onViewPost,
  onViewListing,
  onEditListing,
  onNavigateToMessage,
  onNavigateToUserProfile,
  onNavigateToProfile,
  onBack,
  groupId,
}: UnifiedFeedScreenProps) {
  const { token, user } = useAuth();
  const [baseItems, setBaseItems] = useState<FeedItem[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedFilter, setFeedFilter] = useState<'all' | 'posts' | 'listings' | 'myListings'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [listingTypeFilter, setListingTypeFilter] = useState<ListingType | 'all'>('all');
  const [listingSort, setListingSort] = useState<'newest' | 'price_low' | 'price_high' | 'popular'>('newest');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [listingLocation, setListingLocation] = useState('');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [contactingListingId, setContactingListingId] = useState<string | null>(null);
  const [engagementModal, setEngagementModal] = useState<{
    visible: boolean;
    title: string;
    users: UserSummary[];
    loading: boolean;
    emptyMessage: string;
  }>({
    visible: false,
    title: '',
    users: [],
    loading: false,
    emptyMessage: '',
  });
  const limit = 20;

  // Animation values for collapsible header
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + insets.top;
  const bottomPadding = useBottomNavPadding(true);
  const SCROLL_THRESHOLD = 30;
  const HIDE_DISTANCE = TOTAL_HEADER_HEIGHT;
  const listingPriceStats = useMemo(() => {
    const listingPrices = feedItems
      .filter((item) => item.type === 'listing')
      .map((item) => item.data.price)
      .filter((price): price is number => typeof price === 'number' && price > 0);

    if (listingPrices.length === 0) {
      return null;
    }

    const avg =
      listingPrices.reduce((sum, price) => sum + price, 0) /
      listingPrices.length;
    return {
      avg,
    };
  }, [feedItems]);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(SEARCH_HISTORY_KEY)
      .then((stored) => {
        if (!isMounted || !stored) return;
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSearchHistory(parsed.filter((item) => typeof item === 'string'));
        }
      })
      .catch(() => null);
    return () => {
      isMounted = false;
    };
  }, []);

  async function persistSearchHistory(nextHistory: string[]) {
    setSearchHistory(nextHistory);
    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
    } catch {
      // Ignore storage errors for search history
    }
  }

  async function addToSearchHistory(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const nextHistory = [
      trimmed,
      ...searchHistory.filter(
        (item) => item.toLowerCase() !== trimmed.toLowerCase()
      ),
    ].slice(0, MAX_SEARCH_HISTORY);
    await persistSearchHistory(nextHistory);
  }

  async function clearSearchHistory() {
    await persistSearchHistory([]);
  }

  function getListingFilters(currentOffset: number) {
    const minPrice = minPriceInput.trim() ? Number(minPriceInput) : undefined;
    const maxPrice = maxPriceInput.trim() ? Number(maxPriceInput) : undefined;
    return {
      userId: feedFilter === 'myListings' ? user?.id : undefined,
      type: listingTypeFilter === 'all' ? undefined : listingTypeFilter,
      search: searchQuery.trim() || undefined,
      location: listingLocation.trim() || undefined,
      groupId,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      sort: feedFilter === 'listings' || feedFilter === 'myListings' ? listingSort : undefined,
      limit,
      offset: currentOffset,
    };
  }

  function normalizeListingsResponse(listingsData: Awaited<ReturnType<typeof getListings>>) {
    if (Array.isArray(listingsData)) {
      return {
        listings: listingsData,
        hasMore: listingsData.length >= limit,
      };
    }
    return {
      listings: listingsData.listings || [],
      hasMore: listingsData.hasMore || false,
    };
  }

  function matchesSearchText(value: string | null | undefined, query: string) {
    if (!value) return false;
    return value.toLowerCase().includes(query);
  }

  function matchesPostSearch(post: Post, query: string) {
    if (!query) return true;
    if (matchesSearchText(post.content, query)) return true;
    if (matchesSearchText(post.location, query)) return true;
    if (Array.isArray(post.hashtags) && post.hashtags.some((tag) => matchesSearchText(tag, query))) {
      return true;
    }
    return false;
  }

  function matchesListingSearch(listing: Listing, query: string) {
    if (!query) return true;
    return (
      matchesSearchText(listing.title, query) ||
      matchesSearchText(listing.description, query) ||
      matchesSearchText(listing.location, query)
    );
  }

  function commitSearch(query: string) {
    const trimmed = query.trim();
    setSearchInput(trimmed);
    setSearchQuery(trimmed);
    if (trimmed) {
      addToSearchHistory(trimmed);
    }
    setIsSearchModalOpen(false);
  }

  const searchSuggestions = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    const suggestionMap = new Map<string, { value: string; score: number }>();

    function addSuggestion(value: string, score: number) {
      const trimmed = value.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      const existing = suggestionMap.get(key);
      if (existing) {
        existing.score += score;
      } else {
        suggestionMap.set(key, { value: trimmed, score });
      }
    }

    feedItems.forEach((item) => {
      if (item.type === 'post') {
        if (item.data.location) addSuggestion(item.data.location, 2);
        if (Array.isArray(item.data.hashtags)) {
          item.data.hashtags.forEach((tag) => {
            if (tag) addSuggestion(tag, 1);
          });
        }
        return;
      }
      if (item.type === 'listing') {
        if (item.data.location) addSuggestion(item.data.location, 2);
        return;
      }
    });

    searchHistory.forEach((item, index) => {
      const weight = Math.max(1, 4 - index);
      addSuggestion(item, 3 + weight);
    });

    const suggestions = Array.from(suggestionMap.values())
      .filter(({ value }) => (query ? value.toLowerCase().includes(query) : true))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        const aStarts = query && a.value.toLowerCase().startsWith(query) ? 1 : 0;
        const bStarts = query && b.value.toLowerCase().startsWith(query) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
        return a.value.localeCompare(b.value);
      })
      .map(({ value }) => value);

    return suggestions.slice(0, 8);
  }, [feedItems, searchHistory, searchInput]);

  function getItemCreatedAt(item: FeedItem): number {
    return new Date(item.data.createdAt).getTime();
  }

  function mergeFeedItems(nextBase: FeedItem[]) {
    if (feedFilter === 'posts') {
      return nextBase.filter((item) => item.type === 'post');
    }
    if (feedFilter === 'myListings' || feedFilter === 'listings') {
      return nextBase.filter((item) => item.type === 'listing');
    }
    return [...nextBase].sort((a, b) => getItemCreatedAt(b) - getItemCreatedAt(a));
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Fetch posts and listings, merge chronologically
  const {
    data: initialData,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<FeedItem[]>({
    fetchFn: async () => {
      if (!token) throw new Error('No authentication token');
      if (feedFilter === 'myListings' && !user?.id) {
        setBaseItems([]);
        setHasMore(false);
        setOffset(0);
        return [];
      }
      const shouldFetchPosts = feedFilter === 'all' || feedFilter === 'posts';
      const shouldFetchListings =
        feedFilter === 'all' || feedFilter === 'listings' || feedFilter === 'myListings';

      const [postsData, listingsData] = await Promise.all([
        shouldFetchPosts
          ? getPosts(token, {
              limit,
              offset: 0,
              search: searchQuery.trim() || undefined,
              groupId,
            })
          : Promise.resolve({ posts: [], total: 0, limit, offset: 0, hasMore: false }),
        shouldFetchListings
          ? getListings(token, getListingFilters(0))
          : Promise.resolve({ listings: [], total: 0, limit, offset: 0, hasMore: false }),
      ]);

      const { listings, hasMore: listingsHasMore } = normalizeListingsResponse(listingsData);
      const postsList: Post[] = postsData.posts || [];

      const merged: FeedItem[] = [
        ...postsList.map((post) => ({ type: 'post' as const, data: post })),
        ...listings.map((listing) => ({ type: 'listing' as const, data: listing })),
      ];
      const sorted =
        feedFilter === 'listings'
          ? merged
          : merged.sort((a, b) => getItemCreatedAt(b) - getItemCreatedAt(a));

      setBaseItems(sorted);
      setHasMore(
        feedFilter === 'posts'
          ? postsData.hasMore
          : feedFilter === 'listings' || feedFilter === 'myListings'
            ? listingsHasMore
            : listingsHasMore || postsData.hasMore
      );
      setOffset(merged.length);

      return sorted;
    },
    immediate: true,
    deps: [
      token,
      feedFilter,
      searchQuery,
      listingTypeFilter,
      listingSort,
      listingLocation,
      minPriceInput,
      maxPriceInput,
    ],
    transform: (data) => data,
  });

  async function loadMore() {
    if (loadingMore || !hasMore || !token) return;

    try {
      setLoadingMore(true);
      const shouldFetchPosts = feedFilter === 'all' || feedFilter === 'posts';
      const shouldFetchListings =
        feedFilter === 'all' || feedFilter === 'listings' || feedFilter === 'myListings';
      const [postsData, listingsData] = await Promise.all([
        shouldFetchPosts
          ? getPosts(token, {
              limit,
              offset,
              search: searchQuery.trim() || undefined,
              groupId,
            })
          : Promise.resolve({ posts: [], total: 0, limit, offset: 0, hasMore: false }),
        shouldFetchListings
          ? getListings(token, getListingFilters(offset))
          : Promise.resolve({ listings: [], total: 0, limit, offset: 0, hasMore: false }),
      ]);

      const { listings, hasMore: listingsHasMore } = normalizeListingsResponse(listingsData);
      const postsList: Post[] = postsData.posts || [];

      const newItems: FeedItem[] = [
        ...postsList.map((post) => ({ type: 'post' as const, data: post })),
        ...listings.map((listing) => ({ type: 'listing' as const, data: listing })),
      ];
      const sorted =
        feedFilter === 'listings'
          ? newItems
          : newItems.sort((a, b) => getItemCreatedAt(b) - getItemCreatedAt(a));

      setBaseItems((prev) => [...prev, ...sorted]);
      setHasMore(
        feedFilter === 'posts'
          ? postsData.hasMore
          : feedFilter === 'listings' || feedFilter === 'myListings'
            ? listingsHasMore
            : listingsHasMore || postsData.hasMore
      );
      setOffset((prev) => prev + sorted.length);
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    setFeedItems(mergeFeedItems(baseItems));
  }, [baseItems, feedFilter]);

  async function handleLikePost(postId: string) {
    if (!token) return;
    try {
      await toggleLike(token, postId);
      // Refresh feed to update like status
      await refetch();
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  }

  async function handleFavoriteListing(listingId: string) {
    if (!token) return;
    try {
      await toggleFavorite(token, listingId);
      // Refresh feed to update favorite status
      await refetch();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }

  async function handleUpdateListingStatus(listingId: string, status: ListingStatus) {
    if (!token) return;
    try {
      await updateListingStatus(token, listingId, status);
      await refetch();
    } catch (err) {
      Alert.alert('Error', 'Failed to update listing status');
    }
  }

  function handleDeleteListing(listingId: string) {
    if (!token) return;
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteListing(token, listingId);
              await refetch();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete listing');
            }
          },
        },
      ],
    );
  }

  async function handleSharePost(postId: string) {
    if (!token) return;
    try {
      await sharePost(token, postId);
      const shareLink = `${getApiBaseUrl()}/posts/${postId}`;
      await Share.share({ message: shareLink });
      await refetch();
    } catch (err) {
      Alert.alert('Error', 'Failed to share post');
    }
  }

  async function handleShareListing(listingId: string) {
    if (!token) return;
    try {
      const { shareLink } = await generateShareLink(token, listingId);
      await Share.share({ message: shareLink });
    } catch (err) {
      console.error('Failed to share listing:', err);
    }
  }

  async function handleContactListing(listing: Listing) {
    if (!token || contactingListingId) return;
    const userId = listing.user?.id || listing.userId;
    if (!userId || userId === user?.id) return;

    try {
      setContactingListingId(listing.id);
      const conversation = await startConversation(token, userId);
      const otherUser = conversation.otherParticipant || listing.user;
      if (conversation?.id && onNavigateToMessage) {
        onNavigateToMessage(conversation.id, otherUser);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setContactingListingId(null);
    }
  }

  async function openPostLikes(postId: string) {
    if (!token) return;
    setEngagementModal({
      visible: true,
      title: 'Post likes',
      users: [],
      loading: true,
      emptyMessage: 'No likes yet.',
    });
    try {
      const users = await getPostLikes(token, postId);
      setEngagementModal((prev) => ({
        ...prev,
        users,
        loading: false,
      }));
    } catch (err) {
      console.error('Failed to load post likes:', err);
      setEngagementModal((prev) => ({
        ...prev,
        users: [],
        loading: false,
      }));
    }
  }

  async function openListingFavorites(listingId: string) {
    if (!token) return;
    setEngagementModal({
      visible: true,
      title: 'Listing favorites',
      users: [],
      loading: true,
      emptyMessage: 'No favorites yet.',
    });
    try {
      const users = await getListingFavorites(token, listingId);
      setEngagementModal((prev) => ({
        ...prev,
        users,
        loading: false,
      }));
    } catch (err) {
      console.error('Failed to load listing favorites:', err);
      setEngagementModal((prev) => ({
        ...prev,
        users: [],
        loading: false,
      }));
    }
  }

  const onRefresh = React.useCallback(() => {
    refresh();
  }, [refresh]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredItems = feedItems.filter((item) => {
    const matchesType =
      feedFilter === 'all'
        ? true
        : feedFilter === 'posts'
          ? item.type === 'post'
          : item.type === 'listing';
    if (!matchesType) return false;
    if (!normalizedSearch) return true;
    if (item.type === 'post') return matchesPostSearch(item.data, normalizedSearch);
    if (item.type === 'listing') return matchesListingSearch(item.data, normalizedSearch);
    return false;
  });

  function getPriceContext(price?: number | null) {
    if (!price || !listingPriceStats) return null;
    const ratio = price / listingPriceStats.avg;
    if (ratio <= 0.8) {
      return {
        label: 'Great value',
        color: theme.colors.success,
        backgroundColor: theme.colors.successBackground,
      };
    }
    if (ratio <= 1.1) {
      return {
        label: 'Fair price',
        color: theme.colors.info,
        backgroundColor: theme.colors.infoBackground,
      };
    }
    return {
      label: 'Premium',
      color: theme.colors.warning,
      backgroundColor: theme.colors.warningBackground,
    };
  }

  const emptyStateTitle =
    feedFilter === 'posts'
      ? 'No posts yet'
      : feedFilter === 'listings' || feedFilter === 'myListings'
        ? 'No listings yet'
        : 'No posts or listings yet';
  const emptyStateMessage =
    feedFilter === 'posts'
      ? 'Create your first post to get started!'
      : feedFilter === 'listings' || feedFilter === 'myListings'
        ? 'Create your first listing to get started!'
        : 'Create your first post or listing to get started!';

  if (loading && !feedItems.length) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <CollapsibleHeader scrollY={scrollY} headerHeight={HEADER_HEIGHT}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              {onCreateListing && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={onCreateListing}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Create listing"
                >
                  <MaterialIcons name="add-box" size={24} color={theme.colors.blue} />
                </TouchableOpacity>
              )}
              {onCreatePost && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={onCreatePost}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Create post"
                >
                  <MaterialIcons name="add-circle-outline" size={24} color={theme.colors.blue} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </CollapsibleHeader>
        <Animated.View
          style={{
            height: scrollY.interpolate({
              inputRange: [-200, 0, SCROLL_THRESHOLD, SCROLL_THRESHOLD + HIDE_DISTANCE, 10000],
              outputRange: [TOTAL_HEADER_HEIGHT, TOTAL_HEADER_HEIGHT, TOTAL_HEADER_HEIGHT, 0, 0],
              extrapolate: 'clamp',
            }),
          }}
          pointerEvents="none"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <ErrorState message={error || 'Failed to load feed'} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <CollapsibleHeader scrollY={scrollY} headerHeight={HEADER_HEIGHT}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {onCreateListing && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onCreateListing}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Create listing"
              >
                <MaterialIcons name="add-box" size={24} color={theme.colors.blue} />
              </TouchableOpacity>
            )}
            {onCreatePost && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onCreatePost}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Create post"
              >
                <MaterialIcons name="add-circle-outline" size={24} color={theme.colors.blue} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CollapsibleHeader>
      <Animated.View
        style={{
          height: scrollY.interpolate({
            inputRange: [-200, 0, SCROLL_THRESHOLD, SCROLL_THRESHOLD + HIDE_DISTANCE, 10000],
            outputRange: [TOTAL_HEADER_HEIGHT, TOTAL_HEADER_HEIGHT, TOTAL_HEADER_HEIGHT, 0, 0],
            extrapolate: 'clamp',
          }),
        }}
        pointerEvents="none"
      />
      <Animated.FlatList
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        data={filteredItems}
        keyExtractor={(item) => `${item.type}-${item.data.id}`}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore) {
            loadMore();
          }
        }}
        ListHeaderComponent={
          <View style={styles.content}>
            {/* Feed Filters */}
            <View style={styles.filterRow}>
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'posts', label: 'Posts' },
                  { key: 'listings', label: 'Listings' },
                  { key: 'myListings', label: 'My Listings' },
                ] as const
              ).map((filter) => {
                const isActive = feedFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => setFeedFilter(filter.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search posts or listings"
                value={searchQuery || searchInput}
                editable={false}
                onPressIn={() => setIsSearchModalOpen(true)}
                placeholderTextColor={theme.colors.textTertiary}
                returnKeyType="search"
              />
              {(searchQuery || searchInput) ? (
                <TouchableOpacity
                  style={styles.searchClearButton}
                  onPress={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
              {(feedFilter === 'all' || feedFilter === 'listings' || feedFilter === 'myListings') && (
                <TouchableOpacity
                  style={styles.filtersButton}
                  onPress={() => setIsFilterModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.filtersButtonText}>Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'post') {
            return (
              <PostFeedCard
                post={item.data}
                onPress={() => onViewPost && onViewPost(item.data.id)}
                onLike={handleLikePost}
                onViewLikes={openPostLikes}
                onComment={() => onViewPost && onViewPost(item.data.id)}
                onUserPress={(userId) => {
                  if (!userId) return;
                  if (user?.id && userId === user.id) {
                    onNavigateToProfile?.();
                    return;
                  }
                  onNavigateToUserProfile?.(userId);
                }}
                onShare={() => handleSharePost(item.data.id)}
              />
            );
          }

          const listing = item.data;
          const isOwner = listing.userId === user?.id;
          return (
            <ListingFeedCard
              listing={listing}
              onPress={() => onViewListing && onViewListing(listing.id)}
              onFavorite={handleFavoriteListing}
              onViewFavorites={openListingFavorites}
              onComment={() => onViewListing && onViewListing(listing.id)}
              onShare={handleShareListing}
              onContact={() => handleContactListing(listing)}
              contacting={contactingListingId === listing.id}
              showManagement={isOwner}
              onEdit={onEditListing}
              onUpdateStatus={handleUpdateListingStatus}
              onDelete={handleDeleteListing}
              priceContext={getPriceContext(listing.price)}
              onUserPress={(userId) => {
                if (!userId) return;
                if (user?.id && userId === user.id) {
                  onNavigateToProfile?.();
                  return;
                }
                onNavigateToUserProfile?.(userId);
              }}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.content}>
            <EmptyState
              icon="feed"
              title={emptyStateTitle}
              message={emptyStateMessage}
              actionLabel={
                feedFilter === 'listings' || feedFilter === 'myListings'
                  ? onCreateListing
                    ? 'Create Listing'
                    : undefined
                  : onCreatePost
                    ? 'Create Post'
                    : undefined
              }
              onAction={
                feedFilter === 'listings' || feedFilter === 'myListings'
                  ? onCreateListing
                  : onCreatePost
              }
            />
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadingMoreContainer}>
              {loadingMore ? (
                <ActivityIndicator size="small" color={theme.colors.blue} />
              ) : (
                <Text style={styles.loadingMoreText}>Loading more…</Text>
              )}
            </View>
          ) : null
        }
      />
      <Modal
        animationType="slide"
        transparent
        visible={isFilterModalOpen}
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity
                style={styles.modalReset}
                onPress={() => {
                  setListingTypeFilter('all');
                  setListingSort('newest');
                  setListingLocation('');
                  setMinPriceInput('');
                  setMaxPriceInput('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalResetText}>Reset</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.modalSectionTitle}>Type</Text>
              <View style={styles.modalPillRow}>
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    listingTypeFilter === 'all' && styles.filterPillActive,
                  ]}
                  onPress={() => setListingTypeFilter('all')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterText,
                      listingTypeFilter === 'all' && styles.filterTextActive,
                    ]}
                  >
                    All Types
                  </Text>
                </TouchableOpacity>
                {Object.values(ListingType).map((type) => {
                  const isActive = listingTypeFilter === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.filterPill, isActive && styles.filterPillActive]}
                      onPress={() => setListingTypeFilter(type)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.modalSectionTitle}>Sort</Text>
              <View style={styles.modalPillRow}>
                {(
                  [
                    { key: 'newest', label: 'Newest' },
                    { key: 'price_low', label: 'Price Low' },
                    { key: 'price_high', label: 'Price High' },
                    { key: 'popular', label: 'Popular' },
                  ] as const
                ).map((sortOption) => {
                  const isActive = listingSort === sortOption.key;
                  return (
                    <TouchableOpacity
                      key={sortOption.key}
                      style={[styles.filterPill, isActive && styles.filterPillActive]}
                      onPress={() => setListingSort(sortOption.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                        {sortOption.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.modalSectionTitle}>Price</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min $"
                  keyboardType="numeric"
                  value={minPriceInput}
                  onChangeText={setMinPriceInput}
                  placeholderTextColor={theme.colors.textTertiary}
                />
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max $"
                  keyboardType="numeric"
                  value={maxPriceInput}
                  onChangeText={setMaxPriceInput}
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
              <Text style={styles.modalSectionTitle}>Location</Text>
              <TextInput
                style={styles.locationInput}
                placeholder="City or neighborhood"
                value={listingLocation}
                onChangeText={setListingLocation}
                placeholderTextColor={theme.colors.textTertiary}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsFilterModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent
        visible={isSearchModalOpen}
        onRequestClose={() => setIsSearchModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModalContent}>
            <View style={styles.searchModalHeader}>
              <TextInput
                style={styles.searchModalInput}
                placeholder="Search posts or listings"
                value={searchInput}
                onChangeText={setSearchInput}
                placeholderTextColor={theme.colors.textTertiary}
                returnKeyType="search"
                autoFocus
                onSubmitEditing={() => commitSearch(searchInput)}
              />
              <TouchableOpacity
                style={styles.searchModalClose}
                onPress={() => setIsSearchModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.searchModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {searchHistory.length > 0 && (
                <View style={styles.searchSection}>
                  <View style={styles.searchSectionHeader}>
                    <Text style={styles.searchSectionTitle}>Recent Searches</Text>
                    <TouchableOpacity
                      onPress={clearSearchHistory}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.searchSectionAction}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.searchChips}>
                    {searchHistory.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.searchChip}
                        onPress={() => commitSearch(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.searchChipText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {searchSuggestions.length > 0 && (
                <View style={styles.searchSection}>
                  <Text style={styles.searchSectionTitle}>Suggestions</Text>
                  <View style={styles.searchChips}>
                    {searchSuggestions.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.searchChip}
                        onPress={() => commitSearch(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.searchChipText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <UserListModal
        title={engagementModal.title}
        users={engagementModal.users}
        visible={engagementModal.visible}
        loading={engagementModal.loading}
        emptyMessage={engagementModal.emptyMessage}
        onClose={() =>
          setEngagementModal((prev) => ({
            ...prev,
            visible: false,
          }))
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    height: 60,
  },
  backButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  backButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.blue,
  },
  headerRight: {
    flexDirection: 'row',
    gap: theme.spacing.base,
  },
  headerButton: {
    padding: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.base,
  },
  filterPill: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  filterPillActive: {
    borderColor: theme.colors.blue,
    backgroundColor: theme.colors.blue,
  },
  filterText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.base,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.white,
  },
  searchClearButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  filtersButton: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.sm,
    backgroundColor: theme.colors.blue,
  },
  filtersButtonText: {
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  priceRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.white,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.spacing.lg,
    borderTopRightRadius: theme.spacing.lg,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.base,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  modalReset: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  modalResetText: {
    color: theme.colors.blue,
    fontWeight: theme.typography.fontWeight.medium,
  },
  modalSectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  modalPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  modalActions: {
    paddingTop: theme.spacing.base,
  },
  modalCloseButton: {
    backgroundColor: theme.colors.blue,
    borderRadius: theme.spacing.sm,
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.base,
  },
  searchModalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.spacing.lg,
    borderTopRightRadius: theme.spacing.lg,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing.xl,
    maxHeight: '85%',
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  searchModalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.white,
  },
  searchModalClose: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  searchModalCloseText: {
    color: theme.colors.blue,
    fontWeight: theme.typography.fontWeight.medium,
  },
  searchSection: {
    marginBottom: theme.spacing.base,
  },
  searchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  searchSectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  searchSectionAction: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.blue,
  },
  searchChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  searchChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.gray50,
  },
  searchChipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  loadMoreButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing.sm,
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
  },
  loadMoreButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.blue,
  },
  loadingMoreContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
  },
  loadingMoreText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
