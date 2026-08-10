import type {
  BackendStudentStatus,
  CurrentStudentAdmissionInput,
  CurrentStudentListQuery,
  CurrentStudentUpdateInput,
} from '../../models/currentStudent';
import { apiClient, type ApiClient } from '../api/apiClient';
import {
  mapAdmissionRequest,
  mapStudentUpdateRequest,
  parseCurrentStudent,
  parseCurrentStudentList,
  parseMyChildren,
  studentRequestId,
} from './currentStudentMapper';
import type { CurrentStudentService } from './currentStudentService';

type StudentClient = Pick<ApiClient, 'get' | 'patch' | 'post'>;

export class LiveCurrentStudentService implements CurrentStudentService {
  private readonly mutationLocks = new Map<string, Promise<unknown>>();

  constructor(private readonly client: StudentClient) {}

  private locked<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = this.mutationLocks.get(key);
    if (existing) return existing as Promise<T>;
    const pending = operation().finally(() => {
      if (this.mutationLocks.get(key) === pending) this.mutationLocks.delete(key);
    });
    this.mutationLocks.set(key, pending);
    return pending;
  }

  async getStudents(query: CurrentStudentListQuery = {}) {
    return parseCurrentStudentList(await this.client.get<unknown>('/students/', {
      query: {
        q: query.search?.trim() || undefined,
        school_class: query.classId ? studentRequestId(query.classId, 'classId') : undefined,
        status: query.status,
      },
    }));
  }

  async getStudent(studentId: string) {
    return parseCurrentStudent(await this.client.get<unknown>(`/students/${studentRequestId(studentId, 'studentId')}/`));
  }

  async createAdmission(input: CurrentStudentAdmissionInput) {
    return this.locked('admission:create', async () =>
      parseCurrentStudent(await this.client.post<unknown>('/students/', mapAdmissionRequest(input))),
    );
  }

  async updateStudent(studentId: string, input: CurrentStudentUpdateInput) {
    return this.locked(`student:${studentId}`, async () =>
      parseCurrentStudent(await this.client.patch<unknown>(`/students/${studentRequestId(studentId, 'studentId')}/`, mapStudentUpdateRequest(input))),
    );
  }

  async updateStatus(studentId: string, status: BackendStudentStatus) {
    return this.locked(`student:${studentId}`, async () =>
      parseCurrentStudent(await this.client.patch<unknown>(`/students/${studentRequestId(studentId, 'studentId')}/status/`, { status })),
    );
  }

  async getMyChildren() {
    return parseMyChildren(await this.client.get<unknown>('/my-children/'));
  }
}

export const liveCurrentStudentService = new LiveCurrentStudentService(apiClient);
