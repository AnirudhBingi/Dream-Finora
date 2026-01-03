import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonLoader width={60} height={60} borderRadius={8} />
      <View style={styles.cardContent}>
        <SkeletonLoader width="70%" height={16} style={styles.title} />
        <SkeletonLoader width="50%" height={14} style={styles.subtitle} />
        <SkeletonLoader width="40%" height={12} style={styles.meta} />
      </View>
    </View>
  );
}

export function SkeletonExpenseCard() {
  return (
    <View style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseHeaderLeft}>
          <SkeletonLoader width="60%" height={18} style={styles.expenseDescription} />
          <SkeletonLoader width="40%" height={20} style={styles.expenseAmount} />
        </View>
        <SkeletonLoader width={24} height={24} borderRadius={12} />
      </View>
      <SkeletonLoader width="50%" height={14} style={styles.expenseCreator} />
      <View style={styles.splitsContainer}>
        <SkeletonLoader width="45%" height={14} style={styles.splitRow} />
        <SkeletonLoader width="45%" height={14} style={styles.splitRow} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonExpenseList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonExpenseCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonChoreCard() {
  return (
    <View style={styles.choreCard}>
      <View style={styles.choreHeader}>
        <SkeletonLoader width="60%" height={18} style={styles.choreTitle} />
        <SkeletonLoader width={60} height={24} borderRadius={12} />
      </View>
      <SkeletonLoader width="80%" height={14} style={styles.choreDescription} />
      <View style={styles.choreFooter}>
        <SkeletonLoader width="40%" height={14} />
        <SkeletonLoader width="35%" height={14} />
      </View>
    </View>
  );
}

export function SkeletonChoreList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonChoreCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonGroupCard() {
  return (
    <View style={styles.groupCard}>
      <SkeletonLoader width="70%" height={20} style={styles.groupName} />
      <SkeletonLoader width="50%" height={14} style={styles.groupDescription} />
      <View style={styles.groupFooter}>
        <SkeletonLoader width="30%" height={14} />
        <SkeletonLoader width={24} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

export function SkeletonGroupList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonGroupCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonListingCard() {
  return (
    <View style={styles.listingCard}>
      <SkeletonLoader width="100%" height={200} borderRadius={8} style={styles.listingImage} />
      <View style={styles.listingContent}>
        <SkeletonLoader width="70%" height={18} style={styles.listingTitle} />
        <SkeletonLoader width="50%" height={14} style={styles.listingPrice} />
        <SkeletonLoader width="40%" height={12} style={styles.listingLocation} />
      </View>
    </View>
  );
}

export function SkeletonListingList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListingCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonDetailScreen() {
  return (
    <View style={styles.detailContainer}>
      <SkeletonLoader width="100%" height={200} borderRadius={0} style={styles.detailHeader} />
      <View style={styles.detailContent}>
        <SkeletonLoader width="70%" height={24} style={styles.detailTitle} />
        <SkeletonLoader width="50%" height={18} style={styles.detailSubtitle} />
        <SkeletonLoader width="100%" height={16} style={styles.detailLine} />
        <SkeletonLoader width="80%" height={16} style={styles.detailLine} />
        <SkeletonLoader width="60%" height={16} style={styles.detailLine} />
        <View style={styles.detailSection}>
          <SkeletonLoader width="40%" height={18} style={styles.sectionTitle} />
          <SkeletonLoader width="100%" height={60} borderRadius={8} style={styles.sectionCard} />
          <SkeletonLoader width="100%" height={60} borderRadius={8} style={styles.sectionCard} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonConversationCard() {
  return (
    <View style={styles.conversationCard}>
      <SkeletonLoader width={50} height={50} borderRadius={25} />
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <SkeletonLoader width="40%" height={16} />
          <SkeletonLoader width="20%" height={12} />
        </View>
        <SkeletonLoader width="70%" height={14} style={styles.conversationPreview} />
      </View>
    </View>
  );
}

export function SkeletonConversationList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonConversationCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonFriendCard() {
  return (
    <View style={styles.friendCard}>
      <SkeletonLoader width={50} height={50} borderRadius={25} />
      <View style={styles.friendContent}>
        <SkeletonLoader width="50%" height={18} />
        <SkeletonLoader width="30%" height={14} style={styles.friendMeta} />
      </View>
    </View>
  );
}

export function SkeletonFriendList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonFriendCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonRideCard() {
  return (
    <View style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <SkeletonLoader width="60%" height={18} />
        <SkeletonLoader width={60} height={24} borderRadius={12} />
      </View>
      <SkeletonLoader width="80%" height={14} style={styles.rideRoute} />
      <View style={styles.rideFooter}>
        <SkeletonLoader width="40%" height={14} />
        <SkeletonLoader width="30%" height={14} />
      </View>
    </View>
  );
}

export function SkeletonRideList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonRideCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonLoanCard() {
  return (
    <View style={styles.loanCard}>
      <View style={styles.loanHeader}>
        <SkeletonLoader width="50%" height={18} />
        <SkeletonLoader width={60} height={24} borderRadius={12} />
      </View>
      <SkeletonLoader width="40%" height={16} style={styles.loanAmount} />
      <SkeletonLoader width="60%" height={14} style={styles.loanProgress} />
    </View>
  );
}

export function SkeletonLoanList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLoanCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonGoalCard() {
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <SkeletonLoader width="50%" height={18} />
        <SkeletonLoader width={60} height={24} borderRadius={12} />
      </View>
      <SkeletonLoader width="40%" height={16} style={styles.goalAmount} />
      <SkeletonLoader width="100%" height={8} borderRadius={4} style={styles.goalProgress} />
      <SkeletonLoader width="60%" height={14} style={styles.goalProgressText} />
    </View>
  );
}

export function SkeletonGoalList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonGoalCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonBudgetCard() {
  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetHeader}>
        <SkeletonLoader width="50%" height={18} />
        <SkeletonLoader width={60} height={24} borderRadius={12} />
      </View>
      <SkeletonLoader width="40%" height={16} style={styles.budgetAmount} />
      <SkeletonLoader width="100%" height={8} borderRadius={4} style={styles.budgetProgress} />
      <SkeletonLoader width="60%" height={14} style={styles.budgetProgressText} />
    </View>
  );
}

export function SkeletonBudgetList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBudgetCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonMessageBubble() {
  return (
    <View style={styles.messageBubble}>
      <SkeletonLoader width="70%" height={40} borderRadius={16} />
    </View>
  );
}

export function SkeletonMessageList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonMessageBubble key={index} />
      ))}
    </View>
  );
}

