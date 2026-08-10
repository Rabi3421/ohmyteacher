import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import type { CurrentFeeHeadFrequency } from '../../models/currentFeeConfiguration';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentFeeConfigurationStore } from '../../store';

export function CreateFeeHeadScreen({ navigation, route }: RoleScreenProps<'CreateFeeHead'>) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<CurrentFeeHeadFrequency>('MONTHLY');
  const [nameError, setNameError] = useState<string>();
  const setContext = useCurrentFeeConfigurationStore(state => state.setContext);
  const create = useCurrentFeeConfigurationStore(state => state.createFeeHead);
  const saving = useCurrentFeeConfigurationStore(state => state.isSaving);
  const error = useCurrentFeeConfigurationStore(state => state.error);

  useEffect(() => setContext(route.params, route.params.sessionStatus), [route.params, setContext]);

  return (
    <AppScreen scrollable testID="create-fee-head-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Django creates Fee Heads active by default" title="Create Fee Head" />
        <View style={styles.fields}>
          <AppInput
            autoCapitalize="words"
            error={nameError ?? error?.fieldErrors?.name}
            label="Name"
            maxLength={100}
            onChangeText={value => { setName(value); setNameError(undefined); }}
            required
            value={name}
          />
          <View style={styles.options}>
            <AppButton onPress={() => setFrequency('MONTHLY')} title="Monthly" variant={frequency === 'MONTHLY' ? 'primary' : 'outline'} />
            <AppButton onPress={() => setFrequency('ONE_TIME')} title="One-time" variant={frequency === 'ONE_TIME' ? 'primary' : 'outline'} />
          </View>
          {error && !error.fieldErrors?.name ? <InlineError message={error.message} /> : null}
          <AppButton
            loading={saving}
            onPress={async () => {
              const normalized = name.trim();
              if (!normalized) { setNameError('Name is required.'); return; }
              if (await create({ frequency, name: normalized })) navigation.goBack();
            }}
            title="Create Active Fee Head"
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 14 },
  maxWidth: { alignSelf: 'center', maxWidth: 700, width: '100%' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
