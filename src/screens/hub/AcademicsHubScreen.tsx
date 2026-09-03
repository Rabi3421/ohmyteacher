import React from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';

import { AppModuleCard } from '../../components/common/AppModuleCard';
import { AppSectionLabel } from '../../components/common/AppSectionLabel';
import { AppHubHeader } from '../../components/layout/AppHubHeader';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTabFocus } from '../../hooks/useTabFocus';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store';
import { brandGradientTop } from '../../theme/gradients';

export function AcademicsHubScreen({ navigation, route }: RoleScreenProps<'AcademicsHub'>) {
  const theme = useAppTheme();
  const { role } = route.params;
  const membership = useAuthStore(s => s.activeMembership);

  useTabFocus('academics');

  const schoolId = membership?.schoolId ?? '';
  const branchId = membership?.branchId;

  const isStaff = ['SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(role);
  const canManageStudents = ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(role);
  const canViewOrg = ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(role);
  const isParent = role === 'PARENT';
  const isStudent = role === 'STUDENT';

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      testID="academics-hub-screen"
    >
      <StatusBar
        backgroundColor={brandGradientTop(theme.mode)}
        barStyle="light-content"
      />

      <AppHubHeader
        icon={isParent ? 'users' : 'book-open'}
        subtitle={
          isParent
            ? 'View and manage your children'
            : isStudent
              ? 'Your academic information'
              : 'Manage students, classes, and subjects'
        }
        title={isParent ? 'My Children' : isStudent ? 'My Academics' : 'Academics'}
      />

      <ScrollView
        contentContainerStyle={styles.list}
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
          <>
            <AppSectionLabel accent="#18A978" title="Students" />
            <AppModuleCard
              accent="#18A978"
              description="Admit new students and manage existing records"
              icon="users"
              onPress={() => navigation.navigate(ROUTES.STUDENTS, { branchId, schoolId })}
              tint="#E8F8F2"
              title="Students"
            />
          </>
        ) : null}

        {canViewOrg && schoolId ? (
          <>
            <AppSectionLabel title="Structure" />
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
          <>
            <AppSectionLabel accent="#F59A23" title="People" />
            <AppModuleCard
              accent="#F59A23"
              description="Manage staff accounts and permissions"
              icon="users"
              onPress={() => navigation.navigate(ROUTES.STAFF_USERS, { schoolId })}
              tint="#FFF4E4"
              title="Staff"
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  root: {
    flex: 1,
  },
});
