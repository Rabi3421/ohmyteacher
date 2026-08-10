import type { AcademicContext } from './academic';

export type CurrentFeeHeadFrequency = 'MONTHLY' | 'ONE_TIME';
export type CurrentFeeHeadStatus = 'ACTIVE' | 'INACTIVE';

export interface CurrentFeeHead {
  id: string;
  schoolId: string;
  name: string;
  frequency: CurrentFeeHeadFrequency;
  status: CurrentFeeHeadStatus;
  createdAt: string;
}

export interface CurrentFeeStructureItem {
  id: string;
  classId: string;
  feeHeadId: string;
  amountPaise: number;
  mandatory: boolean;
  createdAt: string;
}

/** Django's FeeStructure is an implicit one-to-one parent for SchoolClass. */
export interface CurrentClassFeeStructure extends AcademicContext {
  /** Stable route identity: the authoritative Django SchoolClass ID. */
  id: string;
  classId: string;
  className: string;
  classStatus: 'ACTIVE' | 'INACTIVE';
  items: CurrentFeeStructureItem[];
  totalPaise: number;
}

export interface CurrentFeeConfigurationSummary {
  activeFeeHeads: number;
  configuredClasses: number;
  unconfiguredClasses: number;
  structureItems: number;
}

export interface CreateCurrentFeeHeadInput {
  name: string;
  frequency: CurrentFeeHeadFrequency;
}

export type UpdateCurrentFeeHeadInput = CreateCurrentFeeHeadInput;

export interface CreateCurrentFeeStructureItemInput {
  classId: string;
  feeHeadId: string;
  amountPaise: number;
  mandatory: boolean;
}

export interface UpdateCurrentFeeStructureItemInput {
  amountPaise?: number;
  mandatory?: boolean;
}
