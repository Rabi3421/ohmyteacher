import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppCard } from '../common/AppCard';
import { AppHeader } from '../common/AppHeader';
import { AppScreen } from '../common/AppScreen';
import { AppText } from '../common/AppText';
import { BrandMark } from '../welcome/BrandMark';

export interface AuthFormLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  onBackPress?: () => void;
  footer?: ReactNode;
  testID?: string;
}

export function AuthFormLayout({
  title,
  subtitle,
  children,
  onBackPress,
  footer,
  testID,
}: AuthFormLayoutProps) {
  const theme = useAppTheme();

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID={testID}
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={onBackPress}
          title=""
        />
        <View style={styles.intro}>
          <BrandMark size={72} />
          <AppText align="center" style={styles.title} variant="heading2">
            {title}
          </AppText>
          <AppText
            align="center"
            color={theme.colors.textSecondary}
            style={styles.subtitle}
          >
            {subtitle}
          </AppText>
        </View>
        <AppCard style={styles.card} variant="elevated">
          {children}
        </AppCard>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  intro: {
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
  },
  screenContent: {
    paddingBottom: 32,
  },
  subtitle: {
    marginTop: 7,
    maxWidth: 400,
  },
  title: {
    marginTop: 8,
  },
});
