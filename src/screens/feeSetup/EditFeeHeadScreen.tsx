import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { LoadingView } from '../../components/feedback/LoadingView';
import { InlineError } from '../../components/feedback/InlineError';
import { FeeHeadFormFields } from '../../components/feeSetup/FeeFormFields';
import type { CreateFeeHeadInput } from '../../models/fee';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';
import { validateFeeHead, type FeeFormErrors } from '../../utils/feeValidation';

export function EditFeeHeadScreen({
  navigation,
  route,
}: RoleScreenProps<'EditFeeHead'>) {
  const current = useFeeSetupStore(state => state.currentFeeHead);
  const load = useFeeSetupStore(state => state.loadFeeHead);
  const save = useFeeSetupStore(state => state.saveFeeHead);
  const loading = useFeeSetupStore(
    state => state.isLoadingFeeHeads || state.isSavingFeeHead,
  );
  const error = useFeeSetupStore(state => state.error);
  const [value, setValue] = useState<CreateFeeHeadInput | null>(null);
  const [errors, setErrors] = useState<FeeFormErrors>({});
  useEffect(() => {
    if (current?.id !== route.params.feeHeadId) {
      load(route.params.feeHeadId).catch(() => undefined);
      return;
    }
    setValue({
      code: current.code,
      defaultFrequency: current.defaultFrequency,
      description: current.description,
      displayOrder: current.displayOrder,
      mandatoryByDefault: current.mandatoryByDefault,
      name: current.name,
      refundable: current.refundable,
      status: current.status,
      type: current.type,
    });
  }, [current, load, route.params.feeHeadId]);
  return (
    <AppScreen scrollable testID="edit-fee-head-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Edit Fee Head" />
        {!value ? <LoadingView message="Loading Fee Head…" /> : (
          <>
            <FeeHeadFormFields errors={errors} onChange={setValue} value={value} />
            {error ? <InlineError message={error.message} /> : null}
            <AppButton
              loading={loading}
              onPress={async () => {
                const next = validateFeeHead(value);
                setErrors(next);
                if (!Object.keys(next).length && await save(value, route.params.feeHeadId)) navigation.goBack();
              }}
              style={styles.save}
              title="Save Fee Head"
            />
          </>
        )}
      </View>
    </AppScreen>
  );
}
const styles = StyleSheet.create({ maxWidth: { alignSelf: 'center', maxWidth: 700, width: '100%' }, save: { marginTop: 20 } });
