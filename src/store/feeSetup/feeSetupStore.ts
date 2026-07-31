import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PermissionKey } from '../../constants/userPermissions';
import type { UserMembership } from '../../models/auth';
import type { PaginatedResponse } from '../../models/common';
import type {
  BulkAssignFeeStructureInput,
  CreateDiscountDefinitionInput,
  CreateFeeHeadInput,
  CreateFineRuleInput,
  DiscountDefinition,
  DiscountListQuery,
  EffectiveFeePreview,
  FeeContext,
  FeeHead,
  FeeHeadListQuery,
  FeeSetupSummary,
  FeeStructure,
  FeeStructureDraft,
  FeeStructureListQuery,
  FineRule,
  FineRuleListQuery,
  StudentFeeAssignmentDetails,
  StudentFeeAssignmentListQuery,
  StudentFeeAssignmentSummary,
  StudentPayablePreviewInput,
  UpdateStudentFeeAssignmentInput,
} from '../../models/fee';
import type { AcademicSessionStatus } from '../../models/organization';
import { ApiClientError, type ApiError } from '../../services/api/apiError';
import type { FeeSetupService } from '../../services/feeSetup/feeSetupService';
import { feeSetupService } from '../../services/feeSetup/feeSetupServiceResolver';
import {
  canApplyAmountOverride,
  canApplyExemption,
  canManageDiscountDefinitions,
  canManageFeeHeads,
  canManageFineRules,
  canManageFeeStructures,
  canManageStudentFeeAssignments,
  canViewFeeSetup,
} from '../../utils/feePermissions';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { authStore } from '../auth/authStore';
import { userManagementStore } from '../userManagement/userManagementStore';

const page = <T>(): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
});

export function createFeeStructureDraft(): FeeStructureDraft {
  return {
    input: {
      classId: '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      items: [],
      name: '',
      status: 'DRAFT',
    },
    step: 1,
  };
}

