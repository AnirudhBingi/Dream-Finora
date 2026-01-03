import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/authContext';
import { getListings, Listing, ListingType } from '../api/listingApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonListingList } from '../components/SkeletonLoader';
import { CollapsibleHeader } from '../components/CollapsibleHeader';

interface ListingListScreenProps {
  onCreateListing: () => void;
  onViewListing: (listingId: string) => void;
  onBack: () => void;
}

export function ListingListScreen({
  onCreateListing,
  onViewListing,
  onBack,
}: ListingListScreenProps) {
  const { token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ListingType | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Animation values for collapsible header
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60; // Back button + padding
  const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + insets.top;
  
  // Create spacer height interpolation directly (always available, no callback needed)
  const SCROLL_THRESHOLD = 30;
  const HIDE_DISTANCE = TOTAL_HEADER_HEIGHT;
  const spacerHeight = scrollY.interpolate({
    inputRange: [
      -200,           // Overscroll at top
      0,              // At top
      SCROLL_THRESHOLD, // Start hiding
      SCROLL_THRESHOLD + HIDE_DISTANCE, // Fully hidden
      10000           // Far down
    ],
    outputRange: [
      TOTAL_HEADER_HEIGHT, // Full height at top
      TOTAL_HEADER_HEIGHT, // Full height at top
      TOTAL_HEADER_HEIGHT, // Still full at threshold
      0,              // No spacer when hidden
      0               // Stays at 0 (no jitter)
    ],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadListings(true);
  }, [token, selectedType, searchQuery]);

  async function loadListings(reset: boolean = false) {
    if (!token) return;

    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      const currentOffset = reset ? 0 : offset;
      const listingsData = await getListings(token, {
        type: selectedType,
        search: searchQuery || undefined,
        limit,
        offset: currentOffset,
      });
      
      // Handle paginated response
      let listingsList: Listing[];
      let paginationInfo: { hasMore: boolean; total: number } | null = null;
      
      if (Array.isArray(listingsData)) {
        listingsList = listingsData;
      } else {
        listingsList = listingsData.listings || [];
        paginationInfo = {
          hasMore: listingsData.hasMore || false,
          total: listingsData.total || 0,
        };
      }
      
      if (reset) {
        setListings(listingsList);
        setOffset(limit);
      } else {
        setListings(prev => [...prev, ...listingsList]);
        setOffset(prev => prev + limit);
      }
      
      if (paginationInfo) {
        setHasMore(paginationInfo.hasMore);
      }
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    await loadListings(false);
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  function getUserDisplayName(user: Listing['user']): string {
    if (!user) return 'Unknown';
    return user?.profile?.displayName || user?.email || 'Unknown';
  }

  function getListingTypeLabel(type: ListingType): string {
    const labels: Record<ListingType, string> = {
      [ListingType.ROOMMATE]: 'Roommate',
      [ListingType.ACCOMMODATION]: 'Accommodation',
      [ListingType.ITEM]: 'Item',
      [ListingType.EVENT]: 'Event',
      [ListingType.RIDE]: 'Ride',
    };
    return labels[type] || type;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <CollapsibleHeader 
          scrollY={scrollY} 
          headerHeight={HEADER_HEIGHT}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateListing}
              activeOpacity={0.7}
            >
              <Text style={styles.createButtonText}>List Item</Text>
            </TouchableOpacity>
          </View>
        </CollapsibleHeader>
        <Animated.View style={{ height: spacerHeight }} />
        <Animated.ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
        >
          <View style={styles.content}>
            <SkeletonListingList count={5} />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <CollapsibleHeader 
        scrollY={scrollY} 
        headerHeight={HEADER_HEIGHT}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityHint="Go back to previous screen"
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={onCreateListing}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Create Listing"
            accessibilityHint="Create a new listing"
          >
            <Text style={styles.createButtonText}>List Item</Text>
          </TouchableOpacity>
        </View>
      </CollapsibleHeader>

      {/* Dynamic Spacer - perfectly synchronized with header */}
      <Animated.View 
        style={{
          height: spacerHeight,
        }} 
      />

      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: false,
            listener: (e: any) => {
              // Handle pagination
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              const paddingToBottom = 20;
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
                if (hasMore && !loadingMore) {
                  loadMore();
                }
              }
            },
          }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadListings(true)} />
        }
      >
        <View style={styles.content}>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadListings}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search market..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                !selectedType && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedType(undefined)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !selectedType && styles.filterChipTextSelected,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {Object.values(ListingType).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  selectedType === type && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedType === type && styles.filterChipTextSelected,
                  ]}
                >
                  {getListingTypeLabel(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Market</Text>

          {listings.length === 0 ? (
            <EmptyState
              icon="list"
              title="No listings found"
              message={searchQuery || selectedType
                ? 'Try adjusting your search or filters'
                : 'Create your first listing to get started!'}
              actionLabel={!searchQuery && !selectedType ? 'Create Listing' : undefined}
              onAction={!searchQuery && !selectedType ? onCreateListing : undefined}
            />
          ) : (
            <>
              {listings.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={styles.listingCard}
                onPress={() => onViewListing(listing.id)}
                activeOpacity={0.7}
              >
                {listing.images && listing.images.length > 0 && (
                  <Image
                    source={{
                      uri: listing.images[0].startsWith('http')
                        ? listing.images[0]
                        : `${getApiBaseUrl()}${listing.images[0]}`,
                    }}
                    style={styles.listingImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.listingContent}>
                  <View style={styles.listingHeader}>
                    <Text style={styles.listingType}>
                      {getListingTypeLabel(listing.type)}
                    </Text>
                    {listing.price && (
                      <Text style={styles.listingPrice}>
                        {formatCurrency(listing.price, listing.currency || 'USD')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.listingTitle}>{listing.title}</Text>
                  {listing.location && (
                    <Text style={styles.listingLocation}>📍 {listing.location}</Text>
                  )}
                  <View style={styles.listingFooter}>
                    <Text style={styles.listingCreator}>
                      {getUserDisplayName(listing.user)}
                    </Text>
                    <Text style={styles.listingViews}>{listing.views} views</Text>
                  </View>
                </View>
              </TouchableOpacity>
              ))}
              {hasMore && listings.length > 0 && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMore}
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Text style={styles.loadMoreButtonText}>Load More</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Animated.ScrollView>
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
    paddingTop: 16, // Small top padding for content
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
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
  createButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterContainer: {
    paddingRight: 24,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  listingContent: {
    padding: 16,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listingType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  listingLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listingCreator: {
    fontSize: 14,
    color: '#374151',
  },
  listingViews: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  loadMoreButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

