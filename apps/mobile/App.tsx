import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootScreenRenderer } from './src/components/RootScreenRenderer';
import { AuthProvider, useAuth } from './src/auth/authContext';
import { ThemeProvider, useTheme } from './src/theme';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { UserProfileScreen } from './src/screens/UserProfileScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { TrustScoreInsightsScreen } from './src/screens/TrustScoreInsightsScreen';
import { FinScoreLeaderboardScreen } from './src/screens/FinScoreLeaderboardScreen';
import { ExpenseListScreen } from './src/screens/ExpenseListScreen';
import { CreateExpenseScreen } from './src/screens/CreateExpenseScreen';
import { EditExpenseScreen } from './src/screens/EditExpenseScreen';
import { ExpenseDetailScreen } from './src/screens/ExpenseDetailScreen';
import { ExpenseHistoryScreen } from './src/screens/ExpenseHistoryScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { ActivityFeedScreen } from './src/screens/ActivityFeedScreen';
import { BalanceSummaryScreen } from './src/screens/BalanceSummaryScreen';
import { SettleUpScreen } from './src/screens/SettleUpScreen';
import { GroupListScreen } from './src/screens/GroupListScreen';
import { CreateGroupScreen } from './src/screens/CreateGroupScreen';
import { GroupDetailScreen } from './src/screens/GroupDetailScreen';
import { GroupFeedScreen } from './src/screens/GroupFeedScreen';
import { GroupSettingsScreen } from './src/screens/GroupSettingsScreen';
import { AddGroupMemberScreen } from './src/screens/AddGroupMemberScreen';
import { GroupInvitationScreen } from './src/screens/GroupInvitationScreen';
import { FinanceScreen } from './src/screens/FinanceScreen';
import { AddTransactionScreen } from './src/screens/AddTransactionScreen';
import { EditTransactionScreen } from './src/screens/EditTransactionScreen';
import { EditAccountScreen } from './src/screens/EditAccountScreen';
import { FinanceHistoryScreen } from './src/screens/FinanceHistoryScreen';
import { ChoreListScreen } from './src/screens/ChoreListScreen';
import { CreateChoreScreen } from './src/screens/CreateChoreScreen';
import { ChoreDetailScreen } from './src/screens/ChoreDetailScreen';
import { EditChoreScreen } from './src/screens/EditChoreScreen';
import { ChoreHistoryScreen } from './src/screens/ChoreHistoryScreen';
import { ChoreStatsScreen } from './src/screens/ChoreStatsScreen';
import { RideListScreen } from './src/screens/RideListScreen';
import { CreateRideScreen } from './src/screens/CreateRideScreen';
import { EditRideScreen } from './src/screens/EditRideScreen';
import { EditFavoriteRideScreen } from './src/screens/EditFavoriteRideScreen';
import { RideDetailScreen } from './src/screens/RideDetailScreen';
import { RideAnalyticsScreen } from './src/screens/RideAnalyticsScreen';
import { RideHistoryScreen } from './src/screens/RideHistoryScreen';
import { RideFavorite } from './src/api/rideApi';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { CreateSpaceVScreen } from './src/screens/CreateSpaceVScreen';
import { SpaceVDetailScreen } from './src/screens/SpaceVDetailScreen';
import { EditSpaceVScreen } from './src/screens/EditSpaceVScreen';
import { UnifiedFeedScreen } from './src/screens/UnifiedFeedScreen';
import { CreatePostScreen } from './src/screens/CreatePostScreen';
import { PostDetailScreen } from './src/screens/PostDetailScreen';
import ConversationListScreen from './src/screens/ConversationListScreen';
import MessageThreadScreen from './src/screens/MessageThreadScreen';
import { NewConversationScreen } from './src/screens/NewConversationScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { BillchopAnalyticsScreen } from './src/screens/BillchopAnalyticsScreen';
import { BottomNavigation } from './src/components/BottomNavigation';
import { FriendsListScreen } from './src/screens/FriendsListScreen';
import { FriendSearchScreen } from './src/screens/FriendSearchScreen';
import { BillchopFriendsScreen } from './src/screens/BillchopFriendsScreen';
import { FriendExpenseListScreen } from './src/screens/FriendExpenseListScreen';
import { BillchopGroupsScreen } from './src/screens/BillchopGroupsScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AccountSettingsScreen } from './src/screens/AccountSettingsScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { CreateBudgetScreen } from './src/screens/CreateBudgetScreen';
import { EditBudgetScreen } from './src/screens/EditBudgetScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { CreateGoalScreen } from './src/screens/CreateGoalScreen';
import { EditGoalScreen } from './src/screens/EditGoalScreen';
import { GoalDetailScreen } from './src/screens/GoalDetailScreen';
import { LoansListScreen } from './src/screens/LoansListScreen';
import { CreateLoanScreen } from './src/screens/CreateLoanScreen';
import { LoanDetailScreen } from './src/screens/LoanDetailScreen';
import { RecordLoanPaymentScreen } from './src/screens/RecordLoanPaymentScreen';
import { FinancialAdvisorScreen } from './src/screens/FinancialAdvisorScreen';
import { SwipeableScreen } from './src/components/SwipeableScreen';
import { AddContributionScreen } from './src/screens/AddContributionScreen';
import { useNavigationHistory } from './src/navigation/useNavigationHistory';
import {
  setupNotificationListeners,
  registerDeviceForPushNotifications,
  setBadgeCount,
} from './src/services/pushNotifications';
import { getUnreadCount } from './src/api/notificationApi';

type ScreenName =
  | 'home'
  | 'profile'
  | 'editProfile'
  | 'expenses'
  | 'createExpense'
  | 'editExpense'
  | 'expenseDetail'
  | 'expenseHistory'
  | 'activity'
  | 'balanceSummary'
  | 'settleUp'
  | 'groups'
  | 'createGroup'
  | 'groupDetail'
  | 'groupFeed'
  | 'groupSettings'
  | 'groupInvitation'
  | 'addGroupMember'
  | 'finance'
  | 'addTransaction'
  | 'editTransaction'
  | 'editAccount'
  | 'financeHistory'
  | 'budgets'
  | 'createBudget'
  | 'editBudget'
  | 'goals'
  | 'createGoal'
  | 'editGoal'
  | 'goalDetail'
  | 'addContribution'
  | 'loans'
  | 'createLoan'
  | 'loanDetail'
  | 'recordLoanPayment'
  | 'advisor'
  | 'chores'
  | 'createChore'
  | 'choreDetail'
  | 'editChore'
  | 'choreHistory'
  | 'choreStats'
  | 'rides'
  | 'createRide'
  | 'editRide'
  | 'editFavoriteRide'
  | 'rideDetail'
  | 'rideAnalytics'
  | 'rideHistory'
  | 'favorites'
  | 'createSpaceV'
  | 'editSpaceV'
  | 'spacevDetail'
  | 'feed'
  | 'createPost'
  | 'postDetail'
  | 'conversations'
  | 'newConversation'
  | 'messageThread'
  | 'analytics'
  | 'billchopAnalytics'
  | 'billchopFriends'
  | 'billchopGroups'
  | 'friends'
  | 'friendSearch'
  | 'friendExpenseList'
  | 'userProfile'
  | 'trustScoreInsights'
  | 'leaderboard'
  | 'notifications'
  | 'settings'
  | 'accountSettings';

