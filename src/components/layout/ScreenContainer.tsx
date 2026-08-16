import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  SafeAreaView,
  type Edge,
} from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { TAB_BAR_HEIGHT } from './AppBottomTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  safeArea?: boolean;
  safeAreaEdges?: Edge[];
  keyboardAvoiding?: boolean;
  padded?: boolean;
  backgroundColor?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  testID?: string;
}

export function ScreenContainer({
  children,
  scrollable = false,
  safeArea = true,
  safeAreaEdges = ['top'],
  keyboardAvoiding = true,
  padded = true,
  backgroundColor,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  testID,
}: ScreenContainerProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const background = backgroundColor ?? theme.colors.background;
  const tabBarBottomPad = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8);
  const contentStyles: StyleProp<ViewStyle> = [
    styles.content,
    padded && { paddingHorizontal: theme.layout.screenPadding },
    scrollable && { paddingBottom: tabBarBottomPad },
    contentContainerStyle,
  ];
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={contentStyles}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            colors={[theme.colors.primary]}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={theme.colors.primary}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={contentStyles}>{children}</View>
  );

  const keyboardContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  if (!safeArea) {
    return (
      <View
        style={[styles.container, { backgroundColor: background }, style]}
        testID={testID}
      >
        {keyboardContent}
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[styles.container, { backgroundColor: background }, style]}
      testID={testID}
    >
      {keyboardContent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
});
