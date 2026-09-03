import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
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
  const background = backgroundColor ?? theme.colors.background;
  // The bottom tab bar is a sibling of the screen (see TabBarWrapper), so it
  // already occupies its own layout space — reserving TAB_BAR_HEIGHT here too
  // left a screen-height of dead space under every scroll view.
  const contentStyles: StyleProp<ViewStyle> = [
    styles.content,
    padded && { paddingHorizontal: theme.layout.screenPadding },
    scrollable && { paddingBottom: theme.spacing.xl },
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
      {/* Tab roots paint a light-on-gradient status bar; content screens sit on
          a light background and must claim the dark treatment back, including
          the ones that render only an ErrorState with no header. */}
      <StatusBar
        backgroundColor={background}
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      />
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
      {/* Tab roots paint a light-on-gradient status bar; content screens sit on
          a light background and must claim the dark treatment back, including
          the ones that render only an ErrorState with no header. */}
      <StatusBar
        backgroundColor={background}
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      />
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
