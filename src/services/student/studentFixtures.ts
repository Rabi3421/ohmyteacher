import type {
  GuardianProfile,
  ParentStudentLink,
  StudentEnrollment,
  StudentGuardianLink,
  StudentProfile,
} from '../../models/student';

const schoolId = 'school-omt';
const branchId = 'branch-main';
const academicSessionId = 'session-school-omt-current';
const timestamp = '2026-07-20T10:00:00.000Z';
const address = {
  city: 'Bhubaneswar',
  country: 'India',
  line1: 'Education Road',
  pinCode: '751001',
  state: 'Odisha',
};

const studentData = [
  ['rahul', 'Rahul Patel', '2015-05-14', 'MALE', 'ACTIVE'],
  ['aarav', 'Aarav Kumar', '2015-08-21', 'MALE', 'ACTIVE'],
  ['anaya', 'Anaya Kumar', '2016-01-12', 'FEMALE', 'ACTIVE'],
  ['arjun', 'Arjun Nair', '2014-11-02', 'MALE', 'ACTIVE'],
  ['isha', 'Isha Patel', '2016-06-17', 'FEMALE', 'ACTIVE'],
  ['kabir', 'Kabir Mishra', '2015-03-25', 'MALE', 'INACTIVE'],
  ['saanvi', 'Saanvi Das', '2014-09-10', 'FEMALE', 'ACTIVE'],
  ['vivaan', 'Vivaan Rao', '2015-12-08', 'MALE', 'ACTIVE'],
  ['diya', 'Diya Singh', '2016-02-18', 'FEMALE', 'ACTIVE'],
  ['advait', 'Advait Joshi', '2014-07-30', 'MALE', 'WITHDRAWN'],
  ['myra', 'Myra Shah', '2015-04-01', 'FEMALE', 'ACTIVE'],
  ['reyansh', 'Reyansh Sen', '2014-10-16', 'MALE', 'ACTIVE'],
  ['navya', 'Navya Mehta', '2016-03-11', 'FEMALE', 'ACTIVE'],
  ['atharv', 'Atharv Jain', '2015-01-29', 'MALE', 'ACTIVE'],
  ['kiara', 'Kiara Bose', '2014-12-19', 'FEMALE', 'PASSED_OUT'],
  ['ayaan', 'Ayaan Roy', '2015-09-06', 'MALE', 'ACTIVE'],
  ['tara', 'Tara Kapoor', '2016-05-23', 'FEMALE', 'ACTIVE'],
  ['dev', 'Dev Kulkarni', '2014-08-13', 'MALE', 'ACTIVE'],
  ['zoya', 'Zoya Khan', '2015-02-27', 'FEMALE', 'ACTIVE'],
  ['ishaan', 'Ishaan Verma', '2016-07-09', 'MALE', 'ACTIVE'],
] as const;

export const INITIAL_STUDENT_PROFILES: StudentProfile[] = studentData.map(
  ([slug, fullName, dateOfBirth, gender, status], index): StudentProfile => ({
    address: { ...address, line1: `${index + 10}, Education Road` },
    admissionDate: `202${index % 5 + 1}-04-0${(index % 8) + 1}`,
    admissionNumber: `OMT-2026-${String(index + 1).padStart(4, '0')}`,
    bloodGroup: index % 3 === 0 ? 'B+' : index % 3 === 1 ? 'O+' : 'A+',
    createdAt: timestamp,
    dateOfBirth,
    email: index % 4 === 0 ? `${slug}@student.example.in` : undefined,
    fullName,
    gender,
    id: `student-${slug}`,
    mobile: slug === 'arjun' ? '9876543217' : undefined,
    schoolId,
    status,
    updatedAt: timestamp,
  }),
).concat([
  {
    address,
    admissionDate: '2026-04-01',
    admissionNumber: 'GRN-2026-0001',
    createdAt: timestamp,
    dateOfBirth: '2015-01-01',
    fullName: 'Greenfield Student',
    gender: 'OTHER',
    id: 'student-greenfield',
    schoolId: 'school-greenfield',
    status: 'ACTIVE',
    updatedAt: timestamp,
  },
]);

