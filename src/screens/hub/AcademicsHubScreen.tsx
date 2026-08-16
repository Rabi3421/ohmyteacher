import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/common/AppText';
import { AppModuleCard } from '../../components/common/AppModuleCard';
import { TAB_BAR_HEIGHT } from '../../components/layout/AppBottomTabBar';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTabFocus } from '../../hooks/useTabFocus';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store';

export function AcademicsHubScreen({ navigation, route }: RoleScreenProps<'AcademicsHub'>) {
  const theme = useAppTheme();
  const { role } = route.params;
  const membership = useAuthStore(s => s.activeMembership);
  const insets = useSafeAreaInsets();

  useTabFocus('academics');

  const schoolId = membership?.schoolId ?? '';
  const branchId = membership?.branchId;

  const isStaff = ['SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(role);
  const canManageStudents = ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(role);
  const canViewOrg = ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(role);
  const isParent = role === 'PARENT';
  const isStudent = role === 'STUDENT';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, paddingTop: insets.top + 8 }]}>
        <AppText style={{ color: theme.colors.textPrimary }} variant="heading3">
          {isParent ? 'My Children' : isStudent ? 'My Academics' : 'Academics'}
        </AppText>
        <AppText style={{ color: theme.colors.textSecondary, marginTop: 2 }} variant="caption">
          {isParent ? 'View and manage your children' : isStudent ? 'Your academic information' : 'Manage students, classes, and subjects'}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {isParent && schoolId ? (
          <AppModuleCard
            accent="#1478F2"
            description="View your linked children's academic status"
            icon="users"
            onPress={() => navigation.navigate(ROUTES.PARENT_CHILDREN, { parentMembershipId: membership!.id, schoolId })}
            tint="#EAF3FF"
            title="My Children"
          />
        ) : null}

        {isStudent && schoolId ? (
          <AppModuleCard
            accent="#1478F2"
            description="Your enrollment and academic profile"
            icon="user"
            onPress={() => navigation.navigate(ROUTES.STUDENT_SELF_PROFILE, { schoolId, studentMembershipId: membership!.id })}
            tint="#EAF3FF"
            title="My Profile"
          />
        ) : null}

        {canManageStudents && schoolId ? (
          <AppModuleCard
            accent="#18A978"
            description="Admit new students and manage existing records"
            icon="users"
            onPress={() => navigation.navigate(ROUTES.STUDENTS, { branchId, schoolId })}
            tint="#E8F8F2"
            title="Students"
          />
        ) : null}

        {canViewOrg && schoolId ? (
          <>
            <AppModuleCard
              accent="#1478F2"
              description="Classes, sections, and subject assignments"
              icon="book-open"
              onPress={() => navigation.navigate(ROUTES.ACADEMIC_SETUP, { schoolId, branchId })}
              tint="#EAF3FF"
              title="Academic Setup"
            />
            <AppModuleCard
              accent="#6366F1"
              description="Classes for the current academic session"
              icon="graduation-cap"
              onPress={() => navigation.navigate(ROUTES.CLASSES, { branchId: branchId ?? '', academicSessionId: '', schoolId })}
              tint="#EEF2FF"
              title="Classes"
            />
            <AppModuleCard
              accent="#6366F1"
              description="Manage subjects offered by your school"
              icon="book-open"
              onPress={() => navigation.navigate(ROUTES.SUBJECTS, { schoolId, branchId })}
              tint="#EEF2FF"
              title="Subjects"
            />
          </>
        ) : null}

        {isStaff && schoolId ? (
          <AppModuleCard
            accent="#F59A23"
            description="Manage staff accounts and permissions"
            icon="users"
            onPress={() => navigation.navigate(ROUTES.STAFF_USERS, { schoolId })}
            tint="#FFF4E4"
            title="Staff"
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  list: {
    gap: 10,
    padding: 16,
  },
  root: {
    flex: 1,
  },
});
