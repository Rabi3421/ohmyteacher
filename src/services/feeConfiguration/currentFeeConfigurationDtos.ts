export interface FeeHeadDto {
  id: number;
  school: number;
  name: string;
  frequency: 'monthly' | 'one_time';
  is_active: boolean;
  created_at: string;
}

export interface FeeHeadWriteRequestDto {
  name: string;
  frequency: 'monthly' | 'one_time';
}

export interface FeeStructureItemDto {
  id: number;
  school_class: number;
  fee_head: number;
  amount: string;
  is_mandatory: boolean;
  created_at: string;
}

export interface FeeStructureItemCreateRequestDto {
  school_class: number;
  fee_head: number;
  amount: string;
  is_mandatory: boolean;
}

export interface FeeStructureItemUpdateRequestDto {
  amount?: string;
  is_mandatory?: boolean;
}
