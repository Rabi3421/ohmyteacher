import type { AppRole } from '../constants/permissions';
import type { ID } from './common';

export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export interface AuthUser {
  id: ID;
  name: string;
  mobile?: string;
  email?: string;
  avatarUrl?: string;
  status: AccountStatus;
}

export interface UserMembership {
  id: ID;
  userId: ID;
  role: AppRole;
  schoolId?: ID;
  schoolName?: string;
  schoolCode?: string;
  schoolLogoUrl?: string;
  branchId?: ID;
  branchName?: string;
  studentId?: ID;
  studentName?: string;
  status: AccountStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface OtpRequest {
  requestId?: string;
  destinationMasked: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface AuthSession {
  user: AuthUser;
  memberships: UserMembership[];
  tokens: AuthTokens;
  isNewUser?: boolean;
  school?: AuthSchool;
  unsupportedRole?: string;
}

export interface LoginOtpInput {
  mobile: string;
}

export type OtpRequestContext = { kind: 'login'; input: LoginOtpInput };

export interface PendingOtpRequest extends OtpRequest {
  context: OtpRequestContext;
  requestedAt: string;
}

export type InactiveReason =
  | 'USER_INACTIVE'
  | 'SCHOOL_INACTIVE'
  | 'BRANCH_INACTIVE'
  | 'MEMBERSHIP_INACTIVE';

export interface AuthIdentity {
  user: AuthUser;
  memberships: UserMembership[];
  unsupportedRole?: string;
}

export interface AuthSchool {
  id: ID;
  name: string;
  address: string;
  phone: string;
  email: string;
  upiId: string;
  status: AccountStatus;
  createdAt: string;
}

export interface AuthOnboardingInput {
  name: string;
  school: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    upiId?: string;
  };
}
