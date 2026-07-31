import { useEffect, useRef } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ROUTES } from '../constants/routes';
import type { AcademicContext } from '../models/academic';
import type { RoleStackParamList } from '../navigation/navigationTypes';
import { useAcademicStore } from '../store';

export function useClassContextRedirect(
  navigation: NativeStackNavigationProp<RoleStackParamList>,
  initial: AcademicContext,
): void {
  const context = useAcademicStore(state => state.context);
  const hasMatchedInitialContext = useRef(false);

  useEffect(() => {
    if (!context || context.schoolId !== initial.schoolId) return;
    const matches =
      context.branchId === initial.branchId &&
      context.academicSessionId === initial.academicSessionId;
    if (matches) {
      hasMatchedInitialContext.current = true;
    } else if (hasMatchedInitialContext.current) {
      navigation.replace(ROUTES.CLASSES, context);
    }
  }, [
    context,
    initial.academicSessionId,
    initial.branchId,
    initial.schoolId,
    navigation,
  ]);
}
