import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/authContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { ExpenseListScreen } from './src/screens/ExpenseListScreen';
import { CreateExpenseScreen } from './src/screens/CreateExpenseScreen';
import { EditExpenseScreen } from './src/screens/EditExpenseScreen';
import { ExpenseDetailScreen } from './src/screens/ExpenseDetailScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { BalanceSummaryScreen } from './src/screens/BalanceSummaryScreen';
import { SettleUpScreen } from './src/screens/SettleUpScreen';
import { GroupListScreen } from './src/screens/GroupListScreen';
import { CreateGroupScreen } from './src/screens/CreateGroupScreen';
import { GroupDetailScreen } from './src/screens/GroupDetailScreen';
import { GroupSettingsScreen } from './src/screens/GroupSettingsScreen';
import { AddGroupMemberScreen } from './src/screens/AddGroupMemberScreen';
import { FinanceScreen } from './src/screens/FinanceScreen';
import { AddTransactionScreen } from './src/screens/AddTransactionScreen';
import { ChoreListScreen } from './src/screens/ChoreListScreen';
import { CreateChoreScreen } from './src/screens/CreateChoreScreen';
import { ChoreDetailScreen } from './src/screens/ChoreDetailScreen';
import { EditChoreScreen } from './src/screens/EditChoreScreen';
import { ChoreHistoryScreen } from './src/screens/ChoreHistoryScreen';
import { RideListScreen } from './src/screens/RideListScreen';
import { CreateRideScreen } from './src/screens/CreateRideScreen';
import { RideDetailScreen } from './src/screens/RideDetailScreen';
import { ListingListScreen } from './src/screens/ListingListScreen';
import { CreateListingScreen } from './src/screens/CreateListingScreen';
import { ListingDetailScreen } from './src/screens/ListingDetailScreen';
import ConversationListScreen from './src/screens/ConversationListScreen';
import MessageThreadScreen from './src/screens/MessageThreadScreen';
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

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<
    | 'home'
    | 'profile'
    | 'editProfile'
    | 'expenses'
    | 'createExpense'
    | 'editExpense'
    | 'expenseDetail'
    | 'activity'
    | 'balanceSummary'
    | 'settleUp'
    | 'groups'
    | 'createGroup'
    | 'groupDetail'
    | 'groupSettings'
    | 'addGroupMember'
    | 'finance'
    | 'addTransaction'
    | 'budgets'
    | 'createBudget'
    | 'editBudget'
    | 'goals'
    | 'createGoal'
    | 'editGoal'
    | 'goalDetail'
    | 'loans'
    | 'createLoan'
    | 'loanDetail'
    | 'recordLoanPayment'
    | 'chores'
    | 'createChore'
    | 'choreDetail'
    | 'editChore'
    | 'choreHistory'
    | 'rides'
    | 'createRide'
    | 'rideDetail'
    | 'listings'
    | 'createListing'
    | 'listingDetail'
    | 'conversations'
    | 'messageThread'
    | 'analytics'
    | 'billchopAnalytics'
    | 'friends'
    | 'friendSearch'
    | 'notifications'
    | 'settings'
  >('home');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<'local' | 'home' | null>(null);
  const [selectedTransactionType, setSelectedTransactionType] = useState<'income' | 'expense' | null>(null);
  const [selectedChoreId, setSelectedChoreId] = useState<string | null>(null);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedOtherUser, setSelectedOtherUser] = useState<any | null>(null);
  const [selectedPayeeId, setSelectedPayeeId] = useState<string | null>(null);
  const [selectedPayeeName, setSelectedPayeeName] = useState<string>('');
  const [selectedSettlementAmount, setSelectedSettlementAmount] = useState<number>(0);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedFriendName, setSelectedFriendName] = useState<string>('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [expenseRefreshKey, setExpenseRefreshKey] = useState(0);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const [listingRefreshKey, setListingRefreshKey] = useState(0);
  const [choreRefreshKey, setChoreRefreshKey] = useState(0);
  const [rideRefreshKey, setRideRefreshKey] = useState(0);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [goalRefreshKey, setGoalRefreshKey] = useState(0);
  const [loanRefreshKey, setLoanRefreshKey] = useState(0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <LoginScreen onSwitchToRegister={() => setShowRegister(true)} />;
  }

  // Authenticated screens
  if (currentScreen === 'editProfile') {
    return (
      <EditProfileScreen 
        onBack={() => setCurrentScreen('profile')} 
      />
    );
  }

  if (currentScreen === 'profile') {
    return (
      <ProfileScreen
        key={`profile-${Date.now()}`} // Force reload when navigating back
        onEdit={() => setCurrentScreen('editProfile')}
        onBack={() => setCurrentScreen('home')}
        onSettings={() => setCurrentScreen('settings')}
      />
    );
  }

  if (currentScreen === 'createExpense') {
    return (
      <CreateExpenseScreen
        groupId={selectedGroupId || undefined}
        onBack={() => {
          if (selectedGroupId) {
            setCurrentScreen('groupDetail');
          } else {
            setCurrentScreen('expenses');
          }
        }}
        onSuccess={() => {
          // Increment refresh key to trigger updates in all screens
          setExpenseRefreshKey(prev => prev + 1);
          if (selectedGroupId) {
            // Trigger refresh of group detail screen
            setGroupRefreshKey(prev => prev + 1);
            setCurrentScreen('groupDetail');
          } else {
            setCurrentScreen('expenses');
          }
        }}
      />
    );
  }

  if (currentScreen === 'billchopAnalytics') {
    return (
      <BillchopAnalyticsScreen
        onBack={() => setCurrentScreen('expenses')}
      />
    );
  }

  if (currentScreen === 'settleUp' && selectedPayeeId) {
    return (
      <SettleUpScreen
        payeeId={selectedPayeeId}
        amount={selectedSettlementAmount}
        payeeName={selectedPayeeName}
        onBack={() => {
          setSelectedPayeeId(null);
          setSelectedPayeeName('');
          setSelectedSettlementAmount(0);
          setCurrentScreen('balanceSummary');
        }}
        onSuccess={() => {
          setSelectedPayeeId(null);
          setSelectedPayeeName('');
          setSelectedSettlementAmount(0);
          setCurrentScreen('balanceSummary');
        }}
      />
    );
  }

  if (currentScreen === 'balanceSummary') {
    return (
      <BalanceSummaryScreen
        onBack={() => setCurrentScreen('expenses')}
        onSettleUp={(payeeId, amount, payeeName) => {
          setSelectedPayeeId(payeeId);
          setSelectedSettlementAmount(amount);
          setSelectedPayeeName(payeeName);
          setCurrentScreen('settleUp');
        }}
      />
    );
  }

  if (currentScreen === 'editExpense' && selectedExpenseId) {
    const expenseIdForEdit = selectedExpenseId;
    return (
      <EditExpenseScreen
        expenseId={expenseIdForEdit}
        onBack={() => {
          // Go back to detail screen if we came from there
          setCurrentScreen('expenseDetail');
        }}
        onSuccess={() => {
          setExpenseRefreshKey(prev => prev + 1);
          // Return to detail screen after edit
          setCurrentScreen('expenseDetail');
        }}
      />
    );
  }

  if (currentScreen === 'expenseDetail' && selectedExpenseId) {
    return (
      <ExpenseDetailScreen
        expenseId={selectedExpenseId}
        onBack={() => {
          setSelectedExpenseId(null);
          setCurrentScreen('expenses');
        }}
        onEdit={(expenseId) => {
          setSelectedExpenseId(expenseId);
          setCurrentScreen('editExpense');
        }}
      />
    );
  }

  if (currentScreen === 'activity') {
    return (
      <ActivityScreen
        onBack={() => setCurrentScreen('home')}
        onViewExpense={(expenseId) => {
          setSelectedExpenseId(expenseId);
          setCurrentScreen('expenseDetail');
        }}
      />
    );
  }

  if (currentScreen === 'expenses') {
    return (
      <>
      <ExpenseListScreen
          key={`expenses-${expenseRefreshKey}`}
        onCreateExpense={() => setCurrentScreen('createExpense')}
        onViewAnalytics={() => setCurrentScreen('billchopAnalytics')}
          onViewBalances={() => setCurrentScreen('balanceSummary')}
          onViewExpense={(expenseId) => {
            setSelectedExpenseId(expenseId);
            setCurrentScreen('expenseDetail');
          }}
        onViewFriends={() => setCurrentScreen('billchopFriends')}
        onViewGroups={() => setCurrentScreen('billchopGroups')}
        onBack={() => setCurrentScreen('home')}
      />
        <BottomNavigation
          currentScreen="expenses"
          onNavigateToHome={() => setCurrentScreen('home')}
          onNavigateToExpenses={() => setCurrentScreen('expenses')}
          onNavigateToChores={() => setCurrentScreen('chores')}
          onNavigateToListings={() => setCurrentScreen('listings')}
          onNavigateToRides={() => setCurrentScreen('rides')}
        />
      </>
    );
  }

  if (currentScreen === 'billchopFriends') {
    return (
      <BillchopFriendsScreen
        onBack={() => setCurrentScreen('expenses')}
        onViewFriendExpenses={(friendId, friendName) => {
          setSelectedFriendId(friendId);
          setSelectedFriendName(friendName);
          setCurrentScreen('friendExpenseList');
        }}
      />
    );
  }

  if (currentScreen === 'friendExpenseList' && selectedFriendId) {
    return (
      <FriendExpenseListScreen
        friendId={selectedFriendId}
        friendName={selectedFriendName}
        onBack={() => {
          setSelectedFriendId(null);
          setSelectedFriendName('');
          setCurrentScreen('billchopFriends');
        }}
        onViewExpense={(expenseId) => {
          setSelectedExpenseId(expenseId);
          setCurrentScreen('expenseDetail');
        }}
      />
    );
  }

  if (currentScreen === 'billchopGroups') {
    return (
      <BillchopGroupsScreen
        onBack={() => setCurrentScreen('expenses')}
        onViewGroup={(groupId) => {
          setSelectedGroupId(groupId);
          setCurrentScreen('groupDetail');
        }}
        onViewExpense={(expenseId) => {
          setSelectedExpenseId(expenseId);
          setCurrentScreen('expenseDetail');
        }}
      />
    );
  }

  if (currentScreen === 'groupDetail' && selectedGroupId) {
    return (
      <GroupDetailScreen
        key={`group-${selectedGroupId}-${groupRefreshKey}`} // Force reload when returning from expense creation
        groupId={selectedGroupId}
        onCreateExpense={() => setCurrentScreen('createExpense')}
        onBack={() => {
          setSelectedGroupId(null);
          setCurrentScreen('groups');
        }}
        onSettings={(groupId) => {
          setSelectedGroupId(groupId);
          setCurrentScreen('groupSettings');
        }}
      />
    );
  }

  if (currentScreen === 'groupSettings' && selectedGroupId) {
    return (
      <GroupSettingsScreen
        groupId={selectedGroupId}
        onBack={() => {
          setCurrentScreen('groupDetail');
        }}
        onGroupUpdated={() => {
          setGroupRefreshKey(prev => prev + 1);
        }}
        onAddMember={(groupId) => {
          setSelectedGroupId(groupId);
          setCurrentScreen('addGroupMember');
        }}
      />
    );
  }

  if (currentScreen === 'addGroupMember' && selectedGroupId) {
    return (
      <AddGroupMemberScreen
        groupId={selectedGroupId}
        onBack={() => {
          setCurrentScreen('groupSettings');
        }}
        onMemberAdded={() => {
          setGroupRefreshKey(prev => prev + 1);
        }}
      />
    );
  }

  if (currentScreen === 'createGroup') {
    return (
      <CreateGroupScreen
        onBack={() => setCurrentScreen('groups')}
        onSuccess={() => setCurrentScreen('groups')}
      />
    );
  }

  if (currentScreen === 'groups') {
    return (
      <GroupListScreen
        onCreateGroup={() => setCurrentScreen('createGroup')}
        onViewGroup={(groupId) => {
          setSelectedGroupId(groupId);
          setCurrentScreen('groupDetail');
        }}
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'addTransaction') {
    return (
      <AddTransactionScreen
        context={selectedContext || undefined}
        initialType={selectedTransactionType || undefined}
        onBack={() => {
          setCurrentScreen('finance');
        }}
        onSuccess={() => {
          setFinanceRefreshKey(prev => prev + 1);
          setCurrentScreen('finance');
        }}
      />
    );
  }

  if (currentScreen === 'finance') {
    return (
      <FinanceScreen
        key={`finance-${financeRefreshKey}`}
        onAddIncome={(context) => {
          setSelectedContext(context);
          setSelectedTransactionType('income');
          setCurrentScreen('addTransaction');
        }}
        onAddExpense={(context) => {
          setSelectedContext(context);
          setSelectedTransactionType('expense');
          setCurrentScreen('addTransaction');
        }}
        onViewBudgets={(context) => {
          setSelectedContext(context);
          setCurrentScreen('budgets');
        }}
        onViewGoals={(context) => {
          setSelectedContext(context);
          setCurrentScreen('goals');
        }}
        onViewLoans={(context) => {
          setSelectedContext(context);
          setCurrentScreen('loans');
        }}
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'budgets' && selectedContext) {
    return (
      <BudgetScreen
        key={`budgets-${selectedContext}-${budgetRefreshKey}`}
        context={selectedContext}
        onCreateBudget={() => setCurrentScreen('createBudget')}
        onEditBudget={(budgetId) => {
          setSelectedBudgetId(budgetId);
          setCurrentScreen('editBudget');
        }}
        onBack={() => setCurrentScreen('finance')}
      />
    );
  }

  if (currentScreen === 'createBudget' && selectedContext) {
    return (
      <CreateBudgetScreen
        context={selectedContext}
        onBack={() => setCurrentScreen('budgets')}
        onSuccess={() => {
          setBudgetRefreshKey(prev => prev + 1);
          setCurrentScreen('budgets');
        }}
      />
    );
  }

  if (currentScreen === 'editBudget' && selectedBudgetId) {
    return (
      <EditBudgetScreen
        key={`editBudget-${selectedBudgetId}`}
        budgetId={selectedBudgetId}
        onBack={() => setCurrentScreen('budgets')}
        onSuccess={() => {
          setBudgetRefreshKey(prev => prev + 1);
          setSelectedBudgetId(null);
          setCurrentScreen('budgets');
        }}
      />
    );
  }

  if (currentScreen === 'goals' && selectedContext) {
    return (
      <GoalsScreen
        key={`goals-${selectedContext}-${goalRefreshKey}`}
        context={selectedContext}
        onCreateGoal={() => setCurrentScreen('createGoal')}
        onViewGoal={(goalId) => {
          setSelectedGoalId(goalId);
          setCurrentScreen('goalDetail');
        }}
        onBack={() => setCurrentScreen('finance')}
      />
    );
  }

  if (currentScreen === 'loans' && selectedContext) {
    return (
      <LoansListScreen
        key={`loans-${selectedContext}-${loanRefreshKey}`}
        context={selectedContext}
        onCreateLoan={() => setCurrentScreen('createLoan')}
        onViewLoan={(loanId) => {
          setSelectedLoanId(loanId);
          setCurrentScreen('loanDetail');
        }}
        onBack={() => setCurrentScreen('finance')}
      />
    );
  }

  if (currentScreen === 'createLoan' && selectedContext) {
    return (
      <CreateLoanScreen
        context={selectedContext}
        onBack={() => setCurrentScreen('loans')}
        onSuccess={() => {
          setLoanRefreshKey((prev) => prev + 1);
          setCurrentScreen('loans');
        }}
      />
    );
  }

  if (currentScreen === 'loanDetail' && selectedLoanId) {
    return (
      <LoanDetailScreen
        key={`loanDetail-${selectedLoanId}-${loanRefreshKey}`}
        loanId={selectedLoanId}
        onRecordPayment={() => setCurrentScreen('recordLoanPayment')}
        onLoanUpdated={() => setLoanRefreshKey((prev) => prev + 1)}
        onBack={() => {
          setSelectedLoanId(null);
          setCurrentScreen('loans');
        }}
      />
    );
  }

  if (currentScreen === 'recordLoanPayment' && selectedLoanId) {
    return (
      <RecordLoanPaymentScreen
        loanId={selectedLoanId}
        onBack={() => setCurrentScreen('loanDetail')}
        onSuccess={() => {
          setLoanRefreshKey((prev) => prev + 1);
          setCurrentScreen('loanDetail');
        }}
      />
    );
  }

  if (currentScreen === 'createGoal' && selectedContext) {
    return (
      <CreateGoalScreen
        context={selectedContext}
        onBack={() => setCurrentScreen('goals')}
        onSuccess={() => {
          setGoalRefreshKey(prev => prev + 1);
          setCurrentScreen('goals');
        }}
      />
    );
  }

  if (currentScreen === 'goalDetail' && selectedGoalId) {
    return (
      <GoalDetailScreen
        key={`goalDetail-${selectedGoalId}-${goalRefreshKey}`}
        goalId={selectedGoalId}
        onEdit={() => setCurrentScreen('editGoal')}
        onAddContribution={() => {
          // TODO: Navigate to add contribution screen when implemented
          Alert.alert('Info', 'Add contribution feature coming soon');
        }}
        onBack={() => {
          setSelectedGoalId(null);
          setCurrentScreen('goals');
        }}
      />
    );
  }

  if (currentScreen === 'editGoal' && selectedGoalId) {
    return (
      <EditGoalScreen
        key={`editGoal-${selectedGoalId}`}
        goalId={selectedGoalId}
        onBack={() => setCurrentScreen('goalDetail')}
        onSuccess={() => {
          setGoalRefreshKey(prev => prev + 1);
          setCurrentScreen('goalDetail');
        }}
      />
    );
  }

  if (currentScreen === 'choreDetail' && selectedChoreId) {
    return (
      <ChoreDetailScreen
        key={`chore-${selectedChoreId}-${choreRefreshKey}`}
        choreId={selectedChoreId}
        onBack={() => {
          setSelectedChoreId(null);
          setCurrentScreen('chores');
        }}
        onRefresh={() => {
          setChoreRefreshKey(prev => prev + 1);
        }}
        onEdit={() => setCurrentScreen('editChore')}
        onViewHistory={() => setCurrentScreen('choreHistory')}
      />
    );
  }

  if (currentScreen === 'editChore' && selectedChoreId) {
    return (
      <EditChoreScreen
        key={`edit-chore-${selectedChoreId}`}
        choreId={selectedChoreId}
        onBack={() => setCurrentScreen('choreDetail')}
        onSuccess={() => {
          setChoreRefreshKey(prev => prev + 1);
          setCurrentScreen('choreDetail');
        }}
      />
    );
  }

  if (currentScreen === 'choreHistory' && selectedChoreId) {
    return (
      <ChoreHistoryScreen
        key={`chore-history-${selectedChoreId}`}
        choreId={selectedChoreId}
        onBack={() => setCurrentScreen('choreDetail')}
      />
    );
  }

  if (currentScreen === 'createChore') {
    return (
      <CreateChoreScreen
        groupId={selectedGroupId || undefined}
        onBack={() => {
          if (selectedGroupId) {
            setCurrentScreen('groupDetail');
          } else {
            setCurrentScreen('chores');
          }
        }}
        onSuccess={() => {
          setChoreRefreshKey(prev => prev + 1);
          if (selectedGroupId) {
            setCurrentScreen('groupDetail');
          } else {
            setCurrentScreen('chores');
          }
        }}
      />
    );
  }

  if (currentScreen === 'chores') {
    return (
      <>
      <ChoreListScreen
        key={`chores-${choreRefreshKey}`}
        groupId={selectedGroupId || undefined}
        onCreateChore={() => setCurrentScreen('createChore')}
        onViewChore={(choreId) => {
          setSelectedChoreId(choreId);
          setCurrentScreen('choreDetail');
        }}
        onBack={() => {
          if (selectedGroupId) {
            setCurrentScreen('groupDetail');
          } else {
            setCurrentScreen('home');
          }
        }}
      />
        <BottomNavigation
          currentScreen="chores"
          onNavigateToHome={() => setCurrentScreen('home')}
          onNavigateToExpenses={() => setCurrentScreen('expenses')}
          onNavigateToChores={() => setCurrentScreen('chores')}
          onNavigateToListings={() => setCurrentScreen('listings')}
          onNavigateToRides={() => setCurrentScreen('rides')}
        />
      </>
    );
  }

  if (currentScreen === 'messageThread' && selectedChatId) {
    return (
      <MessageThreadScreen
        route={{
          params: {
            chatId: selectedChatId,
            otherUser: selectedOtherUser,
          },
        }}
        navigation={{
          goBack: () => {
            setSelectedChatId(null);
            setSelectedOtherUser(null);
            setCurrentScreen('conversations');
          },
        }}
      />
    );
  }

  if (currentScreen === 'conversations') {
    return (
      <ConversationListScreen
        navigation={{
          goBack: () => setCurrentScreen('home'),
          navigate: (screen: string, params?: any) => {
            if (screen === 'MessageThread') {
              setSelectedChatId(params.chatId);
              setSelectedOtherUser(params.otherUser);
              setCurrentScreen('messageThread');
            }
          },
        }}
      />
    );
  }

  if (currentScreen === 'listingDetail' && selectedListingId) {
    return (
      <ListingDetailScreen
        key={`listing-${selectedListingId}-${listingRefreshKey}`}
        listingId={selectedListingId}
        onBack={() => {
          setSelectedListingId(null);
          setCurrentScreen('listings');
        }}
        onRefresh={() => {
          setListingRefreshKey(prev => prev + 1);
        }}
        onNavigateToMessage={(chatId: string, otherUser: any) => {
          setSelectedChatId(chatId);
          setSelectedOtherUser(otherUser);
          setCurrentScreen('messageThread');
        }}
      />
    );
  }

  if (currentScreen === 'createListing') {
    return (
      <CreateListingScreen
        onBack={() => setCurrentScreen('listings')}
        onSuccess={() => {
          setListingRefreshKey(prev => prev + 1);
          setCurrentScreen('listings');
        }}
      />
    );
  }

  if (currentScreen === 'listings') {
    return (
      <>
      <ListingListScreen
        key={`listings-${listingRefreshKey}`}
        onCreateListing={() => setCurrentScreen('createListing')}
        onViewListing={(listingId) => {
          setSelectedListingId(listingId);
          setCurrentScreen('listingDetail');
        }}
        onBack={() => setCurrentScreen('home')}
      />
        <BottomNavigation
          currentScreen="listings"
          onNavigateToHome={() => setCurrentScreen('home')}
          onNavigateToExpenses={() => setCurrentScreen('expenses')}
          onNavigateToChores={() => setCurrentScreen('chores')}
          onNavigateToListings={() => setCurrentScreen('listings')}
          onNavigateToRides={() => setCurrentScreen('rides')}
        />
      </>
    );
  }

  if (currentScreen === 'rideDetail' && selectedRideId) {
    return (
      <RideDetailScreen
        key={`ride-${selectedRideId}-${rideRefreshKey}`}
        rideId={selectedRideId}
        onBack={() => {
          setSelectedRideId(null);
          setCurrentScreen('rides');
        }}
        onRefresh={() => {
          setRideRefreshKey(prev => prev + 1);
        }}
      />
    );
  }

  if (currentScreen === 'createRide') {
    return (
      <CreateRideScreen
        groupId={selectedGroupId || undefined}
        onBack={() => {
          if (selectedGroupId) {
            setCurrentScreen('groupDetail');
          } else {
            setCurrentScreen('rides');
          }
        }}
        onSuccess={() => {
          setRideRefreshKey(prev => prev + 1);
          if (selectedGroupId) {
            setCurrentScreen('groupDetail');
          } else {
            setCurrentScreen('rides');
          }
        }}
      />
    );
  }

  if (currentScreen === 'rides') {
    return (
      <>
      <RideListScreen
        key={`rides-${rideRefreshKey}`}
        groupId={selectedGroupId || undefined}
        onCreateRide={() => setCurrentScreen('createRide')}
        onViewRide={(rideId) => {
          setSelectedRideId(rideId);
          setCurrentScreen('rideDetail');
        }}
        onBack={() => {
          if (selectedGroupId) {
            setCurrentScreen('groupDetail');
          } else {
            setCurrentScreen('home');
          }
        }}
      />
        <BottomNavigation
          currentScreen="rides"
          onNavigateToHome={() => setCurrentScreen('home')}
          onNavigateToExpenses={() => setCurrentScreen('expenses')}
          onNavigateToChores={() => setCurrentScreen('chores')}
          onNavigateToListings={() => setCurrentScreen('listings')}
          onNavigateToRides={() => setCurrentScreen('rides')}
        />
      </>
    );
  }

  if (currentScreen === 'analytics') {
    return (
      <AnalyticsScreen
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'friendSearch') {
    return (
      <FriendSearchScreen
        onBack={() => setCurrentScreen('friends')}
        onRequestSent={() => {
          // Refresh friends list when returning
        }}
      />
    );
  }

  if (currentScreen === 'friends') {
    return (
      <FriendsListScreen
        onBack={() => setCurrentScreen('home')}
        onSearchFriends={() => setCurrentScreen('friendSearch')}
      />
    );
  }

  if (currentScreen === 'notifications') {
    return (
      <NotificationsScreen
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'settings') {
    return (
      <SettingsScreen
        onBack={() => setCurrentScreen('profile')}
      />
    );
  }

  return (
    <>
    <HomeScreen
        refreshKey={expenseRefreshKey}
      onNavigateToProfile={() => setCurrentScreen('profile')}
      onNavigateToExpenses={() => setCurrentScreen('expenses')}
      onNavigateToGroups={() => setCurrentScreen('groups')}
      onNavigateToFinance={() => setCurrentScreen('finance')}
      onNavigateToChores={() => setCurrentScreen('chores')}
      onNavigateToRides={() => setCurrentScreen('rides')}
      onNavigateToListings={() => setCurrentScreen('listings')}
      onNavigateToMessages={() => setCurrentScreen('conversations')}
      onNavigateToAnalytics={() => setCurrentScreen('analytics')}
        onNavigateToActivity={() => setCurrentScreen('activity')}
        onNavigateToFriends={() => setCurrentScreen('friends')}
        onNavigateToNotifications={() => setCurrentScreen('notifications')}
      />
      <BottomNavigation
        currentScreen="home"
        onNavigateToHome={() => {
          setCurrentScreen('home');
          // Force refresh of home screen when navigating to it
          setExpenseRefreshKey(prev => prev + 1);
        }}
        onNavigateToExpenses={() => setCurrentScreen('expenses')}
        onNavigateToChores={() => setCurrentScreen('chores')}
        onNavigateToListings={() => setCurrentScreen('listings')}
        onNavigateToRides={() => setCurrentScreen('rides')}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
        <StatusBar style="dark" translucent={false} />
      </AuthProvider>
    </SafeAreaProvider>
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
