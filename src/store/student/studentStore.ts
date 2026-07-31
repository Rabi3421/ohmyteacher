import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PermissionKey } from '../../constants/userPermissions';
import type { UserMembership } from '../../models/auth';
import type { ApiError } from '../../services/api/apiError';
import { ApiClientError } from '../../services/api/apiError';
import type { PaginatedResponse } from '../../models/common';
import type {
  CreateGuardianInput,
  CreateStudentAdmissionInput,
  GuardianDetails,
  StudentAccessSummary,
  StudentAdmissionDraft,
  StudentAdmissionResult,
  StudentDetails,
  StudentEnrollment,
  StudentListItem,
  StudentListQuery,
  StudentProfileStatus,
  TransferStudentInput,
  UpdateGuardianInput,
  UpdateStudentProfileInput,
} from '../../models/student';
import type { StudentService } from '../../services/student/studentService';
import { studentService } from '../../services/student/studentServiceResolver';
import {
  canCreateStudent,
  canEditStudent,
  canManageGuardians,
  canManageStudentAccess,
  canManageStudentStatus,
  canTransferStudent,
  canViewStudents,
  canViewStudentHistory,
} from '../../utils/studentPermissions';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { authStore } from '../auth/authStore';
import { userManagementStore } from '../userManagement/userManagementStore';

export interface StudentState {
  schoolId: string | null;
  students: PaginatedResponse<StudentListItem>;
  query: StudentListQuery;
  currentStudent: StudentDetails | null;
  guardians: GuardianDetails[];
  enrollmentHistory: StudentEnrollment[];
  access: StudentAccessSummary | null;
  parentChildren: StudentListItem[];
  parentSelectedChild: StudentDetails | null;
  selfProfile: StudentDetails | null;
  admissionDraft: StudentAdmissionDraft;
  admissionResult: StudentAdmissionResult | null;
  isLoadingStudents: boolean;
  isCreatingStudent: boolean;
  isLoadingStudent: boolean;
  isUpdatingStudent: boolean;
  isSavingGuardian: boolean;
  isTransferringStudent: boolean;
  isUpdatingStatus: boolean;
  isLoadingAccess: boolean;
  isUpdatingAccess: boolean;
  isLoadingParentChildren: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

export interface StudentActions {
  setSchoolContext: (schoolId: string | null) => void;
  setQuery: (query: Partial<StudentListQuery>) => void;
  clearAcademicFilters: () => void;
  loadStudents: (schoolId: string) => Promise<void>;
  loadStudent: (schoolId: string, studentId: string) => Promise<boolean>;
  updateAdmissionDraft: (draft: Partial<StudentAdmissionDraft>) => void;
  setAdmissionStep: (step: StudentAdmissionDraft['step']) => void;
  resetAdmissionDraft: () => void;
  submitAdmission: (
    schoolId: string,
  ) => Promise<StudentAdmissionResult | null>;
  updateProfile: (
    schoolId: string,
    studentId: string,
    input: UpdateStudentProfileInput,
  ) => Promise<boolean>;
  updateStatus: (
    schoolId: string,
    studentId: string,
    status: StudentProfileStatus,
    reason: string,
  ) => Promise<boolean>;
  loadGuardians: (schoolId: string, studentId: string) => Promise<void>;
  addGuardian: (
    schoolId: string,
    studentId: string,
    input: CreateGuardianInput,
  ) => Promise<GuardianDetails | null>;
  updateGuardian: (
    schoolId: string,
    studentId: string,
    guardianId: string,
    input: UpdateGuardianInput,
  ) => Promise<boolean>;
  unlinkGuardian: (
    schoolId: string,
    studentId: string,
    guardianId: string,
  ) => Promise<boolean>;
  loadEnrollmentHistory: (
    schoolId: string,
    studentId: string,
  ) => Promise<void>;
  transferStudent: (
    schoolId: string,
    studentId: string,
    input: TransferStudentInput,
  ) => Promise<boolean>;
  loadAccess: (schoolId: string, studentId: string) => Promise<void>;
  updateParentAccess: (
    schoolId: string,
    studentId: string,
    guardianId: string,
    enabled: boolean,
  ) => Promise<boolean>;
  updateStudentAccess: (
    schoolId: string,
    studentId: string,
    enabled: boolean,
  ) => Promise<boolean>;
  loadParentChildren: (
    schoolId: string,
    parentMembershipId: string,
  ) => Promise<void>;
  loadParentChild: (
    schoolId: string,
    parentMembershipId: string,
    studentId: string,
  ) => Promise<boolean>;
  loadSelfProfile: (
    schoolId: string,
    studentMembershipId: string,
  ) => Promise<boolean>;
  clearFeedback: () => void;
  reset: () => void;
}

export type StudentStoreState = StudentState & StudentActions;

interface Dependencies {
  service: StudentService;
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

const emptyAddress = {
  city: '',
  country: 'India',
  line1: '',
  pinCode: '',
  state: '',
};

export function createInitialAdmissionDraft(): StudentAdmissionDraft {
  return {
    enableStudentAppAccess: false,
    enrollment: {
      academicSessionId: '',
      branchId: '',
      classId: '',
      sectionId: '',
    },
    guardians: [],
    profile: {
      address: { ...emptyAddress },
      admissionDate: new Date().toISOString().slice(0, 10),
      dateOfBirth: '',
      fullName: '',
      gender: 'MALE',
    },
    step: 1,
  };
}

export const INITIAL_STUDENT_STATE: StudentState = {
  access: null,
  admissionDraft: createInitialAdmissionDraft(),
  admissionResult: null,
  currentStudent: null,
  enrollmentHistory: [],
  error: null,
  guardians: [],
  isCreatingStudent: false,
  isLoadingAccess: false,
  isLoadingParentChildren: false,
  isLoadingStudent: false,
  isLoadingStudents: false,
  isSavingGuardian: false,
  isTransferringStudent: false,
  isUpdatingAccess: false,
  isUpdatingStatus: false,
  isUpdatingStudent: false,
  parentChildren: [],
  parentSelectedChild: null,
  query: {
    academicSessionId: 'ALL',
    branchId: 'ALL',
    classId: 'ALL',
    enrollmentStatus: 'ALL',
    page: 1,
    pageSize: 20,
    sectionId: 'ALL',
    studentStatus: 'ALL',
  },
  schoolId: null,
  selfProfile: null,
  students: emptyPage<StudentListItem>(),
  successMessage: null,
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
    code: 'STUDENT_ACCESS_DENIED',
    message,
    status: 403,
  });
}

