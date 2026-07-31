import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PermissionKey } from '../../constants/userPermissions';
import type {
  AcademicClass,
  AcademicContext,
  AcademicSetupSummary,
  ClassListQuery,
  ClassSubjectAssignment,
  CreateClassInput,
  CreateSectionInput,
  CreateSubjectInput,
  Section,
  SectionListQuery,
  Subject,
  SubjectListQuery,
  UpdateClassInput,
  UpdateSectionInput,
  UpdateSubjectInput,
} from '../../models/academic';
import type { UserMembership } from '../../models/auth';
import type { ApiError } from '../../services/api/apiError';
import { ApiClientError } from '../../services/api/apiError';
import type { PaginatedResponse } from '../../models/common';
import type { AcademicSessionStatus } from '../../models/organization';
import type { AcademicService } from '../../services/academic/academicService';
import {
  academicService,
} from '../../services/academic/academicServiceResolver';
import {
  canAssignClassSubjects,
  canManageClasses,
  canManageSections,
  canManageSubjects,
  canViewClasses,
  canViewSections,
  canViewSubjects,
} from '../../utils/academicPermissions';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { authStore } from '../auth/authStore';
import { userManagementStore } from '../userManagement/userManagementStore';

export interface AcademicState {
  context: AcademicContext | null;
  sessionStatus?: AcademicSessionStatus;
  summary: AcademicSetupSummary | null;
  classes: PaginatedResponse<AcademicClass>;
  classQuery: ClassListQuery;
  currentClass: AcademicClass | null;
  sections: PaginatedResponse<Section>;
  sectionQuery: SectionListQuery;
  currentSection: Section | null;
  subjects: PaginatedResponse<Subject>;
  subjectQuery: SubjectListQuery;
  currentSubject: Subject | null;
  assignments: ClassSubjectAssignment[];
  isLoading: boolean;
  isSaving: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

export interface AcademicActions {
  setContext: (
    context: AcademicContext | null,
    sessionStatus?: AcademicSessionStatus,
  ) => void;
  setClassQuery: (query: Partial<ClassListQuery>) => void;
  setSectionQuery: (query: Partial<SectionListQuery>) => void;
  setSubjectQuery: (query: Partial<SubjectListQuery>) => void;
  loadSetupSummary: () => Promise<void>;
  loadClasses: () => Promise<void>;
  loadClass: (classId: string) => Promise<boolean>;
  createClass: (input: CreateClassInput) => Promise<AcademicClass | null>;
  updateClass: (
    classId: string,
    input: UpdateClassInput,
  ) => Promise<boolean>;
  updateClassStatus: (
    classId: string,
    status: AcademicClass['status'],
  ) => Promise<boolean>;
  loadSections: (classId: string) => Promise<void>;
  loadSection: (classId: string, sectionId: string) => Promise<boolean>;
  createSection: (
    classId: string,
    input: CreateSectionInput,
  ) => Promise<Section | null>;
  updateSection: (
    classId: string,
    sectionId: string,
    input: UpdateSectionInput,
  ) => Promise<boolean>;
  updateSectionStatus: (
    classId: string,
    sectionId: string,
    status: Section['status'],
  ) => Promise<boolean>;
  loadSubjects: (schoolId?: string) => Promise<void>;
  loadSubject: (schoolId: string, subjectId: string) => Promise<boolean>;
  createSubject: (
    schoolId: string,
    input: CreateSubjectInput,
  ) => Promise<Subject | null>;
  updateSubject: (
    schoolId: string,
    subjectId: string,
    input: UpdateSubjectInput,
  ) => Promise<boolean>;
  updateSubjectStatus: (
    schoolId: string,
    subjectId: string,
    status: Subject['status'],
  ) => Promise<boolean>;
  loadAssignments: (classId: string) => Promise<void>;
  updateAssignments: (
    classId: string,
    subjectIds: string[],
  ) => Promise<boolean>;
  clearFeedback: () => void;
  reset: () => void;
}

export type AcademicStoreState = AcademicState & AcademicActions;

interface Dependencies {
  service: AcademicService;
  getMembership: () => UserMembership | null;
  getPermissions: (membership: UserMembership) => readonly PermissionKey[];
}

function emptyPage<T>(): PaginatedResponse<T> {
  return {
    items: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  };
}

export const INITIAL_ACADEMIC_STATE: AcademicState = {
  assignments: [],
  classQuery: {
    page: 1,
    pageSize: 20,
    sort: 'DISPLAY_ORDER_ASC',
    status: 'ALL',
  },
  classes: emptyPage<AcademicClass>(),
  context: null,
  currentClass: null,
  currentSection: null,
  currentSubject: null,
  error: null,
  isLoading: false,
  isSaving: false,
  sectionQuery: {
    page: 1,
    pageSize: 20,
    sort: 'DISPLAY_ORDER_ASC',
    status: 'ALL',
  },
  sections: emptyPage<Section>(),
  subjectQuery: {
    page: 1,
    pageSize: 20,
    sort: 'DISPLAY_ORDER_ASC',
    status: 'ALL',
    type: 'ALL',
  },
  subjects: emptyPage<Subject>(),
  successMessage: null,
  summary: null,
};

function normalizeError(value: unknown): ApiError {
  if (value instanceof ApiClientError) {
    return {
      code: value.code,
      fieldErrors: value.fieldErrors,
      message: value.message,
      status: value.status,
    };
  }
  return {
    code: 'UNEXPECTED_ERROR',
    message: 'Something went wrong. Try again.',
  };
}

function accessError(message: string): ApiClientError {
  return new ApiClientError({
    code: 'ACADEMIC_ACCESS_DENIED',
    message,
    status: 403,
  });
}

export function createAcademicStore({
  service,
  getMembership,
  getPermissions,
}: Dependencies): StoreApi<AcademicStoreState> {
  return createStore<AcademicStoreState>()((set, get) => {
    function membership(): UserMembership {
      const active = getMembership();
      if (!active) {
        throw accessError('Select a valid workspace to continue.');
      }
      return active;
    }

    function context(): AcademicContext {
      const selected = get().context;
      if (!selected) {
        throw accessError('Select a school, branch, and academic session.');
      }
      return selected;
    }

    function authorize(
      allowed: (
        active: UserMembership,
        permissions: readonly PermissionKey[],
      ) => boolean,
      message: string,
    ): void {
      const active = membership();
      if (!allowed(active, getPermissions(active))) {
        throw accessError(message);
      }
    }

    function authorizeClassView(): AcademicContext {
      const selected = context();
      authorize(
        (active, permissions) =>
          canViewClasses(
            active,
            permissions,
            selected.schoolId,
            selected.branchId,
          ),
        'You do not have permission to view classes.',
      );
      return selected;
    }

    function authorizeClassManage(): AcademicContext {
      const selected = context();
      authorize(
        (active, permissions) =>
          canManageClasses(
            active,
            permissions,
            selected.schoolId,
            selected.branchId,
            get().sessionStatus,
          ),
        get().sessionStatus === 'CLOSED'
          ? 'This academic session is closed and strictly read-only.'
          : 'You do not have permission to manage classes.',
      );
      return selected;
    }

    function authorizeSectionView(): AcademicContext {
      const selected = context();
      authorize(
        (active, permissions) =>
          canViewSections(
            active,
            permissions,
            selected.schoolId,
            selected.branchId,
          ),
        'You do not have permission to view sections.',
      );
      return selected;
    }

    function authorizeSectionManage(): AcademicContext {
      const selected = context();
      authorize(
        (active, permissions) =>
          canManageSections(
            active,
            permissions,
            selected.schoolId,
            selected.branchId,
            get().sessionStatus,
          ),
        get().sessionStatus === 'CLOSED'
          ? 'This academic session is closed and strictly read-only.'
          : 'You do not have permission to manage sections.',
      );
      return selected;
    }

    function authorizeSubjectView(schoolId: string): void {
      authorize(
        (active, permissions) =>
          canViewSubjects(active, permissions, schoolId),
        'You do not have permission to view subjects.',
      );
    }

    function authorizeSubjectManage(schoolId: string): void {
      authorize(
        (active, permissions) =>
          canManageSubjects(active, permissions, schoolId) &&
          !(
            get().context?.schoolId === schoolId &&
            get().sessionStatus === 'CLOSED'
          ),
        get().sessionStatus === 'CLOSED'
          ? 'This academic session is closed and strictly read-only.'
          : 'You do not have permission to manage subjects.',
      );
    }

    function replaceInPage<T extends { id: string }>(
      page: PaginatedResponse<T>,
      updated: T,
    ): PaginatedResponse<T> {
      return {
        ...page,
        items: page.items.map(item =>
          item.id === updated.id ? updated : item,
        ),
      };
    }

    function isCurrentContext(selected: AcademicContext): boolean {
      const current = get().context;
      return (
        current?.schoolId === selected.schoolId &&
        current.branchId === selected.branchId &&
        current.academicSessionId === selected.academicSessionId
      );
    }

    return {
      ...INITIAL_ACADEMIC_STATE,

      setContext(selected, sessionStatus) {
        const previous = get().context;
        const schoolChanged = previous?.schoolId !== selected?.schoolId;
        const scopeChanged =
          schoolChanged ||
          previous?.branchId !== selected?.branchId ||
          previous?.academicSessionId !== selected?.academicSessionId;
        set({
          assignments: scopeChanged ? [] : get().assignments,
          classes: scopeChanged ? emptyPage<AcademicClass>() : get().classes,
          context: selected,
          currentClass: scopeChanged ? null : get().currentClass,
          currentSection: scopeChanged ? null : get().currentSection,
          currentSubject: schoolChanged ? null : get().currentSubject,
          error: null,
          isLoading: false,
          isSaving: false,
          sections: scopeChanged ? emptyPage<Section>() : get().sections,
          sessionStatus,
          subjects: schoolChanged ? emptyPage<Subject>() : get().subjects,
          successMessage: null,
          summary: scopeChanged ? null : get().summary,
        });
      },

      setClassQuery(query) {
        set(state => ({ classQuery: { ...state.classQuery, ...query } }));
      },

      setSectionQuery(query) {
        set(state => ({ sectionQuery: { ...state.sectionQuery, ...query } }));
      },

      setSubjectQuery(query) {
        set(state => ({ subjectQuery: { ...state.subjectQuery, ...query } }));
      },

      async loadSetupSummary() {
        set({ error: null, isLoading: true });
        try {
          const selected = authorizeClassView();
          const response = await service.getSetupSummary(selected);
          if (!isCurrentContext(selected)) return;
          set({ isLoading: false, summary: response.data });
        } catch (value) {
          set({ error: normalizeError(value), isLoading: false });
        }
      },

      async loadClasses() {
        set({ error: null, isLoading: true });
        try {
          const selected = authorizeClassView();
          const response = await service.getClasses(
            selected,
            get().classQuery,
          );
          if (!isCurrentContext(selected)) return;
          set({ classes: response.data, isLoading: false });
        } catch (value) {
          set({ error: normalizeError(value), isLoading: false });
        }
      },

      async loadClass(classId) {
        set({ error: null, isLoading: true });
        try {
          const selected = authorizeClassView();
          const response = await service.getClass(selected, classId);
          if (!isCurrentContext(selected)) return false;
          set({ currentClass: response.data, isLoading: false });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isLoading: false });
          return false;
        }
      },

      async createClass(input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const selected = authorizeClassManage();
          const response = await service.createClass(selected, input);
          set(state => ({
            classes: {
              ...state.classes,
              items: [...state.classes.items, response.data],
              totalItems: state.classes.totalItems + 1,
            },
            currentClass: response.data,
            isSaving: false,
            successMessage: response.message,
          }));
          return response.data;
        } catch (value) {
          set({ error: normalizeError(value), isSaving: false });
          return null;
        }
      },

      async updateClass(classId, input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const selected = authorizeClassManage();
          const response = await service.updateClass(
            selected,
            classId,
            input,
          );
          set(state => ({
            classes: replaceInPage(state.classes, response.data),
            currentClass: response.data,
            isSaving: false,
            successMessage: response.message,
          }));
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isSaving: false });
          return false;
        }
      },

      async updateClassStatus(classId, status) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const selected = authorizeClassManage();
          const response = await service.updateClassStatus(
            selected,
            classId,
            status,
          );
          set(state => ({
            classes: replaceInPage(state.classes, response.data),
            currentClass: response.data,
            isSaving: false,
            successMessage: response.message,
          }));
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isSaving: false });
          return false;
        }
      },

      async loadSections(classId) {
        set({ error: null, isLoading: true });
        try {
          const selected = authorizeSectionView();
          const response = await service.getSections(
            selected,
            classId,
            get().sectionQuery,
          );
          if (!isCurrentContext(selected)) return;
          set({ isLoading: false, sections: response.data });
        } catch (value) {
          set({ error: normalizeError(value), isLoading: false });
        }
      },

      async loadSection(classId, sectionId) {
        set({ error: null, isLoading: true });
        try {
          const selected = authorizeSectionView();
          const response = await service.getSection(
            selected,
            classId,
            sectionId,
          );
          if (!isCurrentContext(selected)) return false;
          set({ currentSection: response.data, isLoading: false });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isLoading: false });
          return false;
        }
      },

      async createSection(classId, input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const selected = authorizeSectionManage();
          const response = await service.createSection(
            selected,
            classId,
            input,
          );
          set(state => ({
            currentSection: response.data,
            isSaving: false,
            sections: {
              ...state.sections,
              items: [...state.sections.items, response.data],
              totalItems: state.sections.totalItems + 1,
            },
            successMessage: response.message,
          }));
          return response.data;
        } catch (value) {
          set({ error: normalizeError(value), isSaving: false });
          return null;
        }
      },

      async updateSection(classId, sectionId, input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const selected = authorizeSectionManage();
          const response = await service.updateSection(
            selected,
            classId,
            sectionId,
            input,
          );
          set(state => ({
            currentSection: response.data,
            isSaving: false,
            sections: replaceInPage(state.sections, response.data),
            successMessage: response.message,
          }));
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isSaving: false });
          return false;
        }
      },

      async updateSectionStatus(classId, sectionId, status) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const selected = authorizeSectionManage();
          const response = await service.updateSectionStatus(
            selected,
            classId,
            sectionId,
            status,
          );
          set(state => ({
            currentSection: response.data,
            isSaving: false,
            sections: replaceInPage(state.sections, response.data),
            successMessage: response.message,
          }));
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isSaving: false });
          return false;
        }
      },

      async loadSubjects(schoolId) {
        set({ error: null, isLoading: true });
        try {
          const selectedSchoolId = schoolId ?? context().schoolId;
          authorizeSubjectView(selectedSchoolId);
          const response = await service.getSubjects(
            selectedSchoolId,
            get().subjectQuery,
          );
          if (
            get().context &&
            get().context?.schoolId !== selectedSchoolId
          ) {
            return;
          }
          set({ isLoading: false, subjects: response.data });
        } catch (value) {
          set({ error: normalizeError(value), isLoading: false });
        }
      },

      async loadSubject(schoolId, subjectId) {
        set({ error: null, isLoading: true });
        try {
          authorizeSubjectView(schoolId);
          const response = await service.getSubject(schoolId, subjectId);
          if (get().context && get().context?.schoolId !== schoolId) {
            return false;
          }
          set({ currentSubject: response.data, isLoading: false });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isLoading: false });
          return false;
        }
      },

      async createSubject(schoolId, input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          authorizeSubjectManage(schoolId);
          const response = await service.createSubject(schoolId, input);
          set(state => ({
            currentSubject: response.data,
            isSaving: false,
            subjects: {
              ...state.subjects,
              items: [...state.subjects.items, response.data],
              totalItems: state.subjects.totalItems + 1,
            },
            successMessage: response.message,
          }));
          return response.data;
        } catch (value) {
          set({ error: normalizeError(value), isSaving: false });
          return null;
        }
      },

      async updateSubject(schoolId, subjectId, input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          authorizeSubjectManage(schoolId);
          const response = await service.updateSubject(
            schoolId,
            subjectId,
            input,
          );
          set(state => ({
            currentSubject: response.data,
            isSaving: false,
            subjects: replaceInPage(state.subjects, response.data),
            successMessage: response.message,
          }));
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isSaving: false });
          return false;
        }
      },

      async updateSubjectStatus(schoolId, subjectId, status) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          authorizeSubjectManage(schoolId);
          const response = await service.updateSubjectStatus(
            schoolId,
            subjectId,
            status,
          );
          set(state => ({
            currentSubject: response.data,
            isSaving: false,
            subjects: replaceInPage(state.subjects, response.data),
            successMessage: response.message,
          }));
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isSaving: false });
          return false;
        }
      },

      async loadAssignments(classId) {
        set({ error: null, isLoading: true });
        try {
          const selected = authorizeClassView();
          authorizeSubjectView(selected.schoolId);
          const response = await service.getClassSubjectAssignments(
            selected,
            classId,
          );
          if (!isCurrentContext(selected)) return;
          set({ assignments: response.data, isLoading: false });
        } catch (value) {
          set({ error: normalizeError(value), isLoading: false });
        }
      },

      async updateAssignments(classId, subjectIds) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const selected = context();
          authorize(
            (active, permissions) =>
              canAssignClassSubjects(
                active,
                permissions,
                selected.schoolId,
                selected.branchId,
                get().sessionStatus,
              ),
            get().sessionStatus === 'CLOSED'
              ? 'This academic session is closed and strictly read-only.'
              : 'You do not have permission to assign subjects.',
          );
          const response = await service.updateClassSubjectAssignments(
            selected,
            classId,
            { subjectIds },
          );
          set({
            assignments: response.data,
            isSaving: false,
            successMessage: response.message,
          });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isSaving: false });
          return false;
        }
      },

      clearFeedback() {
        set({ error: null, successMessage: null });
      },

      reset() {
        set(INITIAL_ACADEMIC_STATE);
      },
    };
  });
}

export const academicStore = createAcademicStore({
  getMembership: () => authStore.getState().activeMembership,
  getPermissions: active => {
    const configuration =
      userManagementStore.getState().roleConfiguration;
    return getEffectivePermissions(
      active.role,
      configuration?.role === active.role &&
        configuration.schoolId === active.schoolId
        ? configuration
        : null,
    );
  },
  service: academicService,
});

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) {
    previousMembershipId = membershipId;
    academicStore.getState().reset();
  }
});

export function useAcademicStore<T>(
  selector: (state: AcademicStoreState) => T,
): T {
  return useStore(academicStore, selector);
}