function AppContent() {
  const navHistory = useNavigationHistory();
  const { isAuthenticated, isLoading, token } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Sync navigation history with currentScreen state
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedInvitationToken, setSelectedInvitationToken] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<'local' | 'home' | null>(null);
  const [selectedTransactionType, setSelectedTransactionType] = useState<'income' | 'expense' | null>(null);
  const [selectedChoreId, setSelectedChoreId] = useState<string | null>(null);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [selectedSpaceVId, setSelectedSpaceVId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedOtherUser, setSelectedOtherUser] = useState<any | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [selectedPayeeId, setSelectedPayeeId] = useState<string | null>(null);
  const [selectedPayeeName, setSelectedPayeeName] = useState<string>('');
  const [selectedSettlementAmount, setSelectedSettlementAmount] = useState<number>(0);
  const [selectedSettlementGroupId, setSelectedSettlementGroupId] = useState<string | null>(null);
  const [goalPrefill, setGoalPrefill] = useState<{ name: string; targetAmount: number; category: 'savings' | 'debt' | 'purchase' | 'investment' } | undefined>(undefined);
  const [contributionAmount, setContributionAmount] = useState<number | undefined>(undefined);
  const [loanPaymentAmount, setLoanPaymentAmount] = useState<number | undefined>(undefined);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedFriendName, setSelectedFriendName] = useState<string>('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [expenseRefreshKey, setExpenseRefreshKey] = useState(0);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const [spacevRefreshKey, setSpacevRefreshKey] = useState(0);
  const [choreRefreshKey, setChoreRefreshKey] = useState(0);
  const [rideRefreshKey, setRideRefreshKey] = useState(0);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [goalRefreshKey, setGoalRefreshKey] = useState(0);
  const [loanRefreshKey, setLoanRefreshKey] = useState(0);

  // Track previous screen node to render behind current screen during swipe
  const previousScreenNodeRef = useRef<React.ReactNode>(null);
  const currentScreenNodeRef = useRef<React.ReactNode>(null);
  const lastScreenNameRef = useRef<string>(currentScreen);
  
  // Favorite ride selection
  const [selectedFavorite, setSelectedFavorite] = useState<RideFavorite | null>(null);
  const selectedFavoriteRef = useRef<RideFavorite | null>(null);

  // Helper to navigate with history tracking
  const navigate = useCallback((screen: ScreenName, params?: Record<string, any>) => {
    // Capture current state as params for history
    const currentState = {
      selectedContext,
      selectedTransactionType,
      selectedGroupId,
      selectedChoreId,
      selectedRideId,
      selectedSpaceVId,
      selectedPostId,
      selectedChatId,
      selectedOtherUser,
      selectedPayeeId,
      selectedPayeeName,
      selectedSettlementAmount,
      selectedSettlementGroupId,
      selectedExpenseId,
      selectedFriendId,
      selectedFriendName,
      selectedBudgetId,
      selectedGoalId,
      selectedLoanId,
      selectedTransactionId,
      selectedAccountId,
      selectedUserId,
      selectedInvitationToken,
      goalPrefill,
      contributionAmount,
      loanPaymentAmount,
      expenseRefreshKey,
      groupRefreshKey,
      financeRefreshKey,
      spacevRefreshKey,
      choreRefreshKey,
      rideRefreshKey,
      budgetRefreshKey,
      goalRefreshKey,
      loanRefreshKey,
    };
    
    // Push current screen to history before navigating (if it's not already the last entry)
    const lastHistoryEntry = navHistory.history[navHistory.history.length - 1];
    if (!lastHistoryEntry || lastHistoryEntry.screen !== currentScreen) {
      navHistory.push(currentScreen, currentState);
    }
    
    // Push the new screen to history
    navHistory.push(screen, params || {});
    
    // Update to new screen
    setCurrentScreen(screen);
    
    // Update relevant state from params
    if (params) {
      if (params.selectedContext !== undefined) setSelectedContext(params.selectedContext);
      if (params.selectedTransactionType !== undefined) setSelectedTransactionType(params.selectedTransactionType);
      if (params.selectedGroupId !== undefined) {
        // If explicitly set to null, clear it; otherwise set it
        setSelectedGroupId(params.selectedGroupId === null ? null : params.selectedGroupId);
      }
      if (params.selectedChoreId !== undefined) setSelectedChoreId(params.selectedChoreId);
      if (params.selectedRideId !== undefined) setSelectedRideId(params.selectedRideId);
      if (params.selectedSpaceVId !== undefined) setSelectedSpaceVId(params.selectedSpaceVId);
      if (params.selectedPostId !== undefined) setSelectedPostId(params.selectedPostId);
      if (params.selectedChatId !== undefined) setSelectedChatId(params.selectedChatId);
      if (params.selectedOtherUser !== undefined) setSelectedOtherUser(params.selectedOtherUser);
      if (params.selectedGroup !== undefined) setSelectedGroup(params.selectedGroup);
      if (params.selectedPayeeId !== undefined) setSelectedPayeeId(params.selectedPayeeId);
      if (params.selectedPayeeName !== undefined) setSelectedPayeeName(params.selectedPayeeName);
      if (params.selectedSettlementAmount !== undefined) setSelectedSettlementAmount(params.selectedSettlementAmount);
      if (params.selectedSettlementGroupId !== undefined) setSelectedSettlementGroupId(params.selectedSettlementGroupId);
      if (params.selectedExpenseId !== undefined) setSelectedExpenseId(params.selectedExpenseId);
      if (params.selectedFriendId !== undefined) setSelectedFriendId(params.selectedFriendId);
      if (params.selectedFriendName !== undefined) setSelectedFriendName(params.selectedFriendName);
      if (params.selectedBudgetId !== undefined) setSelectedBudgetId(params.selectedBudgetId);
      if (params.selectedGoalId !== undefined) setSelectedGoalId(params.selectedGoalId);
      if (params.selectedLoanId !== undefined) setSelectedLoanId(params.selectedLoanId);
      if (params.selectedTransactionId !== undefined) setSelectedTransactionId(params.selectedTransactionId);
      if (params.selectedAccountId !== undefined) setSelectedAccountId(params.selectedAccountId);
      if (params.selectedUserId !== undefined) setSelectedUserId(params.selectedUserId);
      if (params.selectedInvitationToken !== undefined) setSelectedInvitationToken(params.selectedInvitationToken);
      if (params.goalPrefill !== undefined) setGoalPrefill(params.goalPrefill);
      if (params.contributionAmount !== undefined) setContributionAmount(params.contributionAmount);
      if (params.loanPaymentAmount !== undefined) setLoanPaymentAmount(params.loanPaymentAmount);
    }
  }, [navHistory, currentScreen, selectedContext, selectedTransactionType, selectedGroupId, selectedChoreId, selectedRideId, selectedSpaceVId, selectedPostId, selectedChatId, selectedOtherUser, selectedPayeeId, selectedPayeeName, selectedSettlementAmount, selectedExpenseId, selectedFriendId, selectedFriendName, selectedBudgetId, selectedGoalId, selectedLoanId, selectedTransactionId, selectedAccountId, selectedUserId, selectedInvitationToken, goalPrefill, contributionAmount, loanPaymentAmount, expenseRefreshKey, groupRefreshKey, financeRefreshKey, spacevRefreshKey, choreRefreshKey, rideRefreshKey, budgetRefreshKey, goalRefreshKey, loanRefreshKey]);

  // Set up push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Register device for push notifications (may fail in Expo Go without projectId - that's OK)
    registerDeviceForPushNotifications().catch(err => {
      console.log('[App] Push notifications not available (this is normal in Expo Go without projectId):', err.message);
    });

    // Set up notification listeners
    const cleanup = setupNotificationListeners(
      // Handle notification received in foreground
      async (notification) => {
        console.log('Notification received:', notification);
        // Update badge count
        if (token) {
          try {
            const count = await getUnreadCount(token);
            await setBadgeCount(count);
          } catch (err) {
            console.error('Failed to update badge count:', err);
          }
        }
      },
      // Handle notification tap
      (response) => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);

        // Navigate based on notification type
        if (data?.expenseId) {
          navigate('expenseDetail', { selectedExpenseId: data.expenseId });
        } else if (data?.choreId) {
          navigate('choreDetail', { selectedChoreId: data.choreId });
        } else if (data?.listingId) {
          navigate('spacevDetail', { selectedSpaceVId: data.listingId });
        } else if (data?.rideId) {
          navigate('rideDetail', { selectedRideId: data.rideId });
        } else if (data?.groupId) {
          navigate('groupDetail', { selectedGroupId: data.groupId });
        } else if (data?.invitationToken) {
          navigate('groupInvitation', { selectedInvitationToken: data.invitationToken });
        } else if (data?.friendId) {
          navigate('friends');
        } else if (data?.chatId) {
          navigate('messageThread', {
            selectedChatId: data.chatId,
            selectedOtherUser: data.otherUser,
            selectedGroup: data.groupId ? { id: data.groupId, name: data.groupName } : undefined,
          });
        } else {
          // Default: navigate to notifications screen
          navigate('notifications');
        }
      },
    );

    // Update badge count on mount
    const updateBadge = async () => {
      if (token) {
        try {
          const count = await getUnreadCount(token);
          await setBadgeCount(count);
        } catch (err) {
          console.error('Failed to update badge count:', err);
        }
      }
    };
    updateBadge();

    return cleanup;
  }, [isAuthenticated, token, navigate]);
  
  // Capture previous screen before navigation happens
  useEffect(() => {
    // When currentScreen changes, the previous screen is what we had before
    // But we need to capture it BEFORE the change, so we do it in wrapScreen
  }, [currentScreen]);
  
  // Helper to go back using history
  const goBack = useCallback(() => {
    // Get previous screen BEFORE popping
    const prev = navHistory.getPreviousScreen();
    
    if (!prev) {
      // No previous screen, can't go back - do nothing
      return;
    }
    
    // Pop the current screen from history
    navHistory.pop();
    
    // Restore previous screen
    setCurrentScreen(prev.screen as typeof currentScreen);
    
    // Restore state from params if available
    if (prev.params) {
      const params = prev.params;
      if (params.selectedContext !== undefined) setSelectedContext(params.selectedContext);
      if (params.selectedTransactionType !== undefined) setSelectedTransactionType(params.selectedTransactionType);
      if (params.selectedGroupId !== undefined) {
        // If explicitly set to null, clear it; otherwise set it
        setSelectedGroupId(params.selectedGroupId === null ? null : params.selectedGroupId);
      }
      if (params.selectedChoreId !== undefined) setSelectedChoreId(params.selectedChoreId);
      if (params.selectedRideId !== undefined) setSelectedRideId(params.selectedRideId);
      if (params.selectedSpaceVId !== undefined) setSelectedSpaceVId(params.selectedSpaceVId);
      if (params.selectedChatId !== undefined) setSelectedChatId(params.selectedChatId);
      if (params.selectedOtherUser !== undefined) setSelectedOtherUser(params.selectedOtherUser);
      if (params.selectedGroup !== undefined) setSelectedGroup(params.selectedGroup);
      if (params.selectedPayeeId !== undefined) setSelectedPayeeId(params.selectedPayeeId);
      if (params.selectedPayeeName !== undefined) setSelectedPayeeName(params.selectedPayeeName);
      if (params.selectedSettlementAmount !== undefined) setSelectedSettlementAmount(params.selectedSettlementAmount);
      if (params.selectedSettlementGroupId !== undefined) setSelectedSettlementGroupId(params.selectedSettlementGroupId);
      if (params.selectedExpenseId !== undefined) setSelectedExpenseId(params.selectedExpenseId);
      if (params.selectedFriendId !== undefined) setSelectedFriendId(params.selectedFriendId);
      if (params.selectedFriendName !== undefined) setSelectedFriendName(params.selectedFriendName);
      if (params.selectedBudgetId !== undefined) setSelectedBudgetId(params.selectedBudgetId);
      if (params.selectedGoalId !== undefined) setSelectedGoalId(params.selectedGoalId);
      if (params.selectedLoanId !== undefined) setSelectedLoanId(params.selectedLoanId);
      if (params.selectedTransactionId !== undefined) setSelectedTransactionId(params.selectedTransactionId);
      if (params.selectedAccountId !== undefined) setSelectedAccountId(params.selectedAccountId);
      if (params.selectedUserId !== undefined) setSelectedUserId(params.selectedUserId);
      if (params.selectedInvitationToken !== undefined) setSelectedInvitationToken(params.selectedInvitationToken);
      if (params.goalPrefill !== undefined) setGoalPrefill(params.goalPrefill);
      if (params.contributionAmount !== undefined) setContributionAmount(params.contributionAmount);
      if (params.loanPaymentAmount !== undefined) setLoanPaymentAmount(params.loanPaymentAmount);
      if (params.expenseRefreshKey !== undefined) setExpenseRefreshKey(params.expenseRefreshKey);
      if (params.groupRefreshKey !== undefined) setGroupRefreshKey(params.groupRefreshKey);
      if (params.financeRefreshKey !== undefined) setFinanceRefreshKey(params.financeRefreshKey);
      if (params.spacevRefreshKey !== undefined) setSpacevRefreshKey(params.spacevRefreshKey);
      if (params.choreRefreshKey !== undefined) setChoreRefreshKey(params.choreRefreshKey);
      if (params.rideRefreshKey !== undefined) setRideRefreshKey(params.rideRefreshKey);
      if (params.budgetRefreshKey !== undefined) setBudgetRefreshKey(params.budgetRefreshKey);
      if (params.goalRefreshKey !== undefined) setGoalRefreshKey(params.goalRefreshKey);
      if (params.loanRefreshKey !== undefined) setLoanRefreshKey(params.loanRefreshKey);
    }
  }, [navHistory]);
  
  // Enhanced setCurrentScreen that tracks history automatically
  // This allows existing code to work while maintaining navigation stack
  const setCurrentScreenWithHistory = useCallback((screen: ScreenName) => {
    // Only track history if we're not already on this screen
    if (screen !== currentScreen) {
      // Capture current state before navigation
      const currentState = {
        selectedContext,
        selectedTransactionType,
        selectedGroupId,
        selectedChoreId,
        selectedRideId,
        selectedSpaceVId,
        selectedChatId,
        selectedOtherUser,
      selectedPayeeId,
      selectedPayeeName,
      selectedSettlementAmount,
      selectedSettlementGroupId,
      selectedExpenseId,
        selectedFriendId,
        selectedFriendName,
        selectedBudgetId,
        selectedGoalId,
        selectedLoanId,
        selectedTransactionId,
        selectedAccountId,
        selectedUserId,
        selectedInvitationToken,
        goalPrefill,
        contributionAmount,
        loanPaymentAmount,
        expenseRefreshKey,
        groupRefreshKey,
        financeRefreshKey,
        spacevRefreshKey,
        choreRefreshKey,
        rideRefreshKey,
        budgetRefreshKey,
        goalRefreshKey,
        loanRefreshKey,
      };
      
      // Save current screen to history with its state, then add new screen
      const lastHistoryEntry = navHistory.history[navHistory.history.length - 1];
      
      // Only push current screen if it's not already the last entry in history
      if (!lastHistoryEntry || lastHistoryEntry.screen !== currentScreen) {
        navHistory.push(currentScreen, currentState);
      }
      
      // Now push the new screen to history (this becomes the new current screen)
      navHistory.push(screen, {});
    }
    
    // Update screen
    setCurrentScreen(screen);
  }, [navHistory, currentScreen, selectedContext, selectedTransactionType, selectedGroupId, selectedChoreId, selectedRideId, selectedSpaceVId, selectedChatId, selectedOtherUser, selectedPayeeId, selectedPayeeName, selectedSettlementAmount, selectedExpenseId, selectedFriendId, selectedFriendName, selectedBudgetId, selectedGoalId, selectedLoanId, selectedTransactionId, selectedAccountId, selectedUserId, selectedInvitationToken, goalPrefill, contributionAmount, loanPaymentAmount, expenseRefreshKey, groupRefreshKey, financeRefreshKey, spacevRefreshKey, choreRefreshKey, rideRefreshKey, budgetRefreshKey, goalRefreshKey, loanRefreshKey]);

  // Helper to get previous screen name from navigation history
  const getPreviousScreenName = useCallback((): string | null => {
    if (navHistory.history.length > 1) {
      const prevEntry = navHistory.getPreviousScreen();
      return prevEntry ? prevEntry.screen : null;
    }
    return null;
  }, [navHistory]);

  // Helper to wrap any screen with swipe-to-go-back functionality
  // RootScreenRenderer handles transitions for all screens
  const wrapScreen = useCallback((screen: React.ReactNode, enableSwipe: boolean = true, screenName?: string) => {
    const targetScreenName = screenName || currentScreen;
    
    // When screen name changes, move current to previous BEFORE updating
    if (lastScreenNameRef.current !== targetScreenName && currentScreenNodeRef.current) {
      previousScreenNodeRef.current = currentScreenNodeRef.current;
    }
    lastScreenNameRef.current = targetScreenName;
    
    // Store current screen node
    currentScreenNodeRef.current = screen;

    // Don't wrap login/register screens, home screen, or tab screens (they have bottom nav)
    const tabScreens = ['home', 'expenses', 'chores', 'feed', 'rides'];
    if (!enableSwipe || tabScreens.includes(targetScreenName) || !navHistory.canGoBack()) {
      return screen;
    }

    // Use the previous screen node from ref
    const previousScreen = previousScreenNodeRef.current;

    return (
      <SwipeableScreen
        previousScreen={previousScreen}
        onSwipeBack={goBack}
        canGoBack={navHistory.canGoBack}
        enabled={enableSwipe}
      >
        {screen}
      </SwipeableScreen>
    );
  }, [goBack, navHistory, currentScreen]);

  // Build all screen configurations for root-level rendering
  // This allows all screens to stay mounted during transitions
  const allScreens = useMemo(() => {
    const screens: Array<{ name: string; component: React.ReactNode; key: string; requiresBottomNav?: boolean }> = [];

    // Tab screens (always available)
    screens.push({
      name: 'home',
      key: `home-${expenseRefreshKey}`,
      requiresBottomNav: true,
      component: (
        <HomeScreen
          key={`home-${expenseRefreshKey}`}
          refreshKey={expenseRefreshKey}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToExpenses={() => setCurrentScreenWithHistory('expenses')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          onNavigateToGroups={() => setCurrentScreenWithHistory('groups')}
          onNavigateToFinance={() => setCurrentScreenWithHistory('finance')}
          onNavigateToChores={() => navigate('chores', { selectedGroupId: null })}
          onNavigateToRides={() => setCurrentScreenWithHistory('rides')}
          onNavigateToSpaceV={() => setCurrentScreenWithHistory('feed')}
          onNavigateToMessages={() => setCurrentScreenWithHistory('conversations')}
          onNavigateToAnalytics={() => setCurrentScreenWithHistory('analytics')}
          onNavigateToActivity={() => setCurrentScreenWithHistory('activity')}
          onNavigateToFriends={() => setCurrentScreenWithHistory('friends')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToLeaderboard={() => setCurrentScreenWithHistory('leaderboard')}
        />
      ),
    });

    screens.push({
      name: 'expenses',
      key: `expenses-${expenseRefreshKey}`,
      requiresBottomNav: true,
      component: (
        <ExpenseListScreen
          key={`expenses-${expenseRefreshKey}`}
          onCreateExpense={() => setCurrentScreenWithHistory('createExpense')}
          onViewAnalytics={() => setCurrentScreenWithHistory('billchopAnalytics')}
          onViewBalances={() => setCurrentScreenWithHistory('balanceSummary')}
          onViewExpense={(expenseId) => {
            navigate('expenseDetail', { selectedExpenseId: expenseId });
          }}
          onViewExpenseHistory={() => {
            // Navigate to all expense history (no expenseId)
            // Clear selectedExpenseId to show all history
            setSelectedExpenseId(null);
            setCurrentScreenWithHistory('expenseHistory');
          }}
          onViewFriends={() => setCurrentScreenWithHistory('billchopFriends')}
          onViewGroups={() => setCurrentScreenWithHistory('billchopGroups')}
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />
      ),
    });

    screens.push({
      name: 'chores',
      key: `chores-${choreRefreshKey}`,
      requiresBottomNav: true,
      component: (
        <ChoreListScreen
          key={`chores-${choreRefreshKey}`}
          groupId={(() => {
            // Only pass groupId if we explicitly navigated with selectedGroupId (and it's not null)
            // Check the current navigation entry's params
            const currentEntry = navHistory.history[navHistory.history.length - 1];
            const paramGroupId = currentEntry?.params?.selectedGroupId;
            // If paramGroupId is explicitly null, don't use it
            // If paramGroupId is undefined, don't use selectedGroupId state (it might be stale)
            // Only use it if paramGroupId is explicitly set to a non-null value
            return paramGroupId !== undefined && paramGroupId !== null ? paramGroupId : undefined;
          })()}
          onCreateChore={() => {
            // Clear selectedGroupId when creating from main chores screen (not from group)
            navigate('createChore', { selectedGroupId: null });
          }}
          onViewHistory={() => {
            navigate('choreHistory', {});
          }}
          onViewChore={(choreId) => {
            navigate('choreDetail', { selectedChoreId: choreId });
          }}
          onViewStats={() => navigate('choreStats')}
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />
      ),
    });

    // Unified Feed Screen (replaces SpaceV list for social feed)
    screens.push({
      name: 'feed',
      key: `feed-${spacevRefreshKey}`,
      requiresBottomNav: true,
      component: (
        <UnifiedFeedScreen
          key={`feed-${spacevRefreshKey}`}
          onCreatePost={() => setCurrentScreenWithHistory('createPost')}
          onCreateListing={() => setCurrentScreenWithHistory('createSpaceV')}
          onViewPost={(postId) => {
            navigate('postDetail', { selectedPostId: postId });
          }}
          onViewListing={(listingId) => {
            navigate('spacevDetail', { selectedSpaceVId: listingId });
          }}
          onEditListing={(listingId) => {
            navigate('editSpaceV', { selectedSpaceVId: listingId });
          }}
          onNavigateToUserProfile={(userId) => navigate('userProfile', { selectedUserId: userId })}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToMessage={(chatId: string, otherUser: any) => {
            navigate('messageThread', {
              selectedChatId: chatId,
              selectedOtherUser: otherUser,
            });
          }}
          onBack={goBack}
        />
      ),
    });

    screens.push({
      name: 'rides',
      key: `rides-${rideRefreshKey}`,
      requiresBottomNav: true,
      component: (
        <RideListScreen
          key={`rides-${rideRefreshKey}`}
          groupId={selectedGroupId || undefined}
          onCreateRide={() => setCurrentScreenWithHistory('createRide')}
          onViewRide={(rideId) => {
            navigate('rideDetail', { selectedRideId: rideId });
          }}
          onViewAnalytics={() => setCurrentScreenWithHistory('rideAnalytics')}
          onViewHistory={() => setCurrentScreenWithHistory('rideHistory')}
          onEditFavorite={(favorite) => {
            selectedFavoriteRef.current = favorite; // Set ref immediately for synchronous access
            setSelectedFavorite(favorite);
            setCurrentScreenWithHistory('editFavoriteRide');
          }}
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />
      ),
    });

    // Regular screens (conditionally added based on state)
    if (selectedPayeeId) {
      screens.push({
        name: 'settleUp',
        key: `settleUp-${selectedPayeeId}`,
        component: wrapScreen(
          <SettleUpScreen
            payeeId={selectedPayeeId}
            amount={selectedSettlementAmount}
            payeeName={selectedPayeeName}
            groupId={selectedSettlementGroupId || undefined}
            onBack={goBack}
            onSuccess={() => {
              setExpenseRefreshKey(prev => prev + 1);
              setGroupRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'settleUp'
        ),
      });
    }

    if (selectedExpenseId) {
      screens.push({
        name: 'expenseDetail',
        key: `expenseDetail-${selectedExpenseId}`,
        component: wrapScreen(
          <ExpenseDetailScreen
            expenseId={selectedExpenseId}
            onBack={goBack}
            onEdit={(expenseId) => {
              navigate('editExpense', { selectedExpenseId: expenseId });
            }}
            onNavigateToUserProfile={(userId) => navigate('userProfile', { selectedUserId: userId })}
            onNavigateToRide={(rideId) => navigate('rideDetail', { selectedRideId: rideId })}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'expenseDetail'
        ),
      });
    }

    // Expense History Screen - can be for specific expense or all history
    // Expense History Screen - can be for specific expense or all history
    if (currentScreen === 'expenseHistory') {
      screens.push({
        name: 'expenseHistory',
        key: selectedExpenseId ? `expenseHistory-${selectedExpenseId}` : 'expenseHistory-all',
        component: wrapScreen(
          <ExpenseHistoryScreen
            expenseId={selectedExpenseId || undefined}
            onBack={goBack}
            onNavigateToExpense={(expenseId) => navigate('expenseDetail', { selectedExpenseId: expenseId })}
            onNavigateToRide={(rideId) => navigate('rideDetail', { selectedRideId: rideId })}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'expenseHistory'
        ),
      });
    }

    if (selectedExpenseId) {
      screens.push({
        name: 'editExpense',
        key: `editExpense-${selectedExpenseId}`,
        component: wrapScreen(
          <EditExpenseScreen
            expenseId={selectedExpenseId}
            onBack={goBack}
            onSuccess={() => {
              setExpenseRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'editExpense'
        ),
      });
    }

    if (selectedGroupId) {
      screens.push({
        name: 'groupDetail',
        key: `groupDetail-${selectedGroupId}-${groupRefreshKey}`,
        component: wrapScreen(
          <GroupDetailScreen
            key={`group-${selectedGroupId}-${groupRefreshKey}`}
            groupId={selectedGroupId}
            onCreateExpense={() => navigate('createExpense', { selectedGroupId: selectedGroupId })}
            onCreateChore={() => navigate('createChore', { selectedGroupId: selectedGroupId })}
            onViewChore={(choreId) => navigate('choreDetail', { selectedChoreId: choreId })}
            onViewAllChores={() => navigate('chores', { selectedGroupId: selectedGroupId })}
            onBack={goBack} 
            onViewFeed={(groupId) => navigate('groupFeed', { selectedGroupId: groupId })}
            onSettings={(groupId) => {
              navigate('groupSettings', { selectedGroupId: groupId });
            }}
            onAddMember={(groupId) => {
              navigate('addGroupMember', { selectedGroupId: groupId });
            }}
            onSettleUp={(payeeId, amount, payeeName, groupId) => {
              navigate('settleUp', {
                selectedPayeeId: payeeId,
                selectedSettlementAmount: amount,
                selectedPayeeName: payeeName,
                selectedSettlementGroupId: groupId,
              });
            }}
            onMessageGroup={async (groupId, groupName) => {
              try {
                const { createGroupChat } = await import('./src/api/messagingApi');
                if (!token) return;
                const conversation = await createGroupChat(token, groupId);
                setSelectedChatId(conversation.id);
                setSelectedGroup(conversation.group);
                navigate('messageThread', {
                  selectedChatId: conversation.id,
                  selectedGroup: conversation.group,
                });
              } catch (error) {
                console.error('Failed to create group chat:', error);
                Alert.alert('Error', 'Failed to start group chat. Please try again.');
              }
            }}
            onNavigateToUserProfile={(userId) => navigate('userProfile', { selectedUserId: userId })}
          />,
          true,
          'groupDetail'
        ),
      });
    }

    if (selectedGroupId) {
      screens.push({
        name: 'groupFeed',
        key: `groupFeed-${selectedGroupId}-${spacevRefreshKey}`,
        component: wrapScreen(
          <GroupFeedScreen
            groupId={selectedGroupId}
            onCreatePost={() => navigate('createPost', { selectedGroupId })}
            onCreateListing={() => navigate('createSpaceV', { selectedGroupId })}
            onViewPost={(postId) => navigate('postDetail', { selectedPostId: postId })}
            onViewListing={(listingId) => navigate('spacevDetail', { selectedSpaceVId: listingId })}
            onEditListing={(listingId) => navigate('editSpaceV', { selectedSpaceVId: listingId })}
            onNavigateToMessage={(chatId: string, otherUser: any) => {
              navigate('messageThread', {
                selectedChatId: chatId,
                selectedOtherUser: otherUser,
              });
            }}
            onNavigateToUserProfile={(userId) => navigate('userProfile', { selectedUserId: userId })}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onBack={goBack}
          />,
          true,
          'groupFeed'
        ),
      });
    }

    if (selectedGroupId) {
      screens.push({
        name: 'groupSettings',
        key: `groupSettings-${selectedGroupId}`,
        component: wrapScreen(
          <GroupSettingsScreen
            groupId={selectedGroupId}
            onBack={goBack}
            onGroupUpdated={() => {
              setGroupRefreshKey(prev => prev + 1);
            }}
            onAddMember={(groupId) => {
              navigate('addGroupMember', { selectedGroupId: groupId });
            }}
            onNavigateToUserProfile={(userId) => navigate('userProfile', { selectedUserId: userId })}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'groupSettings'
        ),
      });
    }

    if (selectedGroupId) {
      screens.push({
        name: 'addGroupMember',
        key: `addGroupMember-${selectedGroupId}`,
        component: wrapScreen(
          <AddGroupMemberScreen
            groupId={selectedGroupId}
            onBack={goBack}
            onMemberAdded={() => {
              setGroupRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'addGroupMember'
        ),
      });
    }

    if (selectedInvitationToken) {
      screens.push({
        name: 'groupInvitation',
        key: `groupInvitation-${selectedInvitationToken}`,
        component: wrapScreen(
          <GroupInvitationScreen
            invitationToken={selectedInvitationToken}
            onBack={goBack}
            onAccept={(groupId) => {
              setGroupRefreshKey(prev => prev + 1);
              navigate('groupDetail', { selectedGroupId: groupId });
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'groupInvitation'
        ),
      });
    }

    if (selectedChoreId) {
      screens.push({
        name: 'choreDetail',
        key: `choreDetail-${selectedChoreId}-${choreRefreshKey}`,
        component: wrapScreen(
          <ChoreDetailScreen
            key={`chore-${selectedChoreId}-${choreRefreshKey}`}
            choreId={selectedChoreId}
            onBack={goBack}
            onRefresh={() => {
              setChoreRefreshKey(prev => prev + 1);
            }}
            onEdit={() => navigate('editChore', { selectedChoreId })}
            onViewHistory={() => navigate('choreHistory', { selectedChoreId })}
            onNavigateToGroup={(groupId) => navigate('groupDetail', { selectedGroupId: groupId })}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'choreDetail'
        ),
      });
    }

    if (selectedChoreId) {
      screens.push({
        name: 'editChore',
        key: `editChore-${selectedChoreId}`,
        component: wrapScreen(
          <EditChoreScreen
            key={`edit-chore-${selectedChoreId}`}
            choreId={selectedChoreId}
            onBack={goBack}
            onSuccess={() => {
              setChoreRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'editChore'
        ),
      });
    }

    // ChoreHistoryScreen - Show all completed chores (no choreId needed)
    if (currentScreen === 'choreHistory' || navHistory.history.some(h => h.screen === 'choreHistory')) {
      screens.push({
        name: 'choreHistory',
        key: 'choreHistory-all',
        component: wrapScreen(
          <ChoreHistoryScreen
            key="chore-history-all"
            onBack={goBack}
            onViewChore={(choreId) => navigate('choreDetail', { selectedChoreId: choreId })}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'choreHistory'
        ),
      });
    }

    if (selectedRideId) {
      screens.push({
        name: 'rideDetail',
        key: `rideDetail-${selectedRideId}-${rideRefreshKey}`,
        component: wrapScreen(
          <RideDetailScreen
            key={`ride-${selectedRideId}-${rideRefreshKey}`}
            rideId={selectedRideId}
            onBack={goBack}
            onRefresh={() => {
              setRideRefreshKey(prev => prev + 1);
            }}
            onNavigateToEdit={(rideId) => navigate('editRide', { selectedRideId: rideId })}
            onNavigateToExpense={(expenseId) => navigate('expenseDetail', { selectedExpenseId: expenseId })}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'rideDetail'
        ),
      });
    }

    if (selectedRideId) {
      screens.push({
        name: 'editRide',
        key: `editRide-${selectedRideId}`,
        component: wrapScreen(
          <EditRideScreen
            key={`edit-ride-${selectedRideId}`}
            rideId={selectedRideId}
            onBack={goBack}
            onSuccess={() => {
              setRideRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'editRide'
        ),
      });
    }

    if (currentScreen === 'editFavoriteRide') {
      const favoriteToEdit = selectedFavorite || selectedFavoriteRef.current;
      if (favoriteToEdit) {
        screens.push({
          name: 'editFavoriteRide',
          key: `editFavoriteRide-${favoriteToEdit.id}`,
          component: wrapScreen(
            <EditFavoriteRideScreen
              key={`edit-favorite-${favoriteToEdit.id}`}
              favorite={favoriteToEdit}
              onBack={goBack}
              onSuccess={() => {
                setRideRefreshKey(prev => prev + 1);
                setSelectedFavorite(null);
                selectedFavoriteRef.current = null;
                goBack();
              }}
              onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
              onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
              onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
            />,
            true,
            'editFavoriteRide'
          ),
        });
      }
    }

    screens.push({
      name: 'rideHistory',
      key: 'rideHistory',
      component: wrapScreen(
        <RideHistoryScreen
          onBack={goBack}
          onViewRide={(rideId) => {
            navigate('rideDetail', { selectedRideId: rideId });
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'rideHistory'
      ),
    });

    screens.push({
      name: 'rideAnalytics',
      key: 'rideAnalytics',
      component: wrapScreen(
        <RideAnalyticsScreen
          onBack={goBack}
          onNavigateToRide={(rideId) => navigate('rideDetail', { selectedRideId: rideId })}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'rideAnalytics'
      ),
    });

    if (selectedSpaceVId) {
      screens.push({
        name: 'spacevDetail',
        key: `spacevDetail-${selectedSpaceVId}-${spacevRefreshKey}`,
        component: wrapScreen(
          <SpaceVDetailScreen
            key={`spacev-${selectedSpaceVId}-${spacevRefreshKey}`}
            spacevId={selectedSpaceVId}
            onBack={goBack}
            onRefresh={() => {
              setSpacevRefreshKey(prev => prev + 1);
            }}
            onNavigateToMessage={(chatId: string, otherUser: any) => {
              navigate('messageThread', {
                selectedChatId: chatId,
                selectedOtherUser: otherUser,
              });
            }}
            onEdit={(spacevId) => {
              navigate('editSpaceV', { selectedSpaceVId: spacevId });
            }}
            onNavigateToUserProfile={(userId) => navigate('userProfile', { selectedUserId: userId })}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'spacevDetail'
        ),
      });
    }

    if (selectedPostId) {
      screens.push({
        name: 'postDetail',
        key: `postDetail-${selectedPostId}-${spacevRefreshKey}`,
        component: wrapScreen(
          <PostDetailScreen
            postId={selectedPostId}
            onBack={goBack}
            onRefresh={() => {
              setSpacevRefreshKey(prev => prev + 1);
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
            onNavigateToUserProfile={(userId) => {
              setSelectedUserId(userId);
              setCurrentScreenWithHistory('userProfile');
            }}
          />,
          true,
          'postDetail'
        ),
      });
    }

    if (selectedSpaceVId) {
      screens.push({
        name: 'editSpaceV',
        key: `editSpaceV-${selectedSpaceVId}`,
        component: wrapScreen(
          <EditSpaceVScreen
            spacevId={selectedSpaceVId}
            onBack={goBack}
            onSuccess={() => {
              navigate('spacevDetail', { selectedSpaceVId });
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'editSpaceV'
        ),
      });
    }

    if (selectedChatId) {
      screens.push({
        name: 'messageThread',
        key: `messageThread-${selectedChatId}`,
        component: wrapScreen(
          <MessageThreadScreen
            route={{
              params: {
                chatId: selectedChatId,
                otherUser: selectedOtherUser,
                group: selectedGroup,
              },
            }}
            navigation={{
              goBack: () => {
                setSelectedChatId(null);
                setSelectedOtherUser(null);
                setSelectedGroup(null);
                goBack();
              },
            }}
          />,
          true,
          'messageThread'
        ),
      });
    }

    if (selectedFriendId) {
      screens.push({
        name: 'friendExpenseList',
        key: `friendExpenseList-${selectedFriendId}`,
        component: wrapScreen(
          <FriendExpenseListScreen
            friendId={selectedFriendId}
            friendName={selectedFriendName}
            onBack={goBack}
            onViewExpense={(expenseId) => {
              navigate('expenseDetail', { selectedExpenseId: expenseId });
            }}
            onCreateChore={(friendId) => navigate('createChore', { selectedFriendId: friendId, selectedGroupId: null })}
            onCreateExpense={(friendId) => navigate('createExpense', { selectedFriendId: friendId, selectedGroupId: null })}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'friendExpenseList'
        ),
      });
    }

    if (selectedTransactionId) {
      screens.push({
        name: 'editTransaction',
        key: `editTransaction-${selectedTransactionId}`,
        component: wrapScreen(
          <EditTransactionScreen
            key={`editTransaction-${selectedTransactionId}`}
            transactionId={selectedTransactionId}
            onBack={goBack}
            onSuccess={() => {
              setFinanceRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'editTransaction'
        ),
      });
    }

    if (selectedAccountId) {
      screens.push({
        name: 'editAccount',
        key: `editAccount-${selectedAccountId}`,
        component: wrapScreen(
          <EditAccountScreen
            key={`editAccount-${selectedAccountId}`}
            accountId={selectedAccountId}
            onBack={goBack}
            onSuccess={() => {
              setFinanceRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'editAccount'
        ),
      });
    }

    if (selectedBudgetId) {
      screens.push({
        name: 'editBudget',
        key: `editBudget-${selectedBudgetId}`,
        component: wrapScreen(
          <EditBudgetScreen
            key={`editBudget-${selectedBudgetId}`}
            budgetId={selectedBudgetId}
            onBack={goBack}
            onSuccess={() => {
              setBudgetRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'editBudget'
        ),
      });
    }

    if (selectedGoalId) {
      screens.push({
        name: 'goalDetail',
        key: `goalDetail-${selectedGoalId}-${goalRefreshKey}`,
        component: wrapScreen(
          <GoalDetailScreen
            key={`goalDetail-${selectedGoalId}-${goalRefreshKey}`}
            goalId={selectedGoalId}
            onEdit={() => navigate('editGoal', { selectedGoalId })}
            onAddContribution={() => {
              navigate('addContribution', { selectedGoalId });
            }}
            onBack={goBack}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'goalDetail'
        ),
      });
    }

    if (selectedGoalId) {
      screens.push({
        name: 'addContribution',
        key: `addContribution-${selectedGoalId}`,
        component: wrapScreen(
          <AddContributionScreen
            goalId={selectedGoalId}
            suggestedAmount={contributionAmount}
            onBack={goBack}
            onSuccess={() => {
              setGoalRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'addContribution'
        ),
      });
    }

    if (selectedGoalId) {
      screens.push({
        name: 'editGoal',
        key: `editGoal-${selectedGoalId}`,
        component: wrapScreen(
          <EditGoalScreen
            key={`editGoal-${selectedGoalId}`}
            goalId={selectedGoalId}
            onBack={goBack}
            onSuccess={() => {
              setGoalRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'editGoal'
        ),
      });
    }

    if (selectedLoanId) {
      screens.push({
        name: 'loanDetail',
        key: `loanDetail-${selectedLoanId}-${loanRefreshKey}`,
        component: wrapScreen(
          <LoanDetailScreen
            key={`loanDetail-${selectedLoanId}-${loanRefreshKey}`}
            loanId={selectedLoanId}
            onRecordPayment={() => navigate('recordLoanPayment', { selectedLoanId })}
            onLoanUpdated={() => setLoanRefreshKey((prev) => prev + 1)}
            onBack={goBack}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'loanDetail'
        ),
      });
    }

    if (selectedLoanId) {
      screens.push({
        name: 'recordLoanPayment',
        key: `recordLoanPayment-${selectedLoanId}`,
        component: wrapScreen(
          <RecordLoanPaymentScreen
            loanId={selectedLoanId}
            suggestedAmount={loanPaymentAmount}
            onBack={goBack}
            onSuccess={() => {
              setLoanRefreshKey((prev) => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'recordLoanPayment'
        ),
      });
    }

    // Screens that are always available (no conditions)
    screens.push({
      name: 'editProfile',
      key: 'editProfile',
      component: wrapScreen(
        <EditProfileScreen 
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'editProfile'
      ),
    });

    screens.push({
      name: 'trustScoreInsights',
      key: 'trustScoreInsights',
      component: wrapScreen(
        <TrustScoreInsightsScreen
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'trustScoreInsights'
      ),
    });

    screens.push({
      name: 'leaderboard',
      key: 'leaderboard',
      component: wrapScreen(
        <FinScoreLeaderboardScreen
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          onViewUserProfile={(userId) => {
            setSelectedUserId(userId);
            setCurrentScreenWithHistory('userProfile');
          }}
        />,
        true,
        'leaderboard'
      ),
    });

    screens.push({
      name: 'profile',
      key: `profile-${Date.now()}`,
      component: wrapScreen(
      <ProfileScreen
        key={`profile-${Date.now()}`}
        onEdit={() => navigate('editProfile')}
        onBack={goBack}
        onSettings={() => navigate('settings')}
        onEditListing={(listingId) => navigate('editSpaceV', { selectedSpaceVId: listingId })}
        onViewListing={(listingId) => navigate('spacevDetail', { selectedSpaceVId: listingId })}
        onViewPost={(postId) => navigate('postDetail', { selectedPostId: postId })}
        onViewTrustScoreInsights={() => navigate('trustScoreInsights')}
        onViewLeaderboard={() => navigate('leaderboard')}
        onNavigateToFriends={() => setCurrentScreenWithHistory('friends')}
        onNavigateToGroups={() => setCurrentScreenWithHistory('groups')}
        onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
        onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
        onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        onViewUserProfile={(userId) => navigate('userProfile', { selectedUserId: userId })}
        onViewGroup={(groupId) => navigate('groupDetail', { selectedGroupId: groupId })}
      />,
        true,
        'profile'
      ),
    });

    screens.push({
      name: 'createExpense',
      key: 'createExpense',
      component: wrapScreen(
        <CreateExpenseScreen
          groupId={selectedGroupId || undefined}
          friendId={selectedFriendId || undefined}
          onBack={goBack}
          onSuccess={() => {
            setExpenseRefreshKey(prev => prev + 1);
            if (selectedGroupId) {
              setGroupRefreshKey(prev => prev + 1);
            }
            goBack();
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'createExpense'
      ),
    });

    screens.push({
      name: 'billchopAnalytics',
      key: 'billchopAnalytics',
      component: wrapScreen(
        <BillchopAnalyticsScreen 
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'billchopAnalytics'
      ),
    });

    screens.push({
      name: 'balanceSummary',
      key: 'balanceSummary',
      component: wrapScreen(
        <BalanceSummaryScreen
          onBack={goBack}
          onSettleUp={(payeeId, amount, payeeName) => {
            navigate('settleUp', {
              selectedPayeeId: payeeId,
              selectedSettlementAmount: amount,
              selectedPayeeName: payeeName,
            });
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'balanceSummary'
      ),
    });

    screens.push({
      name: 'activity',
      key: 'activity',
      component: wrapScreen(
        <ActivityFeedScreen
          onBack={goBack}
          onViewExpense={(expenseId) => {
            navigate('expenseDetail', { selectedExpenseId: expenseId });
          }}
          onViewChore={(choreId) => {
            navigate('choreDetail', { selectedChoreId: choreId });
          }}
          onViewGroup={(groupId) => {
            navigate('groupDetail', { selectedGroupId: groupId });
          }}
          onViewSpaceV={(spacevId) => {
            navigate('spacevDetail', { selectedSpaceVId: spacevId });
          }}
          onViewRide={(rideId) => {
            navigate('rideDetail', { selectedRideId: rideId });
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'activity'
      ),
    });

    screens.push({
      name: 'billchopFriends',
      key: 'billchopFriends',
      component: wrapScreen(
        <BillchopFriendsScreen
          onBack={goBack}
          onViewFriendExpenses={(friendId, friendName) => {
            navigate('friendExpenseList', {
              selectedFriendId: friendId,
              selectedFriendName: friendName,
            });
          }}
          onSettleUp={(payeeId, amount, payeeName) => {
            navigate('settleUp', {
              selectedPayeeId: payeeId,
              selectedSettlementAmount: amount,
              selectedPayeeName: payeeName,
            });
          }}
          onAddNewFriends={() => setCurrentScreenWithHistory('friendSearch')}
          onMessageFriend={async (friendId, friendName) => {
            // Start conversation and navigate to message thread
            if (!token) return;
            
            try {
              const { startConversation } = await import('./src/api/messagingApi');
              const conversation = await startConversation(token, friendId);
              navigate('messageThread', {
                selectedChatId: conversation.id,
                selectedOtherUser: { id: friendId, profile: { displayName: friendName } },
              });
            } catch (err) {
              // If conversation fails, navigate to new conversation screen
              setCurrentScreenWithHistory('newConversation');
            }
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'billchopFriends'
      ),
    });

    screens.push({
      name: 'billchopGroups',
      key: 'billchopGroups',
      component: wrapScreen(
        <BillchopGroupsScreen
          onBack={goBack}
          onViewGroup={(groupId) => {
            navigate('groupDetail', { selectedGroupId: groupId });
          }}
          onViewExpense={(expenseId) => {
            navigate('expenseDetail', { selectedExpenseId: expenseId });
          }}
          onCreateCircle={() => setCurrentScreenWithHistory('createGroup')}
        />,
        true,
        'billchopGroups'
      ),
    });

    screens.push({
      name: 'createGroup',
      key: 'createGroup',
      component: wrapScreen(
        <CreateGroupScreen
          onBack={goBack}
          onSuccess={(groupId) => {
            setGroupRefreshKey(prev => prev + 1);
            navigate('groupDetail', { selectedGroupId: groupId });
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'createGroup'
      ),
    });

    screens.push({
      name: 'groups',
      key: 'groups',
      component: wrapScreen(
        <GroupListScreen
          onCreateGroup={() => setCurrentScreenWithHistory('createGroup')}
          onViewGroup={(groupId) => {
            navigate('groupDetail', { selectedGroupId: groupId });
          }}
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'groups'
      ),
    });

    screens.push({
      name: 'addTransaction',
      key: 'addTransaction',
      component: wrapScreen(
        <AddTransactionScreen
          context={selectedContext || undefined}
          initialType={selectedTransactionType || undefined}
          onBack={goBack}
          onSuccess={() => {
            setFinanceRefreshKey(prev => prev + 1);
            goBack();
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'addTransaction'
      ),
    });

    screens.push({
      name: 'finance',
      key: `finance-${financeRefreshKey}`,
      component: (
        <FinanceScreen
          key={`finance-${financeRefreshKey}`}
          onAddIncome={(context) => {
            navigate('addTransaction', {
              selectedContext: context,
              selectedTransactionType: 'income',
            });
          }}
          onAddExpense={(context) => {
            navigate('addTransaction', {
              selectedContext: context,
              selectedTransactionType: 'expense',
            });
          }}
          onViewBudgets={(context) => {
            navigate('budgets', { selectedContext: context });
          }}
          onViewGoals={(context) => {
            navigate('goals', { selectedContext: context });
          }}
          onViewLoans={(context) => {
            navigate('loans', { selectedContext: context });
          }}
          onViewAdvisor={(context) => {
            navigate('advisor', { selectedContext: context });
          }}
          onEditTransaction={(transactionId) => {
            navigate('editTransaction', { selectedTransactionId: transactionId });
          }}
          onViewHistory={(context) => {
            navigate('financeHistory', { selectedContext: context });
          }}
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />
      ),
    });

    screens.push({
      name: 'financeHistory',
      key: 'financeHistory',
      component: wrapScreen(
        <FinanceHistoryScreen
          context={selectedContext || undefined}
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'financeHistory'
      ),
    });

    if (selectedContext) {
      screens.push({
        name: 'budgets',
        key: `budgets-${selectedContext}-${budgetRefreshKey}`,
        component: wrapScreen(
          <BudgetScreen
            key={`budgets-${selectedContext}-${budgetRefreshKey}`}
            context={selectedContext}
            onCreateBudget={() => setCurrentScreenWithHistory('createBudget')}
            onEditBudget={(budgetId) => {
              navigate('editBudget', { selectedBudgetId: budgetId });
            }}
            onBack={goBack}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'budgets'
        ),
      });
    }

    if (selectedContext) {
      screens.push({
        name: 'createBudget',
        key: `createBudget-${selectedContext}`,
        component: wrapScreen(
          <CreateBudgetScreen
            context={selectedContext}
            onBack={goBack}
            onSuccess={() => {
              setBudgetRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'createBudget'
        ),
      });
    }

    if (selectedContext) {
      screens.push({
        name: 'goals',
        key: `goals-${selectedContext}-${goalRefreshKey}`,
        component: wrapScreen(
          <GoalsScreen
            key={`goals-${selectedContext}-${goalRefreshKey}`}
            context={selectedContext}
            onCreateGoal={() => setCurrentScreenWithHistory('createGoal')}
            onViewGoal={(goalId) => {
              navigate('goalDetail', { selectedGoalId: goalId });
            }}
            onBack={goBack}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'goals'
        ),
      });
    }

    if (selectedContext) {
      screens.push({
        name: 'createGoal',
        key: `createGoal-${selectedContext}`,
        component: wrapScreen(
          <CreateGoalScreen
            context={selectedContext}
            prefill={goalPrefill}
            onBack={goBack}
            onSuccess={() => {
              setGoalRefreshKey(prev => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'createGoal'
        ),
      });
    }

    if (selectedContext) {
      screens.push({
        name: 'loans',
        key: `loans-${selectedContext}-${loanRefreshKey}`,
        component: wrapScreen(
          <LoansListScreen
            key={`loans-${selectedContext}-${loanRefreshKey}`}
            context={selectedContext}
            onCreateLoan={() => setCurrentScreenWithHistory('createLoan')}
            onViewLoan={(loanId) => {
              navigate('loanDetail', { selectedLoanId: loanId });
            }}
            onBack={goBack}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'loans'
        ),
      });
    }

    if (selectedContext) {
      screens.push({
        name: 'createLoan',
        key: `createLoan-${selectedContext}`,
        component: wrapScreen(
          <CreateLoanScreen
            context={selectedContext}
            onBack={goBack}
            onSuccess={() => {
              setLoanRefreshKey((prev) => prev + 1);
              goBack();
            }}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
          />,
          true,
          'createLoan'
        ),
      });
    }

    if (selectedContext) {
      screens.push({
        name: 'advisor',
        key: `advisor-${selectedContext}`,
        component: wrapScreen(
          <FinancialAdvisorScreen
            context={selectedContext}
            onBack={goBack}
            onViewBudgets={(context) => {
              navigate('budgets', { selectedContext: context });
            }}
            onViewGoals={(context) => {
              navigate('goals', { selectedContext: context });
            }}
            onViewLoans={(context) => {
              navigate('loans', { selectedContext: context });
            }}
            onAddTransaction={(context, type) => {
              navigate('addTransaction', {
                selectedContext: context,
                selectedTransactionType: type,
              });
            }}
            onCreateGoal={(context, prefill) => {
              navigate('createGoal', {
                selectedContext: context,
                goalPrefill: prefill,
              });
            }}
            onAddContribution={(goalId, suggestedAmount) => {
              navigate('addContribution', {
                selectedGoalId: goalId || undefined,
                contributionAmount: suggestedAmount,
              });
            }}
            onRecordLoanPayment={(loanId, suggestedAmount) => {
              navigate('recordLoanPayment', {
                selectedLoanId: loanId || undefined,
                loanPaymentAmount: suggestedAmount,
              });
            }}
          />,
          true,
          'advisor'
        ),
      });
    }

    screens.push({
      name: 'choreStats',
      key: 'choreStats',
      component: wrapScreen(
        <ChoreStatsScreen 
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'choreStats'
      ),
    });

    // Only show createChore if we have params or it's explicitly navigated to
    // Check if selectedGroupId was explicitly passed (not just persisted)
    const currentEntry = navHistory.history[navHistory.history.length - 1];
    const explicitGroupId = currentEntry?.params?.selectedGroupId !== undefined 
      ? (currentEntry.params.selectedGroupId === null ? undefined : currentEntry.params.selectedGroupId)
      : undefined;
    const explicitFriendId = currentEntry?.params?.selectedFriendId !== undefined 
      ? currentEntry.params.selectedFriendId
      : undefined;

    screens.push({
      name: 'createChore',
      key: 'createChore',
      component: wrapScreen(
        <CreateChoreScreen
          groupId={explicitGroupId}
          friendId={explicitFriendId}
          onBack={goBack}
          onSuccess={() => {
            setChoreRefreshKey(prev => prev + 1);
            // Refresh group if we came from a group
            if (explicitGroupId) {
              setGroupRefreshKey(prev => prev + 1);
            }
            goBack();
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'createChore'
      ),
    });

    screens.push({
      name: 'conversations',
      key: 'conversations',
      component: wrapScreen(
        <ConversationListScreen
          navigation={{
            goBack,
            navigate: (screen: string, params?: any) => {
              if (screen === 'MessageThread') {
                navigate('messageThread', {
                  selectedChatId: params.chatId,
                  selectedOtherUser: params.otherUser,
                });
              } else if (screen === 'NewConversation') {
                setCurrentScreenWithHistory('newConversation');
              }
            },
          }}
          onBack={goBack}
          onNewMessage={() => setCurrentScreenWithHistory('newConversation')}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'conversations'
      ),
    });

    screens.push({
      name: 'newConversation',
      key: 'newConversation',
      component: wrapScreen(
        <NewConversationScreen
          onBack={goBack}
          onConversationStarted={(chatId, otherUser) => {
            navigate('messageThread', {
              selectedChatId: chatId,
              selectedOtherUser: otherUser,
            });
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'newConversation'
      ),
    });

    screens.push({
      name: 'createSpaceV',
      key: 'createSpaceV',
      component: wrapScreen(
        <CreateSpaceVScreen
          groupId={explicitGroupId}
          onBack={() => {
            goBack();
          }}
          onSuccess={() => {
            setSpacevRefreshKey(prev => prev + 1);
            goBack();
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'createSpaceV'
      ),
    });

    // Post screens
    screens.push({
      name: 'createPost',
      key: 'createPost',
      component: wrapScreen(
        <CreatePostScreen
          groupId={explicitGroupId}
          onBack={goBack}
          onSuccess={() => {
            setSpacevRefreshKey(prev => prev + 1); // Refresh feed
            goBack();
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'createPost'
      ),
    });

    screens.push({
      name: 'createRide',
      key: 'createRide',
      component: wrapScreen(
        <CreateRideScreen
          groupId={selectedGroupId || undefined}
          onBack={goBack}
          onSuccess={() => {
            setRideRefreshKey(prev => prev + 1);
            goBack();
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'createRide'
      ),
    });

    screens.push({
      name: 'analytics',
      key: 'analytics',
      component: wrapScreen(
        <AnalyticsScreen
          onBack={goBack}
          onViewRideAnalytics={() => setCurrentScreenWithHistory('rideAnalytics')}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'analytics'
      ),
    });

    screens.push({
      name: 'friendSearch',
      key: 'friendSearch',
      component: wrapScreen(
        <FriendSearchScreen
          onBack={goBack}
          onRequestSent={() => {
            // Refresh friends list when returning
          }}
          onViewProfile={(userId) => {
            setSelectedUserId(userId);
            navigate('userProfile', { selectedUserId: userId });
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'friendSearch'
      ),
    });

    screens.push({
      name: 'friends',
      key: 'friends',
      component: wrapScreen(
        <FriendsListScreen
          onBack={goBack}
          onSearchFriends={() => setCurrentScreenWithHistory('friendSearch')}
          onAddNewFriends={() => setCurrentScreenWithHistory('friendSearch')}
          onNavigateToUserProfile={(userId) => navigate('userProfile', { selectedUserId: userId })}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'friends'
      ),
    });

    if (selectedUserId) {
      screens.push({
        name: 'userProfile',
        key: `userProfile-${selectedUserId}`,
        component: wrapScreen(
          <UserProfileScreen
            userId={selectedUserId}
            onBack={goBack}
            onNavigateToMessage={(userId) => {
              // Navigate to message thread - would need to create/get chat
              Alert.alert('Info', 'Message feature coming soon');
            }}
            onNavigateToMutualFriends={(userId) => {
              setCurrentScreenWithHistory('friends');
            }}
            onViewListing={(listingId) => navigate('spacevDetail', { selectedSpaceVId: listingId })}
            onViewPost={(postId) => navigate('postDetail', { selectedPostId: postId })}
            onNavigateToGroups={() => setCurrentScreenWithHistory('groups')}
            onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
            onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
            onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
            onViewUserProfile={(userId) => navigate('userProfile', { selectedUserId: userId })}
            onViewGroup={(groupId) => navigate('groupDetail', { selectedGroupId: groupId })}
          />,
          true,
          'userProfile'
        ),
      });
    }

    screens.push({
      name: 'favorites',
      key: 'favorites',
      component: wrapScreen(
        <FavoritesScreen
          onBack={goBack}
          onNavigateToListing={(listingId) => navigate('spacevDetail', { selectedSpaceVId: listingId })}
        />,
        true,
        'favorites'
      ),
    });

    screens.push({
      name: 'notifications',
      key: 'notifications',
      component: wrapScreen(
        <NotificationsScreen
          onBack={goBack}
          onViewExpense={(expenseId) => navigate('expenseDetail', { selectedExpenseId: expenseId })}
          onViewChore={(choreId) => navigate('choreDetail', { selectedChoreId: choreId })}
          onViewSpaceV={(spacevId) => navigate('spacevDetail', { selectedSpaceVId: spacevId })}
          onViewRide={(rideId) => navigate('rideDetail', { selectedRideId: rideId })}
          onViewGroup={(groupId) => navigate('groupDetail', { selectedGroupId: groupId })}
          onViewFriend={(friendId) => {
            setSelectedUserId(friendId);
            navigate('userProfile', { selectedUserId: friendId });
          }}
          onViewMessage={(chatId, groupId, groupName) => {
            navigate('messageThread', {
              selectedChatId: chatId,
              selectedGroup: groupId ? { id: groupId, name: groupName } : undefined,
            });
          }}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'notifications'
      ),
    });

    screens.push({
      name: 'settings',
      key: 'settings',
      component: wrapScreen(
        <SettingsScreen
          onBack={goBack}
          onNavigateToEditProfile={() => setCurrentScreenWithHistory('editProfile')}
          onNavigateToAccountSettings={() =>
            setCurrentScreenWithHistory('accountSettings')
          }
        />,
        true,
        'settings'
      ),
    });

    screens.push({
      name: 'accountSettings',
      key: 'accountSettings',
      component: wrapScreen(
        <AccountSettingsScreen 
          onBack={goBack}
          onNavigateToProfile={() => setCurrentScreenWithHistory('profile')}
          onNavigateToNotifications={() => setCurrentScreenWithHistory('notifications')}
          onNavigateToSettings={() => setCurrentScreenWithHistory('settings')}
        />,
        true,
        'accountSettings'
      ),
    });

    return screens;
  }, [
    currentScreen,
    expenseRefreshKey,
    choreRefreshKey,
    spacevRefreshKey,
    rideRefreshKey,
    groupRefreshKey,
    financeRefreshKey,
    budgetRefreshKey,
    goalRefreshKey,
    loanRefreshKey,
    selectedGroupId,
    selectedPostId,
      selectedPayeeId,
      selectedPayeeName,
      selectedSettlementAmount,
      selectedSettlementGroupId,
      selectedExpenseId,
    selectedChoreId,
    selectedRideId,
    selectedSpaceVId,
    selectedPostId,
    selectedChatId,
    selectedOtherUser,
    selectedFriendId,
    selectedFriendName,
    selectedTransactionId,
    selectedAccountId,
    selectedBudgetId,
    selectedGoalId,
    selectedLoanId,
    selectedContext,
    selectedTransactionType,
    goalPrefill,
    contributionAmount,
    loanPaymentAmount,
    navigate,
    goBack,
    setCurrentScreenWithHistory,
    wrapScreen,
  ]);

  const bottomNavigation = (
    <BottomNavigation
      currentScreen={currentScreen}
      onNavigateToHome={() => {
        setCurrentScreenWithHistory('home');
        setExpenseRefreshKey(prev => prev + 1);
      }}
      onNavigateToExpenses={() => setCurrentScreenWithHistory('expenses')}
      onNavigateToChores={() => setCurrentScreenWithHistory('chores')}
      onNavigateToSpaceV={() => setCurrentScreenWithHistory('feed')}
      onNavigateToRides={() => setCurrentScreenWithHistory('rides')}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isAuthenticated) {
    if (showForgotPassword) {
      return (
        <ForgotPasswordScreen
          onBackToLogin={() => setShowForgotPassword(false)}
        />
      );
    }
    if (showRegister) {
      return <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return (
      <LoginScreen
        onSwitchToRegister={() => setShowRegister(true)}
        onForgotPassword={() => setShowForgotPassword(true)}
      />
    );
  }

  // Render all screens at root level with smooth transitions
  return (
    <RootScreenRenderer
      currentScreen={currentScreen}
      screens={allScreens}
      bottomNavigation={bottomNavigation}
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
          <ThemedStatusBar />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { resolvedMode } = useTheme();
  return (
    <StatusBar
      style={resolvedMode === 'dark' ? 'light' : 'dark'}
      translucent={false}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
