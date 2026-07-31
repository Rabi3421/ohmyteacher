import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  BulkAssignmentResult,
  BulkAssignFeeStructureInput,
  CopyFeeStructureInput,
  CreateDiscountDefinitionInput,
  CreateFeeHeadInput,
  CreateFeeStructureInput,
  CreateFineRuleInput,
  DiscountDefinition,
  DiscountListQuery,
  EffectiveFeePreview,
  FeeEntityStatus,
  FeeHead,
  FeeHeadListQuery,
  FeeSetupSummary,
  FeeStructure,
  FeeStructureListQuery,
  FeeStructureStatus,
  FineRule,
  FineRuleListQuery,
  StudentFeeAssignmentDetails,
  StudentFeeAssignmentListQuery,
  StudentFeeAssignmentSummary,
  StudentPayablePreviewInput,
  UpdateDiscountDefinitionInput,
  UpdateFeeHeadInput,
  UpdateFeeStructureInput,
  UpdateFineRuleInput,
  UpdateStudentFeeAssignmentInput,
} from '../../models/fee';

export interface FeeSetupService {
  getFeeSetupSummary(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
  ): Promise<ApiResponse<FeeSetupSummary>>;
  getFeeHeads(
    schoolId: string,
    query: FeeHeadListQuery,
  ): Promise<ApiResponse<PaginatedResponse<FeeHead>>>;
  getFeeHead(schoolId: string, feeHeadId: string): Promise<ApiResponse<FeeHead>>;
  createFeeHead(
    schoolId: string,
    input: CreateFeeHeadInput,
  ): Promise<ApiResponse<FeeHead>>;
  updateFeeHead(
    schoolId: string,
    feeHeadId: string,
    input: UpdateFeeHeadInput,
  ): Promise<ApiResponse<FeeHead>>;
  updateFeeHeadStatus(
    schoolId: string,
    feeHeadId: string,
    status: FeeEntityStatus,
  ): Promise<ApiResponse<FeeHead>>;
  getFeeStructures(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    query: FeeStructureListQuery,
  ): Promise<ApiResponse<PaginatedResponse<FeeStructure>>>;
  getFeeStructure(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    feeStructureId: string,
  ): Promise<ApiResponse<FeeStructure>>;
  createFeeStructure(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    input: CreateFeeStructureInput,
  ): Promise<ApiResponse<FeeStructure>>;
  updateFeeStructure(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    feeStructureId: string,
    input: UpdateFeeStructureInput,
  ): Promise<ApiResponse<FeeStructure>>;
  copyFeeStructure(
    schoolId: string,
    input: CopyFeeStructureInput,
  ): Promise<ApiResponse<FeeStructure>>;
  updateFeeStructureStatus(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    feeStructureId: string,
    status: FeeStructureStatus,
    replaceActive?: boolean,
  ): Promise<ApiResponse<FeeStructure>>;
  getStudentFeeAssignments(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    query: StudentFeeAssignmentListQuery,
  ): Promise<ApiResponse<PaginatedResponse<StudentFeeAssignmentSummary>>>;
  getStudentFeeAssignment(
    schoolId: string,
    studentId: string,
    enrollmentId: string,
  ): Promise<ApiResponse<StudentFeeAssignmentDetails>>;
  assignDefaultFeeStructure(
    schoolId: string,
    input: BulkAssignFeeStructureInput,
  ): Promise<ApiResponse<BulkAssignmentResult>>;
  updateStudentFeeAssignment(
    schoolId: string,
    studentId: string,
    enrollmentId: string,
    input: UpdateStudentFeeAssignmentInput,
  ): Promise<ApiResponse<StudentFeeAssignmentDetails>>;
  getDiscountDefinitions(
    schoolId: string,
    query?: DiscountListQuery,
  ): Promise<ApiResponse<PaginatedResponse<DiscountDefinition>>>;
  getDiscountDefinition(
    schoolId: string,
    discountId: string,
  ): Promise<ApiResponse<DiscountDefinition>>;
  createDiscountDefinition(
    schoolId: string,
    input: CreateDiscountDefinitionInput,
  ): Promise<ApiResponse<DiscountDefinition>>;
  updateDiscountDefinition(
    schoolId: string,
    discountId: string,
    input: UpdateDiscountDefinitionInput,
  ): Promise<ApiResponse<DiscountDefinition>>;
  updateDiscountStatus(
    schoolId: string,
    discountId: string,
    status: FeeEntityStatus,
    force?: boolean,
  ): Promise<ApiResponse<DiscountDefinition>>;
  getFineRules(
    schoolId: string,
    query?: FineRuleListQuery,
  ): Promise<ApiResponse<PaginatedResponse<FineRule>>>;
  getFineRule(
    schoolId: string,
    fineRuleId: string,
  ): Promise<ApiResponse<FineRule>>;
  createFineRule(
    schoolId: string,
    input: CreateFineRuleInput,
  ): Promise<ApiResponse<FineRule>>;
  updateFineRule(
    schoolId: string,
    fineRuleId: string,
    input: UpdateFineRuleInput,
  ): Promise<ApiResponse<FineRule>>;
  updateFineRuleStatus(
    schoolId: string,
    fineRuleId: string,
    status: FeeEntityStatus,
  ): Promise<ApiResponse<FineRule>>;
  previewStudentPayable(
    schoolId: string,
    input: StudentPayablePreviewInput,
  ): Promise<ApiResponse<EffectiveFeePreview>>;
}
