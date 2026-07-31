import type {
  AcademicClass,
  ClassSubjectAssignment,
  Section,
  Subject,
  SubjectType,
} from '../../models/academic';

const timestamp = '2026-07-15T10:00:00.000Z';
const schoolId = 'school-omt';
const branchId = 'branch-main';
const academicSessionId = 'session-school-omt-current';

const classNames = [
  ['Nursery', 'NUR'],
  ['LKG', 'LKG'],
  ['UKG', 'UKG'],
  ['Class 1', 'C01'],
  ['Class 2', 'C02'],
  ['Class 3', 'C03'],
  ['Class 4', 'C04'],
  ['Class 5', 'C05'],
  ['Class 6', 'C06'],
  ['Class 7', 'C07'],
  ['Class 8', 'C08'],
  ['Class 9', 'C09'],
  ['Class 10', 'C10'],
] as const;

export const INITIAL_ACADEMIC_CLASSES: AcademicClass[] = [
  ...classNames.map(([name, code], index): AcademicClass => ({
    academicSessionId,
    activeSectionCount: index < 10 ? (index % 3 === 0 ? 2 : 1) : 0,
    assignedSubjectCount: index < 11 ? Math.min(4 + Math.floor(index / 3), 7) : 0,
    branchId,
    code,
    createdAt: timestamp,
    displayOrder: index + 1,
    id: `class-omt-${code.toLowerCase()}`,
    name,
    schoolId,
    sectionCount: index < 10 ? (index % 3 === 0 ? 2 : 1) : 0,
    status: index === 12 ? 'INACTIVE' : 'ACTIVE',
    updatedAt: timestamp,
  })),
  {
    academicSessionId: 'session-school-omt-next',
    activeSectionCount: 0,
    assignedSubjectCount: 2,
    branchId,
    code: 'C01',
    createdAt: timestamp,
    displayOrder: 1,
    id: 'class-omt-next-c01',
    name: 'Class 1',
    schoolId,
    sectionCount: 0,
    status: 'ACTIVE',
    updatedAt: timestamp,
  },
  {
    academicSessionId: 'session-school-omt-closed',
    activeSectionCount: 1,
    assignedSubjectCount: 3,
    branchId,
    code: 'C05',
    createdAt: timestamp,
    displayOrder: 5,
    id: 'class-omt-closed-c05',
    name: 'Class 5',
    schoolId,
    sectionCount: 1,
    status: 'ACTIVE',
    updatedAt: timestamp,
  },
  {
    academicSessionId: 'session-school-greenfield-current',
    activeSectionCount: 1,
    assignedSubjectCount: 0,
    branchId: 'branch-school-greenfield-main',
    code: 'C01',
    createdAt: timestamp,
    displayOrder: 1,
    id: 'class-greenfield-c01',
    name: 'Class 1',
    schoolId: 'school-greenfield',
    sectionCount: 1,
    status: 'ACTIVE',
    updatedAt: timestamp,
  },
  {
    academicSessionId: 'session-school-greenfield-current',
    activeSectionCount: 1,
    assignedSubjectCount: 0,
    branchId: 'branch-greenfield-puri',
    code: 'C01',
    createdAt: timestamp,
    displayOrder: 1,
    id: 'class-greenfield-puri-c01',
    name: 'Class 1',
    schoolId: 'school-greenfield',
    sectionCount: 1,
    status: 'ACTIVE',
    updatedAt: timestamp,
  },
];

export const INITIAL_SECTIONS: Section[] = classNames.flatMap(
  ([, code], index): Section[] => {
    if (index >= 10) {
      return [];
    }
    const count = index % 3 === 0 ? 2 : 1;
    return Array.from({ length: count }, (_, sectionIndex) => {
      const letter = String.fromCharCode(65 + sectionIndex);
      return {
        capacity: 36 + sectionIndex * 4,
        classId: `class-omt-${code.toLowerCase()}`,
        code: letter,
        createdAt: timestamp,
        displayOrder: sectionIndex + 1,
        id: `section-omt-${code.toLowerCase()}-${letter.toLowerCase()}`,
        name: `Section ${letter}`,
        status: 'ACTIVE',
        updatedAt: timestamp,
      };
    });
  },
).concat([
  {
    capacity: 30,
    classId: 'class-omt-c01',
    code: 'ARCH',
    createdAt: timestamp,
    displayOrder: 3,
    id: 'section-omt-c01-archived',
    name: 'Archived Section',
    status: 'INACTIVE',
    updatedAt: timestamp,
  },
  {
    capacity: 40,
    classId: 'class-omt-closed-c05',
    code: 'A',
    createdAt: timestamp,
    displayOrder: 1,
    id: 'section-omt-closed-c05-a',
    name: 'Section A',
    status: 'ACTIVE',
    updatedAt: timestamp,
  },
  {
    capacity: 30,
    classId: 'class-greenfield-c01',
    code: 'A',
    createdAt: timestamp,
    displayOrder: 1,
    id: 'section-greenfield-c01-a',
    name: 'Section A',
    status: 'ACTIVE',
    updatedAt: timestamp,
  },
  {
    capacity: 30,
    classId: 'class-greenfield-puri-c01',
    code: 'A',
    createdAt: timestamp,
    displayOrder: 1,
    id: 'section-greenfield-puri-c01-a',
    name: 'Section A',
    status: 'ACTIVE',
    updatedAt: timestamp,
  },
]);

