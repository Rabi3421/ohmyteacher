export interface CurrentStudentDto {
  id: number;
  branch: number;
  school_class: number;
  section: number;
  admission_number: string;
  roll_number: string;
  name: string;
  date_of_birth: string | null;
  gender: string;
  admission_date: string;
  status: string;
  parent_name: string;
  parent_phone_number: string;
  parent_email: string;
  address: string;
  created_at: string;
}

export interface CurrentStudentAdmissionRequestDto {
  school_class: number;
  section: number;
  roll_number?: string;
  name: string;
  date_of_birth?: string | null;
  gender?: string;
  parent_name?: string;
  parent_phone_number: string;
  parent_email?: string;
  address?: string;
}
