export interface AcademicSessionDto {
  id: number;
  school: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface SchoolClassDto {
  id: number;
  branch: number;
  session: number;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface SectionDto {
  id: number;
  school_class: number;
  name: string;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
}

export interface SubjectDto {
  id: number;
  school: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface TeacherAssignmentDto {
  id: number;
  school_class: number;
  subject: number;
  teacher: number;
  created_at: string;
}

export interface CreateSessionRequestDto {
  name: string;
  start_date: string;
  end_date: string;
}

export interface CreateClassRequestDto {
  branch: number;
  session: number;
  name: string;
  display_order: number;
}

export interface CreateSectionRequestDto {
  school_class: number;
  name: string;
  capacity?: number;
}

export interface CreateSubjectRequestDto {
  name: string;
  code: string;
}

export interface CreateTeacherAssignmentRequestDto {
  school_class: number;
  subject: number;
  teacher: number;
}
