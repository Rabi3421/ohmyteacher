import React, { type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ModalProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from './AppText';

export interface AppModalProps extends Omit<ModalProps, 'children'> {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  dismissOnBackdrop?: boolean;
}

export function AppModal({
  title,
  children,
  footer,
  onClose,
  dismissOnBackdrop = true,
  animationType = 'fade',
  transparent = true,
  ...props
}: AppModalProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType={animationType}
      onRequestClose={onClose}
      transparent={transparent}
      {...props}
    >
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: theme.colors.overlay,
            paddingBottom: Math.max(insets.bottom, theme.spacing.md),
            paddingTop: Math.max(insets.top, theme.spacing.md),
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Close modal"
          onPress={dismissOnBackdrop ? onClose : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.xl,
            },
            theme.shadows.lg,
          ]}
        >
          {title ? (
            <View style={styles.header}>
              <AppText style={styles.title} variant="title">
                {title}
              </AppText>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={styles.close}
              >
                <AppIcon
                  color={theme.colors.textSecondary}
                  name="close"
                  size={theme.iconSizes.md}
                />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.body}>{children}</View>
          {footer ? (
            <View
              style={[styles.footer, { borderTopColor: theme.colors.border }]}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialog: {
    maxWidth: 480,
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 4,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  title: {
    flex: 1,
  },
  close: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    marginRight: -10,
    width: 44,
  },
  body: {
    padding: 20,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
});
