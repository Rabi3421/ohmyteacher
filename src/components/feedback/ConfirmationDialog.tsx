import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppButton } from '../common/AppButton';
import { AppModal } from '../common/AppModal';
import { AppText } from '../common/AppText';

export interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const theme = useAppTheme();

  return (
    <AppModal
      footer={
        <View style={styles.actions}>
          <AppButton
            onPress={onCancel}
            style={styles.button}
            title={cancelLabel}
            variant="ghost"
          />
          <AppButton
            loading={loading}
            onPress={onConfirm}
            style={[styles.button, styles.confirmButton]}
            title={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
          />
        </View>
      }
      onClose={onCancel}
      title={title}
      visible={visible}
    >
      <AppText color={theme.colors.textSecondary}>{message}</AppText>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    minWidth: 100,
  },
  confirmButton: {
    marginLeft: 8,
  },
});
