import type { ID } from './common';

export type FeeEntityStatus = 'ACTIVE' | 'INACTIVE';
export type FeeHeadType = 'RECURRING' | 'ONE_TIME';
export type FeeFrequency =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'YEARLY'
  | 'ONE_TIME';
export type FeeStructureStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type FeeApplicability =
  | 'ALL_STUDENTS'
  | 'OPTIONAL_SELECTION'
  | 'MANUAL_ASSIGNMENT';
export type FeeOverrideType = 'DEFAULT_AMOUNT' | 'CUSTOM_AMOUNT' | 'EXEMPT';
export type DiscountType = 'FIXED' | 'PERCENTAGE';
export type DiscountCategory =
  | 'SCHOLARSHIP'
  | 'SIBLING'
  | 'STAFF_CHILD'
  | 'MERIT'
  | 'MANUAL'
  | 'OTHER';
export type FineRuleType =
  | 'FIXED_AFTER_DUE'
  | 'DAILY_AFTER_DUE'
  | 'SLAB_BASED';

export type FeeDueRule =
  | { type: 'FIXED_DAY_OF_PERIOD'; day: number }
  | { type: 'FIXED_DATE'; date: string };

export interface FeeContext {
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
}

export interface FeeHead {
  id: ID;
  schoolId: ID;
  name: string;
  code: string;
  description?: string;
  type: FeeHeadType;
  defaultFrequency: FeeFrequency;
  mandatoryByDefault: boolean;
  refundable: boolean;
  displayOrder: number;
  status: FeeEntityStatus;
  activeStructureItemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureItem {
  id: ID;
  feeStructureId: ID;
  feeHeadId: ID;
  feeHeadName: string;
  amount: number;
  frequency: FeeFrequency;
  applicability: FeeApplicability;
  mandatory: boolean;
  dueRule: FeeDueRule;
  applicableMonths?: number[];
  installmentCount?: number;
  fineRuleId?: ID;
  displayOrder: number;
  status: FeeEntityStatus;
}

export interface FeeStructure {
  id: ID;
  schoolId: ID;
  branchId: ID;
  branchName: string;
  academicSessionId: ID;
  academicSessionName: string;
  classId: ID;
  className: string;
  name: string;
  description?: string;
  effectiveFrom: string;
  status: FeeStructureStatus;
  items: FeeStructureItem[];
  totalNominalAmount: number;
  assignedStudentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFeeItemSelection {
  feeStructureItemId: ID;
  selected: boolean;
  effectiveFrom: string;
}

export interface StudentFeeAmountOverride {
  id: ID;
  feeStructureItemId: ID;
  type: FeeOverrideType;
  customAmount?: number;
  reason?: string;
  effectiveFrom: string;
  createdAt: string;
}

export interface StudentDiscountAssignment {
  id: ID;
  studentFeeAssignmentId: ID;
  discountDefinitionId: ID;
  feeHeadIds: ID[];
  reason?: string;
  approvedByUserId: ID;
  effectiveFrom: string;
  effectiveTo?: string;
  status: FeeEntityStatus;
  createdAt: string;
}

export interface StudentFeeAssignment {
  id: ID;
  schoolId: ID;
  studentId: ID;
  enrollmentId: ID;
  feeStructureId: ID;
  optionalItemSelections: StudentFeeItemSelection[];
  amountOverrides: StudentFeeAmountOverride[];
  amountOverrideHistory?: StudentFeeAmountOverride[];
  discountAssignments: StudentDiscountAssignment[];
  discountAssignmentHistory?: StudentDiscountAssignment[];
  status: FeeEntityStatus;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountDefinition {
  id: ID;
  schoolId: ID;
  name: string;
  code: string;
  type: DiscountType;
  value: number;
  maximumAmount?: number;
  applicableFeeHeadIds: ID[];
  category: DiscountCategory;
  reasonRequired: boolean;
  startDate: string;
  endDate?: string;
  status: FeeEntityStatus;
  activeAssignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FineRuleSlab {
  fromDay: number;
  toDay?: number;
  amount: number;
}

export interface FineRule {
  id: ID;
  schoolId: ID;
  name: string;
  code: string;
  type: FineRuleType;
  graceDays: number;
  fixedAmount?: number;
  dailyAmount?: number;
  maximumAmount?: number;
  slabs?: FineRuleSlab[];
  status: FeeEntityStatus;
  activeUsageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveFeeLineItem {
  feeStructureItemId: ID;
  feeHeadId: ID;
  label: string;
  baseAmountPaise: number;
  effectiveAmountPaise: number;
  selected: boolean;
  exempt: boolean;
  overrideType: FeeOverrideType;
}

export interface EffectiveFeeDiscountLine {
  discountDefinitionId: ID;
  label: string;
  amountPaise: number;
}

export interface EffectiveFeePreview {
  title: 'Estimated Fee Configuration';
  currency: 'INR';
  grossAmountPaise: number;
  selectedOptionalAmountPaise: number;
  customOverrideDeltaPaise: number;
  exemptionAmountPaise: number;
  discountAmountPaise: number;
  netConfiguredAmountPaise: number;
  lineItems: EffectiveFeeLineItem[];
  discounts: EffectiveFeeDiscountLine[];
  estimatedFineRuleNames: string[];
}

export interface FeeSetupSummary {
  activeFeeHeads: number;
  classesWithStructure: number;
  classesWithoutStructure: number;
  studentsWithCustomAssignment: number;
  activeDiscountDefinitions: number;
  activeFineRules: number;
  enrollmentsWithoutAssignment: number;
  historicalInactiveHeadReferences: number;
}

export interface FeeHeadListQuery {
  search?: string;
  status?: FeeEntityStatus | 'ALL';
  type?: FeeHeadType | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface FeeStructureListQuery {
  search?: string;
  classId?: ID | 'ALL';
  status?: FeeStructureStatus | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface StudentFeeAssignmentListQuery {
  search?: string;
  classId?: ID | 'ALL';
  sectionId?: ID | 'ALL';
  assignmentStatus?: 'ASSIGNED' | 'UNASSIGNED' | 'ALL';
  optionalFeeHeadId?: ID | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface DiscountListQuery {
  search?: string;
  status?: FeeEntityStatus | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface FineRuleListQuery extends DiscountListQuery {}

export type CreateFeeHeadInput = Omit<
  FeeHead,
  'id' | 'schoolId' | 'activeStructureItemCount' | 'createdAt' | 'updatedAt'
>;
export type UpdateFeeHeadInput = CreateFeeHeadInput;

export type FeeStructureItemInput = Omit<
  FeeStructureItem,
  'id' | 'feeStructureId' | 'feeHeadName'
>;

export interface CreateFeeStructureInput {
  classId: ID;
  name: string;
  description?: string;
  effectiveFrom: string;
  status: Extract<FeeStructureStatus, 'DRAFT' | 'ACTIVE'>;
  items: FeeStructureItemInput[];
}
export type UpdateFeeStructureInput = CreateFeeStructureInput;

export interface CopyFeeStructureInput {
  sourceFeeStructureId: ID;
  targetBranchId: ID;
  targetAcademicSessionId: ID;
  targetClassId: ID;
  name: string;
  effectiveFrom: string;
}

export interface StudentFeeAssignmentSummary {
  studentId: ID;
  enrollmentId: ID;
  studentName: string;
  admissionNumber: string;
  rollNumber?: string;
  className: string;
  sectionName: string;
  feeStructureName?: string;
  effectivePayablePaise: number;
  selectedOptionalCount: number;
  discountCount: number;
  assignmentStatus: 'ASSIGNED' | 'UNASSIGNED';
  assignmentId?: ID;
}

export interface StudentFeeAssignmentDetails {
  summary: StudentFeeAssignmentSummary;
  assignment?: StudentFeeAssignment;
  feeStructure?: FeeStructure;
  preview?: EffectiveFeePreview;
  availableDiscounts: DiscountDefinition[];
}

export interface BulkAssignFeeStructureInput extends FeeContext {
  classId: ID;
  feeStructureId: ID;
  effectiveFrom: string;
}

export interface BulkAssignmentResult {
  assigned: number;
  skipped: number;
  failed: number;
  failedStudentIds: ID[];
}

export interface UpdateStudentFeeAssignmentInput {
  feeStructureId: ID;
  optionalItemSelections: StudentFeeItemSelection[];
  amountOverrides: Array<
    Omit<StudentFeeAmountOverride, 'id' | 'createdAt'>
  >;
  discountAssignments: Array<
    Omit<
      StudentDiscountAssignment,
      'id' | 'studentFeeAssignmentId' | 'approvedByUserId' | 'createdAt'
    >
  >;
  effectiveFrom: string;
  allowMandatoryExemption?: boolean;
  approvedByUserId: ID;
}

export type CreateDiscountDefinitionInput = Omit<
  DiscountDefinition,
  | 'id'
  | 'schoolId'
  | 'activeAssignmentCount'
  | 'createdAt'
  | 'updatedAt'
>;
export type UpdateDiscountDefinitionInput = CreateDiscountDefinitionInput;

export type CreateFineRuleInput = Omit<
  FineRule,
  'id' | 'schoolId' | 'activeUsageCount' | 'createdAt' | 'updatedAt'
>;
export type UpdateFineRuleInput = CreateFineRuleInput;

export interface StudentPayablePreviewInput {
  feeStructureId: ID;
  studentId: ID;
  enrollmentId: ID;
  optionalItemSelections: StudentFeeItemSelection[];
  amountOverrides: StudentFeeAmountOverride[];
  discountAssignments: StudentDiscountAssignment[];
  selectedMonths?: number[];
}

export interface FeeStructureDraft {
  step: 1 | 2 | 3 | 4;
  input: CreateFeeStructureInput;
}