const subjectData: ReadonlyArray<
  readonly [string, string, string, SubjectType, 'ACTIVE' | 'INACTIVE']
> = [
  ['English', 'ENG', 'Eng', 'CORE', 'ACTIVE'],
  ['Mathematics', 'MATH', 'Math', 'CORE', 'ACTIVE'],
  ['Science', 'SCI', 'Sci', 'CORE', 'ACTIVE'],
  ['Social Science', 'SST', 'SST', 'CORE', 'ACTIVE'],
  ['Computer Science', 'COMP', 'Computer', 'OPTIONAL', 'ACTIVE'],
  ['Art Education', 'ART', 'Art', 'ELECTIVE', 'ACTIVE'],
  ['Sanskrit', 'SAN', 'Sanskrit', 'ELECTIVE', 'ACTIVE'],
  ['Music', 'MUS', 'Music', 'OPTIONAL', 'INACTIVE'],
];

export const INITIAL_SUBJECTS: Subject[] = [
  ...subjectData.map(
    ([name, code, shortName, type, status], index): Subject => ({
      activeAssignmentCount:
        status === 'ACTIVE' ? Math.max(0, 11 - index * 2) : 0,
      code,
      createdAt: timestamp,
      displayOrder: index + 1,
      id: `subject-omt-${code.toLowerCase()}`,
      name,
      schoolId,
      shortName,
      status,
      type,
      updatedAt: timestamp,
    }),
  ),
  {
    activeAssignmentCount: 0,
    code: 'ENG',
    createdAt: timestamp,
    displayOrder: 1,
    id: 'subject-greenfield-eng',
    name: 'English',
    schoolId: 'school-greenfield',
    shortName: 'Eng',
    status: 'ACTIVE',
    type: 'CORE',
    updatedAt: timestamp,
  },
];

const activeSubjectCodes = subjectData
  .filter(([, , , , status]) => status === 'ACTIVE')
  .map(([, code]) => code);

export const INITIAL_CLASS_SUBJECT_ASSIGNMENTS: ClassSubjectAssignment[] = [
  ...classNames.flatMap(([, classCode], classIndex) => {
    if (classIndex >= 11) {
      return [];
    }
    const subjectCount = Math.min(4 + Math.floor(classIndex / 3), 7);
    return activeSubjectCodes.slice(0, subjectCount).map(
      (subjectCode, subjectIndex): ClassSubjectAssignment => ({
        academicSessionId,
        branchId,
        classId: `class-omt-${classCode.toLowerCase()}`,
        createdAt: timestamp,
        displayOrder: subjectIndex + 1,
        id: `assignment-omt-${classCode.toLowerCase()}-${subjectCode.toLowerCase()}`,
        schoolId,
        status: 'ACTIVE',
        subjectId: `subject-omt-${subjectCode.toLowerCase()}`,
        updatedAt: timestamp,
      }),
    );
  }),
  ...['ENG', 'MATH'].map(
    (subjectCode, index): ClassSubjectAssignment => ({
      academicSessionId: 'session-school-omt-next',
      branchId,
      classId: 'class-omt-next-c01',
      createdAt: timestamp,
      displayOrder: index + 1,
      id: `assignment-omt-next-c01-${subjectCode.toLowerCase()}`,
      schoolId,
      status: 'ACTIVE',
      subjectId: `subject-omt-${subjectCode.toLowerCase()}`,
      updatedAt: timestamp,
    }),
  ),
  ...['ENG', 'MATH', 'SCI'].map(
    (subjectCode, index): ClassSubjectAssignment => ({
      academicSessionId: 'session-school-omt-closed',
      branchId,
      classId: 'class-omt-closed-c05',
      createdAt: timestamp,
      displayOrder: index + 1,
      id: `assignment-omt-closed-c05-${subjectCode.toLowerCase()}`,
      schoolId,
      status: 'ACTIVE',
      subjectId: `subject-omt-${subjectCode.toLowerCase()}`,
      updatedAt: timestamp,
    }),
  ),
];
