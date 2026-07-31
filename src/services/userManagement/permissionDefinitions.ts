import type { PermissionDefinition } from '../../models/userManagement';
import {
  PERMISSION_KEYS,
  type PermissionGroup,
  type PermissionKey,
} from '../../constants/userPermissions';

const GROUP_BY_PREFIX: Record<string, PermissionGroup> = {
  academic: 'Academic',
  collection: 'Collections',
  communication: 'Communication',
  exams: 'Examinations',
  exam_reports: 'Reports',
  fee_reports: 'Reports',
  fees: 'Fees',
  ledger: 'Reports',
  marks: 'Examinations',
  notifications: 'Notifications',
  organization: 'Organization',
  payments: 'Collections',
  receipts: 'Receipts',
  report_cards: 'Examinations',
  reports: 'Reports',
  results: 'Examinations',
  students: 'Students',
  users: 'Users',
};

const LABEL_OVERRIDES: Partial<Record<PermissionKey, string>> = {
  'collection.daily.view': 'View Daily Collection',
  'payments.advance.manage': 'Apply Advance Credit',
  'payments.advance.view': 'View Advance Credit',
  'payments.collect': 'Collect Payments',
  'payments.reverse': 'Reverse Payments',
  'receipts.cancel': 'Cancel Receipts',
  'receipts.share': 'Share Receipts',
  'marks.exempt': 'Mark Student Exempt',
  'marks.history.view': 'View Marks History',
  'marks.submit': 'Submit Marks',
  'results.calculate': 'Calculate Results',
  'results.publish': 'Publish Results',
  'results.publication_history.view': 'View Publication History',
  'results.rank.view': 'View Rank Lists',
  'results.review': 'Review Results',
  'results.self_service.view': 'View Own Published Results',
  'results.communication.send': 'Send Result Communications',
  'report_cards.templates.manage': 'Manage Report Card Templates',
  'report_cards.generate': 'Generate Report Cards',
  'report_cards.revoke': 'Revoke Report Cards',
  'report_cards.history.view': 'View Report Card History',
  'report_cards.share': 'Share Report Cards',
  'users.sessions.revoke': 'Revoke User Sessions',
};

function labelFor(key: PermissionKey): string {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key]!;
  const action = key.split('.').slice(-2).join(' ');
  return action
    .split(/[._]/)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] =
  PERMISSION_KEYS.map(key => {
    const prefix = key.split('.')[0];
    return {
      description: `Allows ${key.replaceAll(
        '.',
        ' ',
      )} operations within the permitted tenant scope.`,
      group: GROUP_BY_PREFIX[prefix],
      key,
      label: labelFor(key),
    };
  });