const activeProfiles = INITIAL_STUDENT_PROFILES.filter(
  item => item.schoolId === schoolId,
);

export const INITIAL_STUDENT_ENROLLMENTS: StudentEnrollment[] = [
  ...activeProfiles.map((profile, index): StudentEnrollment => {
    const classNumber = (index % 5) + 1;
    const classCode = `c0${classNumber}`;
    const finalStatus =
      profile.status === 'WITHDRAWN'
        ? 'CANCELLED'
        : profile.status === 'PASSED_OUT'
          ? 'COMPLETED'
          : 'ACTIVE';
    return {
      academicSessionId,
      branchId,
      classId: `class-omt-${classCode}`,
      createdAt: timestamp,
      endDate: finalStatus === 'ACTIVE' ? undefined : '2026-07-01',
      id: `enrollment-${profile.id}-current`,
      rollNumber: index === 8 ? undefined : String(index + 1),
      schoolId,
      sectionId: `section-omt-${classCode}-a`,
      startDate: '2026-04-01',
      status: finalStatus,
      studentId: profile.id,
      updatedAt: timestamp,
    };
  }),
  {
    academicSessionId: 'session-school-greenfield-current',
    branchId: 'branch-school-greenfield-main',
    classId: 'class-greenfield-c01',
    createdAt: timestamp,
    id: 'enrollment-student-greenfield-current',
    rollNumber: '1',
    schoolId: 'school-greenfield',
    sectionId: 'section-greenfield-c01-a',
    startDate: '2026-04-01',
    status: 'ACTIVE',
    studentId: 'student-greenfield',
    updatedAt: timestamp,
  },
  {
    academicSessionId: 'session-school-omt-closed',
    branchId,
    classId: 'class-omt-closed-c05',
    createdAt: '2025-04-01T09:00:00.000Z',
    endDate: '2026-03-31',
    id: 'enrollment-student-rahul-previous',
    rollNumber: '8',
    schoolId,
    sectionId: 'section-omt-closed-c05-a',
    startDate: '2025-04-01',
    status: 'COMPLETED',
    studentId: 'student-rahul',
    updatedAt: '2026-03-31T10:00:00.000Z',
  },
  {
    academicSessionId,
    branchId,
    classId: 'class-omt-c01',
    createdAt: '2026-04-01T09:00:00.000Z',
    endDate: '2026-06-30',
    id: 'enrollment-student-saanvi-before-transfer',
    rollNumber: '7',
    schoolId,
    sectionId: 'section-omt-c01-b',
    startDate: '2026-04-01',
    status: 'TRANSFERRED',
    studentId: 'student-saanvi',
    transferReason: 'Section balancing',
    transferType: 'SECTION_CHANGE',
    updatedAt: '2026-06-30T10:00:00.000Z',
  },
  {
    academicSessionId: 'session-school-greenfield-current',
    branchId: 'branch-greenfield-puri',
    classId: 'class-greenfield-puri-c01',
    createdAt: '2026-04-01T09:00:00.000Z',
    endDate: '2026-06-30',
    id: 'enrollment-student-greenfield-before-branch-transfer',
    rollNumber: '1',
    schoolId: 'school-greenfield',
    sectionId: 'section-greenfield-puri-c01-a',
    startDate: '2026-04-01',
    status: 'TRANSFERRED',
    studentId: 'student-greenfield',
    transferReason: 'Moved to the main campus',
    transferType: 'BRANCH_TRANSFER',
    updatedAt: '2026-06-30T10:00:00.000Z',
  },
];

