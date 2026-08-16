import React, { useMemo } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AppIcon } from '../components/icons/AppIcon';
import { BrandMark } from '../components/welcome/BrandMark';
import { FeatureBadge } from '../components/welcome/FeatureBadge';
import { TrustFeature } from '../components/welcome/TrustFeature';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const welcomeHero =
  require('../assets/images/welcome-hero.png') as ImageSourcePropType;

type WelcomeScreenProps = {
  onLoginPress?: () => void;
  onComponentPreviewPress?: () => void;
  onLanguagePress?: () => void;
};

const defaultAction = () => undefined;

function TrailingChevron({ variant }: { variant: 'blue' | 'white' }) {
  const colorStyle =
    variant === 'white' ? styles.chevronWhite : styles.chevronBlue;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={styles.trailingChevron}
    >
      <View style={[styles.chevronStroke, styles.chevronUpper, colorStyle]} />
      <View style={[styles.chevronStroke, styles.chevronLower, colorStyle]} />
    </View>
  );
}

export function WelcomeScreen({
  onLoginPress = defaultAction,
  onComponentPreviewPress,
  onLanguagePress = defaultAction,
}: WelcomeScreenProps) {
  const { height, width } = useWindowDimensions();
  const isNarrow = width < 380;
  const isCompact = height < 820;
  const isVeryCompact = height < 700;
  const metrics = useMemo(() => {
    const horizontalPadding = isNarrow ? spacing.md : spacing.lg;
    const contentWidth = Math.min(width - horizontalPadding * 2, 460);
    const maximumHeroHeight = isVeryCompact ? 235 : 300;
    const minimumHeroHeight = isVeryCompact ? 225 : isCompact ? 300 : 230;

    return {
      brandSize: isVeryCompact ? 50 : isCompact ? 58 : 66,
      contentWidth,
      headerHeight: isVeryCompact ? 94 : isCompact ? 108 : 122,
      heroHeight: Math.max(
        minimumHeroHeight,
        Math.min(contentWidth * 0.68, maximumHeroHeight),
      ),
      horizontalPadding,
    };
  }, [isCompact, isNarrow, isVeryCompact, width]);

  return (
    <LinearGradient
      colors={[
        colors.backgroundTop,
        colors.background,
        colors.backgroundBottom,
      ]}
      locations={[0, 0.28, 1]}
      style={styles.screen}
    >
      <StatusBar
        backgroundColor={colors.backgroundTop}
        barStyle="dark-content"
        translucent={false}
      />
      <View pointerEvents="none" style={styles.backgroundDecorations}>
        <View style={[styles.glow, styles.glowTopLeft]} />
        <View style={[styles.glow, styles.glowRight]} />
      </View>

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View
          style={[
            styles.pageContent,
            { paddingHorizontal: metrics.horizontalPadding },
          ]}
          testID="welcome-screen-content"
        >
          <View style={[styles.content, { maxWidth: metrics.contentWidth }]}>
            <View style={[styles.header, { height: metrics.headerHeight }]}>
              <Pressable
                accessibilityHint="Opens language options"
                accessibilityLabel="Change language, currently English"
                accessibilityRole="button"
                hitSlop={6}
                onPress={onLanguagePress}
                style={({ pressed }) => [
                  styles.languageButton,
                  pressed && styles.pressedCard,
                ]}
              >
                <AppIcon
                  color={colors.primary}
                  name="globe"
                  size={20}
                  strokeWidth={2.2}
                />
                <Text style={styles.languageText}>English</Text>
                <AppIcon
                  color={colors.primary}
                  name="chevron-down"
                  size={17}
                  strokeWidth={2.7}
                />
              </Pressable>

              <View style={styles.brandSection}>
                <BrandMark size={metrics.brandSize} />
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.86}
                  numberOfLines={1}
                  style={[
                    styles.brandTitle,
                    isNarrow && styles.brandTitleNarrow,
                  ]}
                >
                  Oh My Teacher
                </Text>
                <Text style={styles.brandSubtitle}>
                  Smart School &amp; Coaching Management
                </Text>
              </View>
            </View>

            <View style={[styles.hero, { height: metrics.heroHeight }]}>
              <Image
                accessibilityLabel="A smiling teacher and two students in front of their school"
                resizeMode="contain"
                source={welcomeHero}
                style={styles.heroImage}
              />

              <FeatureBadge
                backgroundColor={colors.studentTint}
                color={colors.studentIcon}
                icon="users"
                label="Students"
                rotation="-7deg"
                style={[
                  styles.badge,
                  isNarrow && styles.badgeNarrow,
                  isCompact && styles.badgeCompact,
                  styles.studentsBadge,
                  isCompact && styles.topBadgeCompact,
                ]}
              />
              <FeatureBadge
                backgroundColor={colors.homeworkTint}
                color={colors.orange}
                icon="book-open"
                label="Homework"
                rotation="7deg"
                style={[
                  styles.badge,
                  isNarrow && styles.badgeNarrow,
                  isCompact && styles.badgeCompact,
                  styles.homeworkBadge,
                  isCompact && styles.topBadgeCompact,
                ]}
              />
              <FeatureBadge
                backgroundColor={colors.attendanceTint}
                color={colors.green}
                icon="calendar-check"
                label="Attendance"
                rotation="-6deg"
                style={[
                  styles.badge,
                  isNarrow && styles.badgeNarrow,
                  isCompact && styles.badgeCompact,
                  styles.attendanceBadge,
                  isCompact && styles.bottomBadgeCompact,
                ]}
              />
              <FeatureBadge
                backgroundColor={colors.reportsTint}
                color={colors.purple}
                icon="bar-chart"
                label="Reports"
                rotation="7deg"
                style={[
                  styles.badge,
                  isNarrow && styles.badgeNarrow,
                  isCompact && styles.badgeCompact,
                  styles.reportsBadge,
                  isCompact && styles.bottomBadgeCompact,
                ]}
              />

              <Svg
                accessibilityElementsHidden
                height="58"
                pointerEvents="none"
                preserveAspectRatio="none"
                style={styles.wave}
                viewBox="0 0 400 58"
                width="100%"
              >
                <Path
                  d="M0 18 Q218 72 400 6 L400 58 L0 58 Z"
                  fill={colors.primary}
                />
                <Path
                  d="M0 27 Q218 76 400 13 L400 58 L0 58 Z"
                  fill={colors.lightBlue}
                />
                <Path
                  d="M0 35 Q218 78 400 21 L400 58 L0 58 Z"
                  fill={colors.background}
                />
              </Svg>
            </View>

            <View
              style={[
                styles.messageSection,
                isCompact && styles.messageSectionCompact,
              ]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.88}
                numberOfLines={1}
                style={styles.messageTitle}
              >
                Teach More.
              </Text>
              <View style={styles.accentedHeading}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.84}
                  numberOfLines={1}
                  style={[styles.messageTitle, styles.messageTitleBlue]}
                >
                  Manage Less.
                </Text>
                <Svg
                  accessibilityElementsHidden
                  height="11"
                  style={styles.orangeAccent}
                  viewBox="0 0 92 12"
                  width="92"
                >
                  <Path
                    d="M3 9 Q46 -2 89 9"
                    fill="none"
                    stroke={colors.orange}
                    strokeLinecap="round"
                    strokeWidth="5"
                  />
                </Svg>
              </View>
              <Text style={styles.description}>
                Secure access for students, parents, staff{'\n'}and school
                administrators.
              </Text>
            </View>

            <Pressable
              accessibilityHint="Sign in securely using your mobile number"
              accessibilityLabel="Login"
              accessibilityRole="button"
              onPress={onLoginPress}
              style={({ pressed }) => [
                styles.primaryButtonShadow,
                isCompact && styles.primaryButtonShadowCompact,
                pressed && styles.pressedButton,
              ]}
            >
              <LinearGradient
                colors={[colors.lightBlue, colors.primary]}
                end={{ x: 1, y: 0.5 }}
                start={{ x: 0, y: 0.5 }}
                style={[
                  styles.primaryButton,
                  isCompact && styles.primaryButtonCompact,
                ]}
              >
                <View style={styles.loginIconCircle}>
                  <AppIcon
                    color={colors.primary}
                    name="log-in"
                    size={25}
                    strokeWidth={2.4}
                  />
                </View>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.86}
                  numberOfLines={1}
                  style={styles.primaryButtonText}
                >
                  Login
                </Text>
              </LinearGradient>
              <TrailingChevron variant="white" />
            </Pressable>

            {__DEV__ && onComponentPreviewPress ? (
              <Pressable
                accessibilityLabel="Open component preview"
                accessibilityRole="button"
                onPress={onComponentPreviewPress}
                style={({ pressed }) => [
                  styles.debugLink,
                  pressed && styles.pressedCard,
                ]}
              >
                <Text style={styles.debugLinkText}>
                  Open design system preview
                </Text>
              </Pressable>
            ) : null}

            <View
              accessibilityLabel="Secure, Reliable, Fast, and Easy to Use"
              style={[styles.trustCard, isCompact && styles.trustCardCompact]}
            >
              <TrustFeature icon="shield-check" label="Secure" />
              <TrustFeature icon="lock" label="Reliable" />
              <TrustFeature icon="clock" label="Fast" />
              <TrustFeature
                fillColor={colors.yellow}
                icon="star"
                label="Easy to Use"
              />
            </View>

            <View style={[styles.footer, isCompact && styles.footerCompact]}>
              <AppIcon
                color={colors.iconBlue}
                name="settings"
                size={15}
                strokeWidth={2}
              />
              <Text style={styles.footerText}>Built with</Text>
              <AppIcon
                color={colors.primary}
                fillColor={colors.primary}
                name="heart"
                size={15}
                strokeWidth={1.5}
              />
              <Text style={styles.footerText}>for Better Education</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const softShadow = {
  elevation: 4,
  shadowColor: colors.shadowBlue,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 13,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backgroundDecorations: {
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  glow: {
    backgroundColor: colors.glow,
    borderRadius: 200,
    opacity: 0.28,
    position: 'absolute',
  },
  glowTopLeft: {
    height: 270,
    left: -135,
    top: 90,
    width: 270,
  },
  glowRight: {
    height: 340,
    right: -220,
    top: 430,
    width: 340,
  },
  pageContent: {
    alignItems: 'center',
    flex: 1,
    paddingBottom: spacing.xs,
  },
  content: {
    alignSelf: 'center',
    flex: 1,
    width: '100%',
  },
  header: {
    position: 'relative',
  },
  languageButton: {
    ...softShadow,
    alignItems: 'center',
    backgroundColor: colors.surfaceGlass94,
    borderColor: colors.border,
    borderRadius: 27,
    borderWidth: 1,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    position: 'absolute',
    right: 0,
    top: spacing.xs,
    zIndex: 2,
  },
  languageText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: typography.weights.bold,
    marginHorizontal: 7,
  },
  brandSection: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  brandTitle: {
    color: colors.navy,
    fontSize: 34,
    fontWeight: typography.weights.extraBold,
    letterSpacing: -1,
    marginTop: 2,
    textAlign: 'center',
  },
  brandTitleNarrow: {
    fontSize: 31,
  },
  brandSubtitle: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    lineHeight: 20,
    marginTop: 2,
    textAlign: 'center',
  },
  hero: {
    alignSelf: 'stretch',
    marginHorizontal: -spacing.md,
    marginTop: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    bottom: 15,
    height: '94%',
    left: 0,
    position: 'absolute',
    width: '100%',
  },
  badge: {
    position: 'absolute',
    transformOrigin: 'center',
  },
  badgeNarrow: {
    height: 88,
    width: 92,
  },
  badgeCompact: {
    height: 84,
    width: 92,
  },
  studentsBadge: {
    left: 6,
    top: 28,
  },
  homeworkBadge: {
    right: 6,
    top: 35,
  },
  attendanceBadge: {
    bottom: 61,
    left: 0,
  },
  reportsBadge: {
    bottom: 65,
    right: -8,
  },
  topBadgeCompact: {
    top: 18,
  },
  bottomBadgeCompact: {
    bottom: 42,
  },
  wave: {
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  messageSection: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  messageSectionCompact: {
    marginTop: spacing.xs,
  },
  messageTitle: {
    color: colors.navy,
    fontSize: typography.sizes.headingSmall,
    fontWeight: typography.weights.extraBold,
    letterSpacing: -0.7,
    lineHeight: 31,
    textAlign: 'center',
  },
  accentedHeading: {
    alignItems: 'center',
    paddingBottom: 9,
    position: 'relative',
  },
  messageTitleBlue: {
    color: colors.primary,
    marginTop: 1,
  },
  orangeAccent: {
    bottom: 0,
    position: 'absolute',
    right: 8,
  },
  description: {
    color: colors.mutedText,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    lineHeight: 21,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  primaryButtonShadow: {
    ...softShadow,
    borderRadius: 20,
    marginTop: spacing.md,
    position: 'relative',
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
  },
  primaryButtonShadowCompact: {
    marginTop: spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: spacing.md,
  },
  primaryButtonCompact: {
    height: 52,
  },
  loginIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  primaryButtonText: {
    color: colors.white,
    flex: 1,
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.bold,
    marginHorizontal: spacing.md,
  },
  trailingChevron: {
    height: 24,
    marginTop: -12,
    position: 'absolute',
    right: spacing.lg,
    top: '50%',
    width: 14,
  },
  chevronStroke: {
    borderRadius: 2,
    height: 3,
    position: 'absolute',
    right: 0,
    width: 13,
  },
  chevronUpper: {
    top: 6,
    transform: [{ rotate: '45deg' }],
  },
  chevronLower: {
    bottom: 6,
    transform: [{ rotate: '-45deg' }],
  },
  chevronWhite: {
    backgroundColor: colors.white,
  },
  chevronBlue: {
    backgroundColor: colors.iconBlue,
  },
  trustCard: {
    ...softShadow,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceGlass96,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    minHeight: 84,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
  trustCardCompact: {
    marginTop: spacing.sm,
    minHeight: 78,
    paddingTop: spacing.xs,
  },
  debugLink: {
    alignSelf: 'center',
    minHeight: 34,
    justifyContent: 'center',
    marginTop: 2,
    paddingHorizontal: spacing.md,
  },
  debugLinkText: {
    color: colors.mutedText,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  footerCompact: {
    marginTop: spacing.xs,
  },
  footerText: {
    color: colors.mutedText,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginHorizontal: 5,
  },
  pressedButton: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  pressedCard: {
    opacity: 0.78,
  },
});
