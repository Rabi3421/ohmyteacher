import type {
  BackendStudentStatus,
  CurrentStudent,
  CurrentStudentAdmissionInput,
  CurrentStudentListQuery,
  CurrentStudentUpdateInput,
} from '../../models/currentStudent';

export interface CurrentStudentService {
  getStudents(query?: CurrentStudentListQuery): Promise<CurrentStudent[]>;
  getStudent(studentId: string): Promise<CurrentStudent>;
  createAdmission(input: CurrentStudentAdmissionInput): Promise<CurrentStudent>;
  updateStudent(studentId: string, input: CurrentStudentUpdateInput): Promise<CurrentStudent>;
  updateStatus(studentId: string, status: BackendStudentStatus): Promise<CurrentStudent>;
  getMyChildren(): Promise<CurrentStudent[]>;
}