export function createStudentStore({
  service,
  getMembership,
  getPermissions,
}: Dependencies): StoreApi<StudentStoreState> {
  return createStore<StudentStoreState>()((set, get) => {
    function actor(): UserMembership {
      const active = getMembership();
      if (!active) throw accessError('Select a valid workspace.');
      return active;
    }

    function authorize(
      allowed: (
        membership: UserMembership,
        permissions: readonly PermissionKey[],
      ) => boolean,
      message: string,
    ): UserMembership {
      const active = actor();
      if (!allowed(active, getPermissions(active))) throw accessError(message);
      return active;
    }

    function currentBranch(details?: StudentDetails | null): string | undefined {
      return details?.currentEnrollment?.branchId;
    }

    function sameSchool(schoolId: string): boolean {
      return get().schoolId === schoolId;
    }

    function authorizeView(schoolId: string, branchId?: string) {
      authorize(
        (active, permissions) =>
          canViewStudents(active, permissions, schoolId, branchId),
        'You do not have permission to view students in this scope.',
      );
    }

    async function resolveAuthorizedStudent(
      schoolId: string,
      studentId: string,
    ): Promise<StudentDetails> {
      authorizeView(schoolId);
      const cached = get().currentStudent;
      if (cached?.profile.id === studentId) {
        authorizeView(schoolId, currentBranch(cached));
        return cached;
      }
      const response = await service.getStudent(schoolId, studentId);
      authorizeView(schoolId, currentBranch(response.data));
      if (sameSchool(schoolId)) {
        set({ currentStudent: response.data });
      }
      return response.data;
    }

    return {
      ...INITIAL_STUDENT_STATE,

      setSchoolContext(schoolId) {
        if (get().schoolId === schoolId) return;
        set({
          ...INITIAL_STUDENT_STATE,
          admissionDraft: createInitialAdmissionDraft(),
          schoolId,
        });
      },

      setQuery(query) {
        set(state => ({ query: { ...state.query, ...query } }));
      },

      clearAcademicFilters() {
        set(state => ({
          query: {
            ...state.query,
            academicSessionId: 'ALL',
            branchId: 'ALL',
            classId: 'ALL',
            page: 1,
            sectionId: 'ALL',
          },
          students: emptyPage<StudentListItem>(),
        }));
      },

      async loadStudents(schoolId) {
        set({ error: null, isLoadingStudents: true });
        try {
          const active = actor();
          authorizeView(
            schoolId,
            ['BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(
              active.role,
            )
              ? active.branchId
              : get().query.branchId === 'ALL'
                ? undefined
                : get().query.branchId,
          );
          const query = {
            ...get().query,
            branchId: ['BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(
              active.role,
            )
              ? active.branchId
              : get().query.branchId,
          };
          const response = await service.getStudents(schoolId, query);
          if (!sameSchool(schoolId)) return;
          set({ isLoadingStudents: false, students: response.data });
        } catch (value) {
          set({ error: normalizeError(value), isLoadingStudents: false });
        }
      },

      async loadStudent(schoolId, studentId) {
        set({ error: null, isLoadingStudent: true });
        try {
          authorizeView(schoolId);
          const response = await service.getStudent(schoolId, studentId);
          authorizeView(schoolId, currentBranch(response.data));
          if (!sameSchool(schoolId)) return false;
          set({ currentStudent: response.data, isLoadingStudent: false });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isLoadingStudent: false });
          return false;
        }
      },

      updateAdmissionDraft(draft) {
        set(state => ({
          admissionDraft: { ...state.admissionDraft, ...draft },
        }));
      },

      setAdmissionStep(step) {
        set(state => ({
          admissionDraft: { ...state.admissionDraft, step },
        }));
      },

      resetAdmissionDraft() {
        set({
          admissionDraft: createInitialAdmissionDraft(),
          admissionResult: null,
        });
      },

      async submitAdmission(schoolId) {
        set({ error: null, isCreatingStudent: true });
        try {
          const draft = get().admissionDraft;
          const branchId = draft.enrollment.branchId;
          authorize(
            (active, permissions) =>
              canCreateStudent(active, permissions, schoolId, branchId),
            'You do not have permission to admit students in this branch.',
          );
          const input: CreateStudentAdmissionInput = {
            enableStudentAppAccess: draft.enableStudentAppAccess,
            enrollment: draft.enrollment,
            guardians: draft.guardians,
            profile: draft.profile,
          };
          const response = await service.createStudentAdmission(schoolId, input);
          set({
            admissionDraft: createInitialAdmissionDraft(),
            admissionResult: response.data,
            currentStudent: null,
            isCreatingStudent: false,
            successMessage: response.message,
          });
          return response.data;
        } catch (value) {
          set({ error: normalizeError(value), isCreatingStudent: false });
          return null;
        }
      },

      async updateProfile(schoolId, studentId, input) {
        set({ error: null, isUpdatingStudent: true });
        try {
          const branchId = currentBranch(
            await resolveAuthorizedStudent(schoolId, studentId),
          );
          authorize(
            (active, permissions) =>
              canEditStudent(active, permissions, schoolId, branchId),
            'You do not have permission to edit this student.',
          );
          const response = await service.updateStudentProfile(
            schoolId,
            studentId,
            input,
          );
          set(state => ({
            currentStudent: state.currentStudent
              ? { ...state.currentStudent, profile: response.data }
              : null,
            isUpdatingStudent: false,
            successMessage: response.message,
          }));
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isUpdatingStudent: false });
          return false;
        }
      },

      async updateStatus(schoolId, studentId, status, reason) {
        set({ error: null, isUpdatingStatus: true });
        try {
          const branchId = currentBranch(
            await resolveAuthorizedStudent(schoolId, studentId),
          );
          authorize(
            (active, permissions) =>
              canManageStudentStatus(active, permissions, schoolId, branchId),
            'You do not have permission to change student status.',
          );
          const response = await service.updateStudentStatus(
            schoolId,
            studentId,
            { reason, status },
          );
          set({
            currentStudent: response.data,
            isUpdatingStatus: false,
            successMessage: response.message,
          });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isUpdatingStatus: false });
          return false;
        }
      },

      async loadGuardians(schoolId, studentId) {
        set({ error: null, isLoadingStudent: true });
        try {
          await resolveAuthorizedStudent(schoolId, studentId);
          const response = await service.getStudentGuardians(schoolId, studentId);
          if (!sameSchool(schoolId)) return;
          set({ guardians: response.data, isLoadingStudent: false });
        } catch (value) {
          set({ error: normalizeError(value), isLoadingStudent: false });
        }
      },

      async addGuardian(schoolId, studentId, input) {
        set({ error: null, isSavingGuardian: true });
        try {
          const branchId = currentBranch(
            await resolveAuthorizedStudent(schoolId, studentId),
          );
          authorize(
            (active, permissions) =>
              canManageGuardians(active, permissions, schoolId, branchId),
            'You do not have permission to manage guardians.',
          );
          const response = await service.addStudentGuardian(
            schoolId,
            studentId,
            input,
          );
          set(state => ({
            guardians: [...state.guardians, response.data],
            isSavingGuardian: false,
            successMessage: response.message,
          }));
          return response.data;
        } catch (value) {
          set({ error: normalizeError(value), isSavingGuardian: false });
          return null;
        }
      },

      async updateGuardian(schoolId, studentId, guardianId, input) {
        set({ error: null, isSavingGuardian: true });
        try {
          const branchId = currentBranch(
            await resolveAuthorizedStudent(schoolId, studentId),
          );
          authorize(
            (active, permissions) =>
              canManageGuardians(active, permissions, schoolId, branchId),
            'You do not have permission to manage guardians.',
          );
          const response = await service.updateStudentGuardian(
            schoolId,
            studentId,
            guardianId,
            input,
          );
          set(state => ({
            guardians: state.guardians.map(item =>
              item.id === guardianId ? response.data : item,
            ),
            isSavingGuardian: false,
            successMessage: response.message,
          }));
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isSavingGuardian: false });
          return false;
        }
      },

      async unlinkGuardian(schoolId, studentId, guardianId) {
        set({ error: null, isSavingGuardian: true });
        try {
          const branchId = currentBranch(
            await resolveAuthorizedStudent(schoolId, studentId),
          );
          authorize(
            (active, permissions) =>
              canManageGuardians(active, permissions, schoolId, branchId),
            'You do not have permission to manage guardians.',
          );
          await service.unlinkStudentGuardian(schoolId, studentId, guardianId);
          set(state => ({
            guardians: state.guardians.filter(item => item.id !== guardianId),
            isSavingGuardian: false,
            successMessage: 'Guardian unlinked with history preserved.',
          }));
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isSavingGuardian: false });
          return false;
        }
      },

      async loadEnrollmentHistory(schoolId, studentId) {
        set({ error: null, isLoadingStudent: true });
        try {
          const branchId = currentBranch(
            await resolveAuthorizedStudent(schoolId, studentId),
          );
          authorize(
            (active, permissions) =>
              canViewStudentHistory(active, permissions, schoolId, branchId),
            'You do not have permission to view enrollment history.',
          );
          const response = await service.getEnrollmentHistory(
            schoolId,
            studentId,
          );
          if (!sameSchool(schoolId)) return;
          set({ enrollmentHistory: response.data, isLoadingStudent: false });
        } catch (value) {
          set({ error: normalizeError(value), isLoadingStudent: false });
        }
      },

      async transferStudent(schoolId, studentId, input) {
        set({ error: null, isTransferringStudent: true });
        try {
          const active = actor();
          const sourceBranchId = currentBranch(
            await resolveAuthorizedStudent(schoolId, studentId),
          );
          authorize(
            (membership, permissions) =>
              canTransferStudent(
                membership,
                permissions,
                schoolId,
                sourceBranchId,
                input.branchId,
              ),
            'You do not have permission to transfer across this scope.',
          );
          const response = await service.transferStudent(
            schoolId,
            studentId,
            {
              ...input,
              allowedBranchIds:
                active.role === 'SUPER_ADMIN' ||
                active.role === 'SCHOOL_ADMIN'
                  ? undefined
                  : active.branchId
                    ? [active.branchId]
                    : [],
            },
          );
          const refreshed = await service.getStudent(schoolId, studentId);
          const history = await service.getEnrollmentHistory(schoolId, studentId);
          set({
            currentStudent: refreshed.data,
            enrollmentHistory: history.data,
            isTransferringStudent: false,
            successMessage: response.message,
          });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isTransferringStudent: false });
          return false;
        }
      },

      async loadAccess(schoolId, studentId) {
        set({ error: null, isLoadingAccess: true });
        try {
          await resolveAuthorizedStudent(schoolId, studentId);
          const response = await service.getStudentAccess(schoolId, studentId);
          if (!sameSchool(schoolId)) return;
          set({ access: response.data, isLoadingAccess: false });
        } catch (value) {
          set({ error: normalizeError(value), isLoadingAccess: false });
        }
      },

      async updateParentAccess(schoolId, studentId, guardianId, enabled) {
        set({ error: null, isUpdatingAccess: true });
        try {
          const branchId = currentBranch(
            await resolveAuthorizedStudent(schoolId, studentId),
          );
          authorize(
            (active, permissions) =>
              canManageStudentAccess(active, permissions, schoolId, branchId),
            'You do not have permission to manage app access.',
          );
          const response = await service.updateParentAccess(
            schoolId,
            studentId,
            guardianId,
            { enabled },
          );
          set({
            access: response.data,
            isUpdatingAccess: false,
            successMessage: response.message,
          });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isUpdatingAccess: false });
          return false;
        }
      },

      async updateStudentAccess(schoolId, studentId, enabled) {
        set({ error: null, isUpdatingAccess: true });
        try {
          const branchId = currentBranch(
            await resolveAuthorizedStudent(schoolId, studentId),
          );
          authorize(
            (active, permissions) =>
              canManageStudentAccess(active, permissions, schoolId, branchId),
            'You do not have permission to manage app access.',
          );
          const response = await service.updateStudentAppAccess(
            schoolId,
            studentId,
            { enabled },
          );
          set({
            access: response.data,
            isUpdatingAccess: false,
            successMessage: response.message,
          });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isUpdatingAccess: false });
          return false;
        }
      },

      async loadParentChildren(schoolId, parentMembershipId) {
        set({ error: null, isLoadingParentChildren: true });
        try {
          const active = actor();
          if (
            active.role !== 'PARENT' ||
            active.schoolId !== schoolId ||
            active.id !== parentMembershipId
          ) {
            throw accessError('Parent membership ownership check failed.');
          }
          const response = await service.getParentChildren(
            schoolId,
            parentMembershipId,
          );
          set({
            isLoadingParentChildren: false,
            parentChildren: response.data,
          });
        } catch (value) {
          set({
            error: normalizeError(value),
            isLoadingParentChildren: false,
          });
        }
      },

      async loadParentChild(schoolId, parentMembershipId, studentId) {
        set({ error: null, isLoadingStudent: true });
        try {
          const active = actor();
          if (
            active.role !== 'PARENT' ||
            active.schoolId !== schoolId ||
            active.id !== parentMembershipId
          ) {
            throw accessError('Parent membership ownership check failed.');
          }
          const response = await service.getParentChild(
            schoolId,
            parentMembershipId,
            studentId,
          );
          set({ isLoadingStudent: false, parentSelectedChild: response.data });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isLoadingStudent: false });
          return false;
        }
      },

      async loadSelfProfile(schoolId, studentMembershipId) {
        set({ error: null, isLoadingStudent: true });
        try {
          const active = actor();
          if (
            active.role !== 'STUDENT' ||
            active.schoolId !== schoolId ||
            active.id !== studentMembershipId
          ) {
            throw accessError('Student membership ownership check failed.');
          }
          const response = await service.getStudentSelfProfile(
            schoolId,
            studentMembershipId,
          );
          set({ isLoadingStudent: false, selfProfile: response.data });
          return true;
        } catch (value) {
          set({ error: normalizeError(value), isLoadingStudent: false });
          return false;
        }
      },

      clearFeedback() {
        set({ error: null, successMessage: null });
      },

      reset() {
        set({
          ...INITIAL_STUDENT_STATE,
          admissionDraft: createInitialAdmissionDraft(),
        });
      },
    };
  });
}

export const studentStore = createStudentStore({
  getMembership: () => authStore.getState().activeMembership,
  getPermissions: active => {
    const configuration = userManagementStore.getState().roleConfiguration;
    return getEffectivePermissions(
      active.role,
      configuration?.role === active.role &&
        configuration.schoolId === active.schoolId
        ? configuration
        : null,
    );
  },
  service: studentService,
});

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) {
    previousMembershipId = membershipId;
    studentStore.getState().reset();
  }
});

export function useStudentStore<T>(
  selector: (state: StudentStoreState) => T,
): T {
  return useStore(studentStore, selector);
}
