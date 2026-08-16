import { createUnsupportedOperationError } from '../api/apiError';

export type IntegrationMode = 'mock' | 'live' | 'unsupported';

export type IntegrationModule =
  | 'authentication'
  | 'platform'
  | 'organization'
  | 'branches'
  | 'staff'
  | 'academics'
  | 'academic-sessions'
  | 'academic-classes'
  | 'academic-sections'
  | 'academic-subjects'
  | 'teacher-assignments'
  | 'students'
  | 'student-demo-identity'
  | 'student-admissions'
  | 'student-guardians'
  | 'student-enrolments'
  | 'student-lifecycle'
  | 'student-self-service'
  | 'fee-setup'
  | 'fee-setup-demo'
  | 'fee-heads'
  | 'fee-structures'
  | 'fee-structure-items'
  | 'fee-discounts'
  | 'fee-fines'
  | 'fee-dues'
  | 'collections'
  | 'communication'
  | 'examinations'
  | 'marks-results'
  | 'report-cards'
  | 'reports'
  | 'receipt-documents'
  | 'report-card-documents';

export type ModuleIntegrationModes = Readonly<
  Record<IntegrationModule, IntegrationMode>
>;

// Phase 20 enables the confirmed academic setup boundaries. Later business
// modules retain their own mock repositories and identifier namespaces.
export const MODULE_INTEGRATION_MODES: ModuleIntegrationModes = {
  authentication: 'live',
  platform: 'live',
  organization: 'live',
  branches: 'live',
  staff: 'live',
  academics: 'live',
  'academic-sessions': 'live',
  'academic-classes': 'live',
  'academic-sections': 'live',
  'academic-subjects': 'live',
  'teacher-assignments': 'live',
  students: 'live',
  'student-demo-identity': 'mock',
  'student-admissions': 'live',
  'student-guardians': 'unsupported',
  'student-enrolments': 'unsupported',
  'student-lifecycle': 'live',
  'student-self-service': 'live',
  'fee-setup': 'live',
  'fee-setup-demo': 'mock',
  'fee-heads': 'live',
  'fee-structures': 'live',
  'fee-structure-items': 'live',
  'fee-discounts': 'unsupported',
  'fee-fines': 'unsupported',
  'fee-dues': 'live',
  collections: 'live',
  communication: 'mock',
  examinations: 'live',
  'marks-results': 'live',
  'report-cards': 'mock',
  reports: 'mock',
  'receipt-documents': 'mock',
  'report-card-documents': 'mock',
};

interface RepositorySelection<T> {
  live: T;
  mock: T;
  module: IntegrationModule;
  modes?: ModuleIntegrationModes;
  unsupported: T;
}

export function selectRepository<T>({
  live,
  mock,
  module,
  modes = MODULE_INTEGRATION_MODES,
  unsupported,
}: RepositorySelection<T>): T {
  const mode = modes[module];
  if (mode === 'mock') return mock;
  if (mode === 'live') return live;
  if (mode === 'unsupported') return unsupported;

  throw new Error(`Unknown integration mode for ${module}.`);
}

export function unsupportedOperation(
  module: IntegrationModule,
  operation?: string,
): never {
  throw createUnsupportedOperationError(module, operation);
}