export interface FeeSetupState {
  context: FeeContext | null;
  sessionStatus?: AcademicSessionStatus;
  summary: FeeSetupSummary | null;
  feeHeads: PaginatedResponse<FeeHead>;
  feeHeadQuery: FeeHeadListQuery;
  currentFeeHead: FeeHead | null;
  feeStructures: PaginatedResponse<FeeStructure>;
  structureQuery: FeeStructureListQuery;
  currentFeeStructure: FeeStructure | null;
  structureDraft: FeeStructureDraft;
  assignments: PaginatedResponse<StudentFeeAssignmentSummary>;
  assignmentQuery: StudentFeeAssignmentListQuery;
  currentAssignment: StudentFeeAssignmentDetails | null;
  discounts: PaginatedResponse<DiscountDefinition>;
  discountQuery: DiscountListQuery;
  currentDiscount: DiscountDefinition | null;
  fineRules: PaginatedResponse<FineRule>;
  fineRuleQuery: FineRuleListQuery;
  currentFineRule: FineRule | null;
  payablePreview: EffectiveFeePreview | null;
  isLoadingFeeHeads: boolean;
  isSavingFeeHead: boolean;
  isLoadingStructures: boolean;
  isSavingStructure: boolean;
  isCopyingStructure: boolean;
  isLoadingAssignments: boolean;
  isBulkAssigning: boolean;
  isSavingStudentAssignment: boolean;
  isLoadingDiscounts: boolean;
  isSavingDiscount: boolean;
  isLoadingFineRules: boolean;
  isSavingFineRule: boolean;
  isPreviewingPayable: boolean;
  isLoadingSummary: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

export interface FeeSetupActions {
  setContext: (
    context: FeeContext | null,
    sessionStatus?: AcademicSessionStatus,
  ) => void;
  setFeeHeadQuery: (query: Partial<FeeHeadListQuery>) => void;
  loadSummary: () => Promise<void>;
  loadFeeHeads: () => Promise<void>;
  loadFeeHead: (id: string) => Promise<boolean>;
  saveFeeHead: (input: CreateFeeHeadInput, id?: string) => Promise<boolean>;
  updateFeeHeadStatus: (
    id: string,
    status: FeeHead['status'],
  ) => Promise<boolean>;
  setStructureQuery: (query: Partial<FeeStructureListQuery>) => void;
  loadStructures: () => Promise<void>;
  loadStructure: (id: string) => Promise<boolean>;
  updateStructureDraft: (draft: Partial<FeeStructureDraft>) => void;
  resetStructureDraft: () => void;
  saveStructure: (id?: string) => Promise<FeeStructure | null>;
  copyStructure: (
    input: Parameters<FeeSetupService['copyFeeStructure']>[1],
  ) => Promise<FeeStructure | null>;
  updateStructureStatus: (
    id: string,
    status: FeeStructure['status'],
    replaceActive?: boolean,
  ) => Promise<boolean>;
  setAssignmentQuery: (
    query: Partial<StudentFeeAssignmentListQuery>,
  ) => void;
  loadAssignments: () => Promise<void>;
  loadAssignment: (
    studentId: string,
    enrollmentId: string,
  ) => Promise<boolean>;
  bulkAssign: (input: BulkAssignFeeStructureInput) => Promise<boolean>;
  saveAssignment: (
    studentId: string,
    enrollmentId: string,
    input: UpdateStudentFeeAssignmentInput,
  ) => Promise<boolean>;
  previewPayable: (input: StudentPayablePreviewInput) => Promise<boolean>;
  setDiscountQuery: (query: Partial<DiscountListQuery>) => void;
  loadDiscounts: () => Promise<void>;
  loadDiscount: (id: string) => Promise<boolean>;
  saveDiscount: (
    input: CreateDiscountDefinitionInput,
    id?: string,
  ) => Promise<boolean>;
  updateDiscountStatus: (
    id: string,
    status: DiscountDefinition['status'],
    force?: boolean,
  ) => Promise<boolean>;
  setFineRuleQuery: (query: Partial<FineRuleListQuery>) => void;
  loadFineRules: () => Promise<void>;
  loadFineRule: (id: string) => Promise<boolean>;
  saveFineRule: (input: CreateFineRuleInput, id?: string) => Promise<boolean>;
  updateFineRuleStatus: (
    id: string,
    status: FineRule['status'],
  ) => Promise<boolean>;
  clearFeedback: () => void;
  reset: () => void;
}

export type FeeSetupStoreState = FeeSetupState & FeeSetupActions;

interface Dependencies {
  service: FeeSetupService;
  getMembership: () => UserMembership | null;
  getPermissions: (membership: UserMembership) => readonly PermissionKey[];
}

export const INITIAL_FEE_SETUP_STATE: FeeSetupState = {
  assignmentQuery: {
    assignmentStatus: 'ALL',
    classId: 'ALL',
    page: 1,
    pageSize: 20,
    sectionId: 'ALL',
  },
  assignments: page<StudentFeeAssignmentSummary>(),
  context: null,
  currentAssignment: null,
  currentDiscount: null,
  currentFeeHead: null,
  currentFeeStructure: null,
  currentFineRule: null,
  discountQuery: { page: 1, pageSize: 20, status: 'ALL' },
  discounts: page<DiscountDefinition>(),
  error: null,
  feeHeadQuery: { page: 1, pageSize: 20, status: 'ALL', type: 'ALL' },
  feeHeads: page<FeeHead>(),
  feeStructures: page<FeeStructure>(),
  fineRuleQuery: { page: 1, pageSize: 20, status: 'ALL' },
  fineRules: page<FineRule>(),
  isBulkAssigning: false,
  isCopyingStructure: false,
  isLoadingAssignments: false,
  isLoadingDiscounts: false,
  isLoadingFeeHeads: false,
  isLoadingFineRules: false,
  isLoadingStructures: false,
  isLoadingSummary: false,
  isPreviewingPayable: false,
  isSavingDiscount: false,
  isSavingFeeHead: false,
  isSavingFineRule: false,
  isSavingStructure: false,
  isSavingStudentAssignment: false,
  payablePreview: null,
  structureDraft: createFeeStructureDraft(),
  structureQuery: { classId: 'ALL', page: 1, pageSize: 20, status: 'ALL' },
  successMessage: null,
  summary: null,
};

function normalizeError(value: unknown): ApiError {
  return value instanceof ApiClientError
    ? {
        code: value.code,
        fieldErrors: value.fieldErrors,
        message: value.message,
        status: value.status,
      }
    : { code: 'UNEXPECTED_ERROR', message: 'Something went wrong. Try again.' };
}

const denied = (message: string) =>
  new ApiClientError({ code: 'FEE_SETUP_ACCESS_DENIED', message, status: 403 });

export function createFeeSetupStore({
  service,
  getMembership,
  getPermissions,
}: Dependencies): StoreApi<FeeSetupStoreState> {
  return createStore<FeeSetupStoreState>()((set, get) => {
    const actor = () => {
      const membership = getMembership();
      if (!membership) throw denied('Select a valid workspace.');
      return membership;
    };
    const selected = () => {
      const value = get().context;
      if (!value) throw denied('Select a Fee Setup context.');
      return value;
    };
    const authorize = (
      predicate: (
        active: UserMembership,
        permissions: readonly PermissionKey[],
      ) => boolean,
      message: string,
    ) => {
      const active = actor();
      if (!predicate(active, getPermissions(active))) throw denied(message);
      return active;
    };
    const view = () => {
      const value = selected();
      authorize(
        (active, permissions) =>
          canViewFeeSetup(
            active,
            permissions,
            value.schoolId,
            value.branchId,
          ),
        'You cannot view Fee Setup in this context.',
      );
      return value;
    };
    const manageStructure = () => {
      const value = view();
      authorize(
        (active, permissions) =>
          canManageFeeStructures(
            active,
            permissions,
            value.schoolId,
            value.branchId,
            get().sessionStatus,
          ),
        get().sessionStatus === 'CLOSED'
          ? 'Closed sessions are strictly read-only.'
          : 'You cannot manage Fee Structures.',
      );
      return value;
    };
    const manageAssignment = () => {
      const value = view();
      authorize(
        (active, permissions) =>
          canManageStudentFeeAssignments(
            active,
            permissions,
            value.schoolId,
            value.branchId,
            get().sessionStatus,
          ),
        get().sessionStatus === 'CLOSED'
          ? 'Closed sessions are strictly read-only.'
          : 'You cannot manage Student Fee Assignments.',
      );
      return value;
    };
    const sameContext = (value: FeeContext) => {
      const current = get().context;
      return (
        current?.schoolId === value.schoolId &&
        current.branchId === value.branchId &&
        current.academicSessionId === value.academicSessionId
      );
    };

    return {
      ...INITIAL_FEE_SETUP_STATE,
      setContext(context, sessionStatus) {
        const previous = get().context;
        if (
          previous?.schoolId === context?.schoolId &&
          previous?.branchId === context?.branchId &&
          previous?.academicSessionId === context?.academicSessionId &&
          get().sessionStatus === sessionStatus
        ) {
          return;
        }
        const schoolChanged = previous?.schoolId !== context?.schoolId;
        set(state => ({
          ...(schoolChanged ? INITIAL_FEE_SETUP_STATE : state),
          assignments: page<StudentFeeAssignmentSummary>(),
          context,
          currentAssignment: null,
          currentFeeStructure: null,
          error: null,
          feeStructures: page<FeeStructure>(),
          payablePreview: null,
          sessionStatus,
          structureDraft: createFeeStructureDraft(),
          summary: null,
        }));
      },
      setFeeHeadQuery(query) {
        set(state => ({ feeHeadQuery: { ...state.feeHeadQuery, ...query } }));
      },
      async loadSummary() {
        set({ error: null, isLoadingSummary: true });
        try {
          const value = view();
          const response = await service.getFeeSetupSummary(
            value.schoolId,
            value.branchId,
            value.academicSessionId,
          );
          if (!sameContext(value)) return;
          set({ isLoadingSummary: false, summary: response.data });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingSummary: false });
        }
      },
      async loadFeeHeads() {
        set({ error: null, isLoadingFeeHeads: true });
        try {
          const value = view();
          const response = await service.getFeeHeads(
            value.schoolId,
            get().feeHeadQuery,
          );
          if (get().context?.schoolId !== value.schoolId) return;
          set({ feeHeads: response.data, isLoadingFeeHeads: false });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingFeeHeads: false });
        }
      },
      async loadFeeHead(id) {
        set({ error: null, isLoadingFeeHeads: true });
        try {
          const value = view();
          const response = await service.getFeeHead(value.schoolId, id);
          if (get().context?.schoolId !== value.schoolId) return false;
          set({ currentFeeHead: response.data, isLoadingFeeHeads: false });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoadingFeeHeads: false });
          return false;
        }
      },
      async saveFeeHead(input, id) {
        if (get().isSavingFeeHead) return false;
        set({ error: null, isSavingFeeHead: true });
        try {
          const value = selected();
          authorize(
            (active, permissions) =>
              canManageFeeHeads(
                active,
                permissions,
                value.schoolId,
                get().sessionStatus,
              ),
            'Only school-level Fee Setup managers can change Fee Heads.',
          );
          const response = id
            ? await service.updateFeeHead(value.schoolId, id, input)
            : await service.createFeeHead(value.schoolId, input);
          set({
            currentFeeHead: response.data,
            isSavingFeeHead: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingFeeHead: false });
          return false;
        }
      },
      async updateFeeHeadStatus(id, status) {
        if (get().isSavingFeeHead) return false;
        set({ error: null, isSavingFeeHead: true });
        try {
          const value = selected();
          authorize(
            (active, permissions) =>
              canManageFeeHeads(
                active,
                permissions,
                value.schoolId,
                get().sessionStatus,
              ),
            'You cannot change Fee Head status.',
          );
          const response = await service.updateFeeHeadStatus(
            value.schoolId,
            id,
            status,
          );
          set({
            currentFeeHead: response.data,
            isSavingFeeHead: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingFeeHead: false });
          return false;
        }
      },
      setStructureQuery(query) {
        set(state => ({
          structureQuery: { ...state.structureQuery, ...query },
        }));
      },
      async loadStructures() {
        set({ error: null, isLoadingStructures: true });
        try {
          const value = view();
          const response = await service.getFeeStructures(
            value.schoolId,
            value.branchId,
            value.academicSessionId,
            get().structureQuery,
          );
          if (!sameContext(value)) return;
          set({ feeStructures: response.data, isLoadingStructures: false });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingStructures: false });
        }
      },
      async loadStructure(id) {
        set({ error: null, isLoadingStructures: true });
        try {
          const value = view();
          const response = await service.getFeeStructure(
            value.schoolId,
            value.branchId,
            value.academicSessionId,
            id,
          );
          if (!sameContext(value)) return false;
          set({
            currentFeeStructure: response.data,
            isLoadingStructures: false,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoadingStructures: false });
          return false;
        }
      },
      updateStructureDraft(draft) {
        set(state => ({
          structureDraft: { ...state.structureDraft, ...draft },
        }));
      },
      resetStructureDraft() {
        set({ structureDraft: createFeeStructureDraft() });
      },
      async saveStructure(id) {
        if (get().isSavingStructure) return null;
        set({ error: null, isSavingStructure: true });
        try {
          const value = manageStructure();
          const input = get().structureDraft.input;
          const response = id
            ? await service.updateFeeStructure(
                value.schoolId,
                value.branchId,
                value.academicSessionId,
                id,
                input,
              )
            : await service.createFeeStructure(
                value.schoolId,
                value.branchId,
                value.academicSessionId,
                input,
              );
          set({
            currentFeeStructure: response.data,
            isSavingStructure: false,
            structureDraft: createFeeStructureDraft(),
            successMessage: response.message,
          });
          return response.data;
        } catch (error) {
          set({ error: normalizeError(error), isSavingStructure: false });
          return null;
        }
      },
      async copyStructure(input) {
        if (get().isCopyingStructure) return null;
        set({ error: null, isCopyingStructure: true });
        try {
          manageStructure();
          const response = await service.copyFeeStructure(
            selected().schoolId,
            input,
          );
          set({
            currentFeeStructure: response.data,
            isCopyingStructure: false,
            successMessage: response.message,
          });
          return response.data;
        } catch (error) {
          set({ error: normalizeError(error), isCopyingStructure: false });
          return null;
        }
      },
      async updateStructureStatus(id, status, replaceActive) {
        if (get().isSavingStructure) return false;
        set({ error: null, isSavingStructure: true });
        try {
          const value = manageStructure();
          const response = await service.updateFeeStructureStatus(
            value.schoolId,
            value.branchId,
            value.academicSessionId,
            id,
            status,
            replaceActive,
          );
          set({
            currentFeeStructure: response.data,
            isSavingStructure: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingStructure: false });
          return false;
        }
      },
      setAssignmentQuery(query) {
        set(state => ({
          assignmentQuery: { ...state.assignmentQuery, ...query },
        }));
      },
      async loadAssignments() {
        set({ error: null, isLoadingAssignments: true });
        try {
          const value = view();
          const response = await service.getStudentFeeAssignments(
            value.schoolId,
            value.branchId,
            value.academicSessionId,
            get().assignmentQuery,
          );
          if (!sameContext(value)) return;
          set({ assignments: response.data, isLoadingAssignments: false });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingAssignments: false });
        }
      },
      async loadAssignment(studentId, enrollmentId) {
        set({ error: null, isLoadingAssignments: true });
        try {
          const value = view();
          const response = await service.getStudentFeeAssignment(
            value.schoolId,
            studentId,
            enrollmentId,
          );
          set({
            currentAssignment: response.data,
            isLoadingAssignments: false,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoadingAssignments: false });
          return false;
        }
      },
      async bulkAssign(input) {
        if (get().isBulkAssigning) return false;
        set({ error: null, isBulkAssigning: true });
        try {
          manageAssignment();
          const response = await service.assignDefaultFeeStructure(
            input.schoolId,
            input,
          );
          set({
            isBulkAssigning: false,
            successMessage: `${response.message} Assigned ${response.data.assigned}, skipped ${response.data.skipped}, failed ${response.data.failed}.`,
          });
          await get().loadAssignments();
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isBulkAssigning: false });
          return false;
        }
      },
      async saveAssignment(studentId, enrollmentId, input) {
        if (get().isSavingStudentAssignment) return false;
        set({ error: null, isSavingStudentAssignment: true });
        try {
          const value = manageAssignment();
          if (
            input.amountOverrides.some(item => item.type === 'CUSTOM_AMOUNT')
          ) {
            authorize(
              (active, permissions) =>
                canApplyAmountOverride(
                  active,
                  permissions,
                  value.schoolId,
                  value.branchId,
                  get().sessionStatus,
                ),
              'You cannot apply student-specific amount overrides.',
            );
          }
          const mandatoryExemption = input.amountOverrides.some(
            item => item.type === 'EXEMPT',
          );
          const active = actor();
          const allowedExemption =
            !mandatoryExemption ||
            canApplyExemption(
              active,
              getPermissions(active),
              value.schoolId,
              value.branchId,
              get().sessionStatus,
            );
          const response = await service.updateStudentFeeAssignment(
            value.schoolId,
            studentId,
            enrollmentId,
            { ...input, allowMandatoryExemption: allowedExemption },
          );
          set({
            currentAssignment: response.data,
            isSavingStudentAssignment: false,
            payablePreview: response.data.preview ?? null,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({
            error: normalizeError(error),
            isSavingStudentAssignment: false,
          });
          return false;
        }
      },
      async previewPayable(input) {
        set({ error: null, isPreviewingPayable: true });
        try {
          const value = view();
          const response = await service.previewStudentPayable(
            value.schoolId,
            input,
          );
          set({
            isPreviewingPayable: false,
            payablePreview: response.data,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isPreviewingPayable: false });
          return false;
        }
      },
      setDiscountQuery(query) {
        set(state => ({ discountQuery: { ...state.discountQuery, ...query } }));
      },
      async loadDiscounts() {
        set({ error: null, isLoadingDiscounts: true });
        try {
          const value = view();
          const response = await service.getDiscountDefinitions(
            value.schoolId,
            get().discountQuery,
          );
          if (get().context?.schoolId !== value.schoolId) return;
          set({ discounts: response.data, isLoadingDiscounts: false });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingDiscounts: false });
        }
      },
      async loadDiscount(id) {
        set({ error: null, isLoadingDiscounts: true });
        try {
          const value = view();
          const response = await service.getDiscountDefinition(
            value.schoolId,
            id,
          );
          set({ currentDiscount: response.data, isLoadingDiscounts: false });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoadingDiscounts: false });
          return false;
        }
      },
      async saveDiscount(input, id) {
        if (get().isSavingDiscount) return false;
        set({ error: null, isSavingDiscount: true });
        try {
          const value = selected();
          authorize(
            (active, permissions) =>
              canManageDiscountDefinitions(
                active,
                permissions,
                value.schoolId,
                get().sessionStatus,
              ),
            'You cannot manage Discount Definitions.',
          );
          const response = id
            ? await service.updateDiscountDefinition(value.schoolId, id, input)
            : await service.createDiscountDefinition(value.schoolId, input);
          set({
            currentDiscount: response.data,
            isSavingDiscount: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingDiscount: false });
          return false;
        }
      },
      async updateDiscountStatus(id, status, force) {
        if (get().isSavingDiscount) return false;
        set({ error: null, isSavingDiscount: true });
        try {
          const value = selected();
          authorize(
            (active, permissions) =>
              canManageDiscountDefinitions(
                active,
                permissions,
                value.schoolId,
                get().sessionStatus,
              ),
            'You cannot manage Discount Definitions.',
          );
          const response = await service.updateDiscountStatus(
            value.schoolId,
            id,
            status,
            force,
          );
          set({
            currentDiscount: response.data,
            isSavingDiscount: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingDiscount: false });
          return false;
        }
      },
      setFineRuleQuery(query) {
        set(state => ({ fineRuleQuery: { ...state.fineRuleQuery, ...query } }));
      },
      async loadFineRules() {
        set({ error: null, isLoadingFineRules: true });
        try {
          const value = view();
          const response = await service.getFineRules(
            value.schoolId,
            get().fineRuleQuery,
          );
          if (get().context?.schoolId !== value.schoolId) return;
          set({ fineRules: response.data, isLoadingFineRules: false });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingFineRules: false });
        }
      },
      async loadFineRule(id) {
        set({ error: null, isLoadingFineRules: true });
        try {
          const value = view();
          const response = await service.getFineRule(value.schoolId, id);
          set({ currentFineRule: response.data, isLoadingFineRules: false });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoadingFineRules: false });
          return false;
        }
      },
      async saveFineRule(input, id) {
        if (get().isSavingFineRule) return false;
        set({ error: null, isSavingFineRule: true });
        try {
          const value = selected();
          authorize(
            (active, permissions) =>
              canManageFineRules(
                active,
                permissions,
                value.schoolId,
                get().sessionStatus,
              ),
            'You cannot manage Fine Rules.',
          );
          const response = id
            ? await service.updateFineRule(value.schoolId, id, input)
            : await service.createFineRule(value.schoolId, input);
          set({
            currentFineRule: response.data,
            isSavingFineRule: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingFineRule: false });
          return false;
        }
      },
      async updateFineRuleStatus(id, status) {
        if (get().isSavingFineRule) return false;
        set({ error: null, isSavingFineRule: true });
        try {
          const value = selected();
          authorize(
            (active, permissions) =>
              canManageFineRules(
                active,
                permissions,
                value.schoolId,
                get().sessionStatus,
              ),
            'You cannot manage Fine Rules.',
          );
          const response = await service.updateFineRuleStatus(
            value.schoolId,
            id,
            status,
          );
          set({
            currentFineRule: response.data,
            isSavingFineRule: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingFineRule: false });
          return false;
        }
      },
      clearFeedback() {
        set({ error: null, successMessage: null });
      },
      reset() {
        set({
          ...INITIAL_FEE_SETUP_STATE,
          structureDraft: createFeeStructureDraft(),
        });
      },
    };
  });
}

export const feeSetupStore = createFeeSetupStore({
  getMembership: () => authStore.getState().activeMembership,
  getPermissions: membership => {
    const configuration = userManagementStore.getState().roleConfiguration;
    return getEffectivePermissions(
      membership.role,
      configuration?.role === membership.role &&
        configuration.schoolId === membership.schoolId
        ? configuration
        : null,
    );
  },
  service: feeSetupService,
});

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) {
    previousMembershipId = membershipId;
    feeSetupStore.getState().reset();
  }
});

export function useFeeSetupStore<T>(
  selector: (state: FeeSetupStoreState) => T,
): T {
  return useStore(feeSetupStore, selector);
}
