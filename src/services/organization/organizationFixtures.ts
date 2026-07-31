import type {
  AcademicSession,
  Branch,
  InitialSchoolAdminSummary,
  School,
  SchoolSettings,
} from '../../models/organization';
import { getAcademicYearForDate } from '../../utils/academicSession';

const currentSession = getAcademicYearForDate(new Date());
const now = '2026-07-15T10:00:00.000Z';

const baseAddress = {
  city: 'Bhubaneswar',
  country: 'India',
  line1: 'Education Road',
  pinCode: '751001',
  state: 'Odisha',
};

function admin(
  membershipId: string,
  name: string,
  mobile: string,
): InitialSchoolAdminSummary {
  return { membershipId, mobile, name, role: 'SCHOOL_ADMIN' };
}

const schoolData = [
  ['school-omt', 'OhMyTeacher Demo School', 'OMT001', '9876543200', 'ACTIVE'],
  ['school-sunrise', 'Sunrise Public School', 'SUN001', '9876500001', 'ACTIVE'],
  ['school-greenfield', 'Greenfield Academy', 'GRN002', '9876500002', 'ACTIVE'],
  ['school-riverdale', 'Riverdale High School', 'RIV003', '9876500003', 'INACTIVE'],
  ['school-vidya', 'Vidya Mandir', 'VID004', '9876500004', 'ACTIVE'],
  ['school-stmary', "St. Mary's School", 'STM005', '9876500005', 'ACTIVE'],
  ['school-littleflower', 'Little Flower School', 'LFS006', '9876500006', 'INACTIVE'],
  ['school-national', 'National Model School', 'NMS007', '9876500007', 'ACTIVE'],
] as const;

export const INITIAL_SCHOOLS: School[] = schoolData.map(
  ([id, name, code, mobile, status], index) => ({
    activeBranchCount: index === 2 ? 2 : 1,
    activeSession: {
      endDate: currentSession.endDate,
      id: `session-${id}-current`,
      name: currentSession.name,
      startDate: currentSession.startDate,
    },
    address: {
      ...baseAddress,
      city: index % 2 === 0 ? 'Bhubaneswar' : 'Cuttack',
      line1: `${index + 1}, Education Road`,
      pinCode: index % 2 === 0 ? '751001' : '753001',
    },
    branchCount: index === 2 ? 3 : 1,
    code,
    createdAt: `202${index % 5}-04-01T09:00:00.000Z`,
    email: `office@${code.toLowerCase()}.edu.in`,
    id,
    mobile,
    name,
    schoolAdmin: admin(
      `admin-${id}`,
      index === 0 ? 'Ananya Sharma' : `School Admin ${index + 1}`,
      index === 0 ? '9876543210' : `986000000${index}`,
    ),
    status,
    updatedAt: now,
    website: `https://${code.toLowerCase()}.example.edu`,
  }),
);

export const INITIAL_BRANCHES: Branch[] = INITIAL_SCHOOLS.flatMap(
  (school, index) => {
    const main: Branch = {
      address: school.address,
      code: 'MAIN',
      createdAt: school.createdAt,
      email: school.email,
      id: school.id === 'school-omt' ? 'branch-main' : `branch-${school.id}-main`,
      isMainBranch: true,
      mobile: school.mobile,
      name: 'Main Branch',
      schoolId: school.id,
      status: 'ACTIVE',
      updatedAt: now,
    };
    if (index !== 2) {
      return [main];
    }
    return [
      main,
      {
        ...main,
        address: {
          ...school.address,
          city: 'Puri',
          line1: '12, Sea Beach Road',
          pinCode: '752001',
        },
        code: 'PURI',
        id: 'branch-greenfield-puri',
        isMainBranch: false,
        name: 'Puri Branch',
      },
      {
        ...main,
        address: {
          ...school.address,
          city: 'Konark',
          line1: '7, Temple Road',
          pinCode: '752111',
        },
        code: 'OLD',
        id: 'branch-greenfield-archived',
        isMainBranch: false,
        name: 'Old Campus',
        status: 'INACTIVE',
      },
    ];
  },
);

export const INITIAL_ACADEMIC_SESSIONS: AcademicSession[] =
  INITIAL_SCHOOLS.flatMap((school, index) => [
    ...(index === 0
      ? [
          {
            createdAt: school.createdAt,
            endDate: `${currentSession.startYear}-03-31`,
            id: 'session-school-omt-closed',
            name: `${currentSession.startYear - 1}-${String(
              currentSession.startYear,
            ).slice(-2)}`,
            schoolId: school.id,
            startDate: `${currentSession.startYear - 1}-04-01`,
            status: 'CLOSED' as const,
            updatedAt: now,
          },
        ]
      : []),
    {
      createdAt: school.createdAt,
      endDate: currentSession.endDate,
      id: `session-${school.id}-current`,
      name: currentSession.name,
      schoolId: school.id,
      startDate: currentSession.startDate,
      status: 'ACTIVE',
      updatedAt: now,
    },
    ...(index % 2 === 0
      ? [
          {
            createdAt: now,
            endDate: `${currentSession.endYear + 1}-03-31`,
            id: `session-${school.id}-next`,
            name: `${currentSession.endYear}-${String(
              currentSession.endYear + 1,
            ).slice(-2)}`,
            schoolId: school.id,
            startDate: `${currentSession.endYear}-04-01`,
            status: 'UPCOMING' as const,
            updatedAt: now,
          },
        ]
      : []),
  ]);

export const INITIAL_SCHOOL_SETTINGS: SchoolSettings[] = INITIAL_SCHOOLS.map(
  school => ({
    academicYearStartMonth: 4,
    country: 'India',
    currency: 'INR',
    dateFormat: 'DD-MMM-YYYY',
    displayName: school.name,
    logoUrl: school.logoUrl,
    primaryEmail: school.email,
    primaryMobile: school.mobile,
    schoolId: school.id,
    timezone: 'Asia/Kolkata',
  }),
);
