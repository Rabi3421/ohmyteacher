import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { FeeHeadFormFields } from '../../components/feeSetup/FeeFormFields';
import type { CreateFeeHeadInput } from '../../models/fee';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';
import {
  type FeeFormErrors,
  validateFeeHead,
} from '../../utils/feeValidation';

export const initialFeeHead: CreateFeeHeadInput = {
  code: '',
  defaultFrequency: 'MONTHLY',
  displayOrder: 1,
  mandatoryByDefault: true,
  name: '',
  refundable: false,
  status: 'ACTIVE',
  type: 'RECURRING',
};

export function CreateFeeHeadScreen({
  navigation,
}: RoleScreenProps<'CreateFeeHead'>) {
  const [value, setValue] = useState(initialFeeHead);
  const [errors, setErrors] = useState<FeeFormErrors>({});
  const save = useFeeSetupStore(state => state.saveFeeHead);
  const loading = useFeeSetupStore(state => state.isSavingFeeHead);
  const error = useFeeSetupStore(state => state.error);
  return (
    <AppScreen scrollable testID="create-fee-head-screen">
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Create Fee Head"
        />
        <FeeHeadFormFields
          disabled={loading}
          errors={errors}
          onChange={setValue}
          value={value}
        />
        {error ? <InlineError message={error.message} /> : null}
        <AppButton
          loading={loading}
          onPress={async () => {
            const next = validateFeeHead(value);
            setErrors(next);
            if (!Object.keys(next).length && (await save(value))) {
              navigation.goBack();
            }
          }}
          style={styles.save}
          title="Create Fee Head"
        />
      </View>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  maxWidth: { alignSelf: 'center', maxWidth: 700, width: '100%' },
  save: { marginTop: 20 },
});
