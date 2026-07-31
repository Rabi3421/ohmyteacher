export const APP_ROLES = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'BRANCH_ADMIN',
  'ACCOUNTANT',
  'RECEPTIONIST',
  'PARENT',
  'STUDENT',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  SCHOOL_ADMIN: 'School Admin',
  BRANCH_ADMIN: 'Branch Admin',
  ACCOUNTANT: 'Accountant',
  RECEPTIONIST: 'Receptionist',
  PARENT: 'Parent',
  STUDENT: 'Student',
};
