import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { AppRole } from '../../constants/permissions';
import { AppBottomTabBar, DEFAULT_TABS, PARENT_TABS } from './AppBottomTabBar';
import { useTabNavigation } from '../../hooks/useTabNavigation';
import { ActiveTabProvider, useActiveTab } from '../../navigation/ActiveTabContext';

interface TabBarWrapperProps {
  role: AppRole;
  children: React.ReactNode;
}

function TabBarContent({ role }: { role: AppRole }) {
  const { activeTab } = useActiveTab();
  const { navigateToTab } = useTabNavigation(role);
  const tabs = role === 'PARENT' || role === 'STUDENT' ? PARENT_TABS : DEFAULT_TABS;

  return (
    <AppBottomTabBar
      activeTab={activeTab}
      onTabPress={navigateToTab}
      tabs={tabs}
    />
  );
}

export function TabBarWrapper({ role, children }: TabBarWrapperProps) {
  return (
    <ActiveTabProvider>
      <View style={styles.root}>
        <View style={styles.content}>{children}</View>
        <TabBarContent role={role} />
      </View>
    </ActiveTabProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
});
