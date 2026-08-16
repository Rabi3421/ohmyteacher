import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppIconName } from '../icons/AppIcon';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from '../common/AppText';
import { useAppTheme } from '../../hooks/useAppTheme';

export type AppTabId = 'home' | 'academics' | 'fees' | 'exams' | 'more';

export interface AppTab {
  id: AppTabId;
  label: string;
  icon: AppIconName;
  activeIcon?: AppIconName;
}

export const DEFAULT_TABS: AppTab[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'academics', label: 'Academics', icon: 'book-open' },
  { id: 'fees', label: 'Fees', icon: 'credit-card' },
  { id: 'exams', label: 'Exams', icon: 'file-text' },
  { id: 'more', label: 'More', icon: 'more-horizontal' },
];

export const PARENT_TABS: AppTab[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'academics', label: 'Children', icon: 'users' },
  { id: 'fees', label: 'Fees', icon: 'credit-card' },
  { id: 'exams', label: 'Results', icon: 'file-text' },
  { id: 'more', label: 'More', icon: 'more-horizontal' },
];

export const TAB_BAR_HEIGHT = 60;

interface AppBottomTabBarProps {
  activeTab: AppTabId;
  tabs?: AppTab[];
  onTabPress: (tab: AppTabId) => void;
}

export function AppBottomTabBar({
  activeTab,
  tabs = DEFAULT_TABS,
  onTabPress,
}: AppBottomTabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: bottomPad,
          height: TAB_BAR_HEIGHT + bottomPad,
        },
      ]}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        const color = isActive ? theme.colors.primary : theme.colors.textTertiary;
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
          >
            <View style={styles.tabInner}>
              {isActive && (
                <View
                  style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]}
                />
              )}
              <AppIcon
                color={color}
                name={isActive ? (tab.activeIcon ?? tab.icon) : tab.icon}
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <AppText
                style={[styles.label, { color }]}
                variant="caption"
              >
                {tab.label}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activeIndicator: {
    borderRadius: 2,
    height: 3,
    position: 'absolute',
    top: 0,
    width: 28,
  },
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
    textAlign: 'center',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabInner: {
    alignItems: 'center',
    position: 'relative',
  },
  tabPressed: {
    opacity: 0.7,
  },
});