export function SkeletonForm() {
  return (
    <View style={styles.formContainer}>
      <SkeletonLoader width="100%" height={16} style={styles.formLabel} />
      <SkeletonLoader width="100%" height={44} borderRadius={8} style={styles.formInput} />
      <SkeletonLoader width="100%" height={16} style={styles.formLabel} />
      <SkeletonLoader width="100%" height={44} borderRadius={8} style={styles.formInput} />
      <SkeletonLoader width="100%" height={16} style={styles.formLabel} />
      <SkeletonLoader width="100%" height={100} borderRadius={8} style={styles.formTextArea} />
      <SkeletonLoader width="100%" height={44} borderRadius={8} style={styles.formButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 6,
  },
  meta: {
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseHeaderLeft: {
    flex: 1,
  },
  expenseDescription: {
    marginBottom: 8,
  },
  expenseAmount: {
    marginTop: 4,
  },
  expenseCreator: {
    marginBottom: 12,
  },
  splitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  splitRow: {
    marginBottom: 4,
  },
  choreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  choreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  choreTitle: {
    marginBottom: 8,
  },
  choreDescription: {
    marginBottom: 12,
  },
  choreFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  groupName: {
    marginBottom: 8,
  },
  groupDescription: {
    marginBottom: 12,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  listingImage: {
    marginBottom: 12,
  },
  listingContent: {
    padding: 16,
  },
  listingTitle: {
    marginBottom: 8,
  },
  listingPrice: {
    marginBottom: 6,
  },
  listingLocation: {
    marginTop: 4,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  conversationPreview: {
    marginTop: 4,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  friendContent: {
    flex: 1,
    marginLeft: 12,
  },
  friendMeta: {
    marginTop: 4,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rideRoute: {
    marginBottom: 12,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loanAmount: {
    marginBottom: 8,
  },
  loanProgress: {
    marginBottom: 8,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalAmount: {
    marginBottom: 8,
  },
  goalProgress: {
    marginBottom: 8,
  },
  goalProgressText: {
    marginTop: 4,
  },
  budgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetAmount: {
    marginBottom: 8,
  },
  budgetProgress: {
    marginBottom: 8,
  },
  budgetProgressText: {
    marginTop: 4,
  },
  messageBubble: {
    padding: 16,
    alignItems: 'flex-start',
  },
  formContainer: {
    padding: 24,
  },
  formLabel: {
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    marginBottom: 16,
  },
  formTextArea: {
    marginBottom: 16,
  },
  formButton: {
    marginTop: 24,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  detailHeader: {
    marginBottom: 0,
  },
  detailContent: {
    padding: 24,
  },
  detailTitle: {
    marginBottom: 12,
  },
  detailSubtitle: {
    marginBottom: 16,
  },
  detailLine: {
    marginBottom: 8,
  },
  detailSection: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  sectionCard: {
    marginBottom: 12,
  },
});

