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
  safeAreaEdges = ['top', 'bottom'],
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
  const contentStyles: StyleProp<ViewStyle> = [
    styles.content,
    padded && { paddingHorizontal: theme.layout.screenPadding },
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
