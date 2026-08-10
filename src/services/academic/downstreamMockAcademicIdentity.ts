import type { AcademicSession } from '../../models/organization';
import { INITIAL_ACADEMIC_SESSIONS } from '../organization/organizationFixtures';

const sessionsBySchool = new Map<string, AcademicSession[]>();

// Later business modules remain intentionally mock. They may use only their
// matching mock identity graph; a numeric live school ID therefore resolves
// to no demo Sessions instead of being mixed into mock requests.
export function getDownstreamMockAcademicSessions(
  schoolId: string,
): AcademicSession[] {
  const cached = sessionsBySchool.get(schoolId);
  if (cached) return cached;
  const items = INITIAL_ACADEMIC_SESSIONS.filter(item => item.schoolId === schoolId);
  sessionsBySchool.set(schoolId, items);
  return items;
}
