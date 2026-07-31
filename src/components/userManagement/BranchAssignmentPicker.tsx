import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { Branch } from '../../models/organization';
import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';

export interface BranchAssignmentPickerProps {
  branches: Branch[];
  selectedIds: string[];
  onChange: (branchIds: string[]) => void;
  disabled?: boolean;
  error?: string;
}

export function BranchAssignmentPicker({
  branches,
  selectedIds,
  onChange,
  disabled,
  error,
}: BranchAssignmentPickerProps) {
  const toggle = (branchId: string): void => {
    if (selectedIds.includes(branchId)) {
      onChange(selectedIds.filter(id => id !== branchId));
    } else {
      onChange([...selectedIds, branchId]);
    }
  };

  return (
    <View>
      <AppText variant="heading3">Assigned branches</AppText>
      <AppText style={styles.helper} variant="caption">
        Only active branches can be assigned.
      </AppText>
      <View style={styles.options}>
        {branches
          .filter(branch => branch.status === 'ACTIVE')
          .map(branch => (
            <AppButton
              disabled={disabled}
              key={branch.id}
              onPress={() => toggle(branch.id)}
              title={`${selectedIds.includes(branch.id) ? '✓ ' : ''}${branch.name}`}
              variant={
                selectedIds.includes(branch.id) ? 'primary' : 'outline'
              }
            />
          ))}
      </View>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { marginTop: 8 },
  helper: { marginTop: 4 },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
});
