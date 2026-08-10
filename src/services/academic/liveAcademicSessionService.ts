import type { ApiResponse } from '../../models/common';
import type {
  AcademicSession,
  CreateAcademicSessionInput,
  UpdateAcademicSessionInput,
} from '../../models/organization';
import { apiClient, type ApiClient } from '../api/apiClient';
import { ApiClientError, createUnsupportedOperationError } from '../api/apiError';
import { mapSessionRequest, parseSession, parseSessionList, requestId } from './academicMapper';

type SessionApiClient = Pick<ApiClient, 'get' | 'patch' | 'post'>;

function success<T>(data: T, message: string): ApiResponse<T> {
  return { data, message, success: true };
}

function inSchool(session: AcademicSession, schoolId: string): AcademicSession {
  if (session.schoolId !== schoolId) {
    throw new ApiClientError({
      code: 'ACADEMIC_SCHOOL_MISMATCH',
      kind: 'not-found',
      message: 'The academic session is outside the selected school.',
      status: 404,
    });
  }
  return session;
}

export class LiveAcademicSessionService {
  constructor(private readonly client: SessionApiClient) {}

  async getAcademicSessions(schoolId: string): Promise<ApiResponse<AcademicSession[]>> {
    const items = parseSessionList(await this.client.get<unknown>('/sessions/'));
    if (items.some(item => item.schoolId !== schoolId)) {
      throw new ApiClientError({
        code: 'ACADEMIC_SCHOOL_MISMATCH',
        kind: 'server',
        message: 'The server returned a session outside the selected school.',
      });
    }
    return success(items, 'Academic sessions loaded.');
  }

  async createAcademicSession(schoolId: string, input: CreateAcademicSessionInput): Promise<ApiResponse<AcademicSession>> {
    let item = inSchool(parseSession(await this.client.post<unknown>('/sessions/', mapSessionRequest(input))), schoolId);
    if (input.status === 'ACTIVE') {
      item = inSchool(parseSession(await this.client.patch<unknown>(`/sessions/${requestId(item.id, 'sessionId')}/activate/`, {})), schoolId);
    }
    return success(item, input.status === 'ACTIVE' ? 'Academic session created and activated.' : 'Academic session created.');
  }

  async updateAcademicSession(schoolId: string, sessionId: string, input: UpdateAcademicSessionInput): Promise<ApiResponse<AcademicSession>> {
    const item = inSchool(parseSession(await this.client.patch<unknown>(`/sessions/${requestId(sessionId, 'sessionId')}/`, mapSessionRequest(input))), schoolId);
    return success(item, 'Academic session updated.');
  }

  async activateAcademicSession(schoolId: string, sessionId: string): Promise<ApiResponse<AcademicSession[]>> {
    inSchool(parseSession(await this.client.patch<unknown>(`/sessions/${requestId(sessionId, 'sessionId')}/activate/`, {})), schoolId);
    return this.getAcademicSessions(schoolId);
  }

  async closeAcademicSession(): Promise<ApiResponse<AcademicSession>> {
    throw createUnsupportedOperationError('academic sessions', 'close');
  }
}

export const liveAcademicSessionService = new LiveAcademicSessionService(apiClient);