export const INITIAL_GUARDIANS: GuardianProfile[] = activeProfiles
  .map((profile, index): GuardianProfile => ({
    address: profile.address,
    createdAt: timestamp,
    fullName:
      profile.id === 'student-rahul' || profile.id === 'student-isha'
        ? 'Meera Patel'
        : profile.id === 'student-aarav' ||
            profile.id === 'student-anaya'
          ? 'Priya Kumar'
          : `Guardian ${profile.fullName.split(' ')[0]}`,
    id:
      profile.id === 'student-isha'
        ? 'guardian-student-rahul'
        : profile.id === 'student-anaya'
          ? 'guardian-student-aarav'
          : `guardian-${profile.id}`,
    mobile:
      profile.id === 'student-rahul' || profile.id === 'student-isha'
        ? '9876543212'
        : profile.id === 'student-aarav' ||
            profile.id === 'student-anaya'
          ? '9876543213'
          : `98${String(50000000 + index).slice(-8)}`,
    relationship: index % 2 === 0 ? 'MOTHER' : 'FATHER',
    schoolId,
    updatedAt: timestamp,
    userId:
      profile.id === 'student-rahul' || profile.id === 'student-isha'
        ? 'user-multiple'
        : profile.id === 'student-aarav' ||
            profile.id === 'student-anaya'
          ? 'user-parent'
          : undefined,
  }))
  .filter(
    (guardian, index, all) =>
      all.findIndex(item => item.id === guardian.id) === index,
  )
  .concat([
    {
      address,
      createdAt: timestamp,
      fullName: 'Rakesh Das',
      id: 'guardian-student-saanvi-secondary',
      mobile: '9850000099',
      occupation: 'Engineer',
      relationship: 'FATHER',
      schoolId,
      updatedAt: timestamp,
    },
  ]);

export const INITIAL_STUDENT_GUARDIAN_LINKS: StudentGuardianLink[] =
  [
    ...activeProfiles.map((profile, index): StudentGuardianLink => {
    const guardianId =
      profile.id === 'student-isha'
        ? 'guardian-student-rahul'
        : profile.id === 'student-anaya'
          ? 'guardian-student-aarav'
          : `guardian-${profile.id}`;
    return {
      createdAt: timestamp,
      guardianId,
      id: `student-guardian-${profile.id}-${guardianId}`,
      isEmergencyContact: true,
      isFeeContact: true,
      isPrimaryContact: true,
      parentAppAccessEnabled: index < 5,
      status: 'ACTIVE',
      studentId: profile.id,
      updatedAt: timestamp,
      whatsappEnabled: true,
      };
    }),
    {
      createdAt: timestamp,
      guardianId: 'guardian-student-saanvi-secondary',
      id: 'student-guardian-student-saanvi-secondary',
      isEmergencyContact: true,
      isFeeContact: false,
      isPrimaryContact: false,
      parentAppAccessEnabled: false,
      status: 'ACTIVE',
      studentId: 'student-saanvi',
      updatedAt: timestamp,
      whatsappEnabled: true,
    },
  ];

export const INITIAL_PARENT_STUDENT_LINKS: ParentStudentLink[] = [
  {
    createdAt: timestamp,
    guardianId: 'guardian-student-rahul',
    id: 'parent-link-rahul',
    parentMembershipId: 'membership-parent',
    schoolId,
    status: 'ACTIVE',
    studentId: 'student-rahul',
  },
  {
    createdAt: timestamp,
    guardianId: 'guardian-student-rahul',
    id: 'parent-link-isha',
    parentMembershipId: 'membership-parent',
    schoolId,
    status: 'ACTIVE',
    studentId: 'student-isha',
  },
  {
    createdAt: timestamp,
    guardianId: 'guardian-student-aarav',
    id: 'parent-link-aarav',
    parentMembershipId: 'membership-child-one',
    schoolId,
    status: 'ACTIVE',
    studentId: 'student-aarav',
  },
  {
    createdAt: timestamp,
    guardianId: 'guardian-student-aarav',
    id: 'parent-link-anaya',
    parentMembershipId: 'membership-child-two',
    schoolId,
    status: 'ACTIVE',
    studentId: 'student-anaya',
  },
];
