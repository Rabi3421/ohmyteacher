import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import type { CurrentFeeHeadFrequency } from '../../models/currentFeeConfiguration';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentFeeConfigurationStore } from '../../store';

export function EditFeeHeadScreen({ navigation, route }: RoleScreenProps<'EditFeeHead'>) {
  const current = useCurrentFeeConfigurationStore(state => state.currentFeeHead);
  const load = useCurrentFeeConfigurationStore(state => state.loadFeeHead);
  const update = useCurrentFeeConfigurationStore(state => state.updateFeeHead);
  const setContext = useCurrentFeeConfigurationStore(state => state.setContext);
  const saving = useCurrentFeeConfigurationStore(state => state.isSaving);
  const loading = useCurrentFeeConfigurationStore(state => state.isLoadingHeads);
  const error = useCurrentFeeConfigurationStore(state => state.error);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<CurrentFeeHeadFrequency>('MONTHLY');
  const [initializedId, setInitializedId] = useState<string>();

  useEffect(() => {
    setContext(route.params, route.params.sessionStatus);
    load(route.params.feeHeadId).catch(() => undefined);
  }, [load, route.params, setContext]);
  useEffect(() => {
    if (current?.id === route.params.feeHeadId && initializedId !== current.id) {
      setName(current.name);
      setFrequency(current.frequency);
      setInitializedId(current.id);
    }
  }, [current, initializedId, route.params.feeHeadId]);

  return (
    <AppScreen scrollable testID="edit-fee-head-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Only name and frequency are writable" title="Edit Fee Head" />
        {!initializedId && loading ? <LoadingView message="Loading live Fee Head…" /> : (
          <View style={styles.fields}>
            <AppInput error={error?.fieldErrors?.name} label="Name" maxLength={100} onChangeText={setName} required value={name} />
            <View style={styles.options}>
              <AppButton onPress={() => setFrequency('MONTHLY')} title="Monthly" variant={frequency === 'MONTHLY' ? 'primary' : 'outline'} />
              <AppButton onPress={() => setFrequency('ONE_TIME')} title="One-time" variant={frequency === 'ONE_TIME' ? 'primary' : 'outline'} />
            </View>
            {error && !error.fieldErrors ? <InlineError message={error.message} /> : null}
            <AppButton
              loading={saving}
              onPress={async () => {
                if (!name.trim()) return;
                if (await update(route.params.feeHeadId, { frequency, name: name.trim() })) navigation.goBack();
              }}
              title="Save Fee Head"
            />
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ fields: { gap: 14 }, maxWidth: { alignSelf: 'center', maxWidth: 700, width: '100%' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
