import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { AppIcon } from '../../components/icons/AppIcon';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useOrganizationStore } from '../../store';

export function OrganizationSetupSuccessScreen({
  navigation,
  route,
}: RoleScreenProps<'OrganizationSetupSuccess'>) {
  const theme = useAppTheme();
  const result = useOrganizationStore(state => state.createSchoolResult);

  if (!result || result.school.id !== route.params.schoolId) {
    return (
      <AppScreen>
        <AppText align="center" variant="title">
          Setup result is no longer available.
        </AppText>
        <AppButton
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: ROUTES.SCHOOLS }] })
          }
          title="Return to Schools"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="organization-setup-success-screen"
    >
      <View style={styles.maxWidth}>
        <View
          style={[
            styles.successIcon,
            { backgroundColor: theme.colors.successSubtle },
          ]}
        >
          <AppIcon
            color={theme.colors.success}
            name="check"
            size={theme.iconSizes.xl}
          />
        </View>
        <AppText align="center" variant="heading1">
          Organization setup complete
        </AppText>
        <AppText
          align="center"
          color={theme.colors.textSecondary}
          style={styles.subtitle}
        >
          The school and its required default organization records were created
          atomically.
        </AppText>
        <AppCard style={styles.card} variant="elevated">
          <Row label="School" value={result.school.name} />
          <Row label="School Code" value={result.school.code} />
          <Row label="Main Branch" value={result.mainBranch.name} />
          <Row label="Academic Session" value={result.activeSession.name} />
          <Row label="School Admin" value={result.schoolAdmin.name} />
          <Row label="Admin Mobile" value={result.schoolAdmin.mobile} />
        </AppCard>
        <View style={styles.actions}>
          <AppButton
            fullWidth
            onPress={() =>
              navigation.reset({
                index: 1,
                routes: [
                  { name: ROUTES.SCHOOLS },
                  {
                    name: ROUTES.SCHOOL_DETAILS,
                    params: { schoolId: result.school.id },
                  },
                ],
              })
            }
            title="View School"
          />
          <AppButton
            fullWidth
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: ROUTES.SCHOOLS }],
              })
            }
            title="Return to Schools"
            variant="outline"
          />
        </View>
      </View>
    </AppScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <AppText color={theme.colors.textSecondary}>{label}</AppText>
      <AppText align="right" style={styles.rowValue} variant="bodyMedium">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
    marginTop: 20,
  },
  card: {
    marginTop: 24,
  },
  content: {
    justifyContent: 'center',
    paddingBottom: 32,
    paddingTop: 32,
  },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 600,
    width: '100%',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 42,
  },
  rowValue: {
    flex: 1,
    marginLeft: 16,
  },
  subtitle: {
    marginTop: 8,
  },
  successIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 36,
    height: 80,
    justifyContent: 'center',
    marginBottom: 20,
    width: 80,
  },
});
