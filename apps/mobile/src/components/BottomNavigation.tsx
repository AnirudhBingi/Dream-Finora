import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SpaceVIcon } from './SpaceVIcon';

interface BottomNavigationProps {
  currentScreen: string;
  onNavigateToExpenses: () => void;
  onNavigateToChores: () => void;
  onNavigateToSpaceV: () => void;
  onNavigateToRides: () => void;
  onNavigateToHome: () => void;
}

export function BottomNavigation({
  currentScreen,
  onNavigateToExpenses,
  onNavigateToChores,
  onNavigateToSpaceV,
  onNavigateToRides,
  onNavigateToHome,
}: BottomNavigationProps) {
  const isActive = (screen: string) => currentScreen === screen;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navItem, isActive('home') && styles.navItemActive]}
          onPress={onNavigateToHome}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Home"
          accessibilityHint="Navigate to home screen"
          accessibilityState={{ selected: isActive('home') }}
        >
          <MaterialIcons
            name="home"
            size={20}
            color={isActive('home') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
            accessible={false}
          />
          <Text style={[styles.navLabel, isActive('home') && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, isActive('expenses') && styles.navItemActive]}
          onPress={onNavigateToExpenses}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Billchop"
          accessibilityHint="Navigate to expense splitting screen"
          accessibilityState={{ selected: isActive('expenses') }}
        >
          <MaterialIcons
            name="receipt"
            size={20}
            color={isActive('expenses') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
            accessible={false}
          />
          <Text style={[styles.navLabel, isActive('expenses') && styles.navLabelActive]}>
            Billchop
          </Text>
        </TouchableOpacity>

        {/* SpaceV tab in center - main feature */}
        <TouchableOpacity
          style={[styles.navItem, styles.navItemCenter, isActive('spacev') && styles.navItemActive]}
          onPress={onNavigateToSpaceV}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="SpaceV"
          accessibilityHint="Navigate to SpaceV marketplace screen"
          accessibilityState={{ selected: isActive('spacev') }}
        >
          <SpaceVIcon
            size={26}
            color={isActive('spacev') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
            active={isActive('spacev')}
          />
          <Text style={[styles.navLabel, styles.navLabelCenter, isActive('spacev') && styles.navLabelActive]}>
            SpaceV
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, isActive('chores') && styles.navItemActive]}
          onPress={onNavigateToChores}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Chores"
          accessibilityHint="Navigate to chore management screen"
          accessibilityState={{ selected: isActive('chores') }}
        >
          <MaterialIcons
            name="check-circle"
            size={20}
            color={isActive('chores') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
            accessible={false}
          />
          <Text style={[styles.navLabel, isActive('chores') && styles.navLabelActive]}>
            Chores
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, isActive('rides') && styles.navItemActive]}
          onPress={onNavigateToRides}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Rides"
          accessibilityHint="Navigate to rideshare screen"
          accessibilityState={{ selected: isActive('rides') }}
        >
          <MaterialIcons
            name="directions-car"
            size={20}
            color={isActive('rides') ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
            accessible={false}
          />
          <Text style={[styles.navLabel, isActive('rides') && styles.navLabelActive]}>
            Rides
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#6366F1', // Matching header color
    borderRadius: 24, // Rounded corners for floating island
    // Floating island effect with 3D shadows
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
    // Add border for depth
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 48,
    borderRadius: 16,
  },
  navItemCenter: {
    // Center item (SpaceV) can be slightly larger if needed
    minHeight: 50,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Subtle highlight for active item
  },
  navLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 3,
    fontWeight: '500',
  },
  navLabelCenter: {
    fontSize: 10.5, // Slightly larger for center item
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

