import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { UserMembership } from '../../models/auth';
import type { BackendStudentStatus, CurrentStudent, CurrentStudentAdmissionInput, CurrentStudentListQuery, CurrentStudentUpdateInput } from '../../models/currentStudent';
import type { ApiError } from '../../services/api/apiError';
import { ApiClientError } from '../../services/api/apiError';
import type { CurrentStudentService } from '../../services/student/currentStudentService';
import { liveCurrentStudentService } from '../../services/student/liveCurrentStudentService';
import { mapCurrentStudentFieldErrors } from '../../services/student/currentStudentMapper';
import { authStore } from '../auth/authStore';

export interface CurrentStudentState {
  items: CurrentStudent[];
  current: CurrentStudent | null;
  myChildren: CurrentStudent[];
  query: CurrentStudentListQuery;
  isLoading: boolean;
  isSaving: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

export interface CurrentStudentActions {
  setQuery(query: Partial<CurrentStudentListQuery>): void;
  loadStudents(): Promise<boolean>;
  loadStudent(studentId: string): Promise<boolean>;
  createAdmission(input: CurrentStudentAdmissionInput): Promise<CurrentStudent | null>;
  updateStudent(studentId: string, input: CurrentStudentUpdateInput): Promise<boolean>;
  updateStatus(studentId: string, status: BackendStudentStatus): Promise<boolean>;
  loadMyChildren(): Promise<boolean>;
  clearFeedback(): void;
  reset(): void;
}

export type CurrentStudentStoreState = CurrentStudentState & CurrentStudentActions;

interface Dependencies {
  service: CurrentStudentService;
  getMembership: () => UserMembership | null;
}

export const INITIAL_CURRENT_STUDENT_STATE: CurrentStudentState = {
  current: null,
  error: null,
  isLoading: false,
  isSaving: false,
  items: [],
  myChildren: [],
  query: {},
  successMessage: null,
};

function normalizeError(value: unknown): ApiError {
  if (value instanceof ApiClientError) return { code: value.code, fieldErrors: mapCurrentStudentFieldErrors(value.fieldErrors), message: value.message, status: value.status };
  return { code: 'UNEXPECTED_STUDENT_ERROR', message: value instanceof Error ? value.message : 'Something went wrong. Please try again.' };
}

function accessError(message: string): ApiClientError {
  return new ApiClientError({ code: 'STUDENT_ACCESS_DENIED', kind: 'permission', message, status: 403 });
}

export function createCurrentStudentStore({ getMembership, service }: Dependencies): StoreApi<CurrentStudentStoreState> {
  return createStore<CurrentStudentStoreState>((set, get) => {
    const membership = () => {
      const active = getMembership();
      if (!active || active.status !== 'ACTIVE') throw accessError('An active school membership is required.');
      return active;
    };
    const requireManager = () => {
      const active = membership();
      if (active.role !== 'SCHOOL_ADMIN' && active.role !== 'BRANCH_ADMIN') throw accessError('Only School Admin or Branch Admin can manage students.');
      if (active.role === 'BRANCH_ADMIN' && !active.branchId) throw accessError('Branch Admin requires an assigned Branch.');
      return active;
    };
    const replace = (student: CurrentStudent) => set(state => ({ current: student, items: state.items.map(item => item.id === student.id ? student : item) }));

    return {
      ...INITIAL_CURRENT_STUDENT_STATE,
      setQuery(query) { set(state => ({ query: { ...state.query, ...query } })); },
      async loadStudents() {
        set({ error: null, isLoading: true });
        try { requireManager(); set({ isLoading: false, items: await service.getStudents(get().query) }); return true; }
        catch (value) { set({ error: normalizeError(value), isLoading: false }); return false; }
      },
      async loadStudent(studentId) {
        set({ error: null, isLoading: true });
        try { requireManager(); set({ current: await service.getStudent(studentId), isLoading: false }); return true; }
        catch (value) { set({ error: normalizeError(value), isLoading: false }); return false; }
      },
      async createAdmission(input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          requireManager();
          const student = await service.createAdmission(input);
          set(state => ({ current: student, isSaving: false, items: [student, ...state.items.filter(item => item.id !== student.id)], successMessage: 'Student admitted and parent login linked.' }));
          return student;
        } catch (value) { set({ error: normalizeError(value), isSaving: false }); return null; }
      },
      async updateStudent(studentId, input) {
        set({ error: null, isSaving: true, successMessage: null });
        try { requireManager(); replace(await service.updateStudent(studentId, input)); set({ isSaving: false, successMessage: 'Student record updated.' }); return true; }
        catch (value) { set({ error: normalizeError(value), isSaving: false }); return false; }
      },
      async updateStatus(studentId, status) {
        set({ error: null, isSaving: true, successMessage: null });
        try { requireManager(); replace(await service.updateStatus(studentId, status)); set({ isSaving: false, successMessage: 'Student status updated.' }); return true; }
        catch (value) { set({ error: normalizeError(value), isSaving: false }); return false; }
      },
      async loadMyChildren() {
        set({ error: null, isLoading: true });
        try {
          const active = membership();
          if (active.role !== 'PARENT') throw accessError('This record is available only to the linked parent login.');
          set({ isLoading: false, myChildren: await service.getMyChildren() });
          return true;
        } catch (value) { set({ error: normalizeError(value), isLoading: false }); return false; }
      },
      clearFeedback() { set({ error: null, successMessage: null }); },
      reset() { set(INITIAL_CURRENT_STUDENT_STATE); },
    };
  });
}

export const currentStudentStore = createCurrentStudentStore({ getMembership: () => authStore.getState().activeMembership, service: liveCurrentStudentService });

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) { previousMembershipId = membershipId; currentStudentStore.getState().reset(); }
});

export function useCurrentStudentStore<T>(selector: (state: CurrentStudentStoreState) => T): T {
  return useStore(currentStudentStore, selector);
}
