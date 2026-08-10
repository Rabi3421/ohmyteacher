import { selectRepository } from '../integration/integrationMode';
import { apiAcademicService } from './apiAcademicService';
import type { AcademicService } from './academicService';
import { mockAcademicService } from './mockAcademicService';

export function resolveAcademicService(): AcademicService {
  type ClassBoundary = Pick<AcademicService, 'createClass' | 'getClass' | 'getClasses' | 'getSetupSummary' | 'updateClass' | 'updateClassStatus'>;
  type SectionBoundary = Pick<AcademicService, 'createSection' | 'getSection' | 'getSections' | 'updateSection' | 'updateSectionStatus'>;
  type SubjectBoundary = Pick<AcademicService, 'createSubject' | 'getSubject' | 'getSubjects' | 'updateSubject' | 'updateSubjectStatus'>;
  type AssignmentBoundary = Pick<AcademicService, 'getClassSubjectAssignments' | 'updateClassSubjectAssignments'>;
  const classes = selectRepository<ClassBoundary>({ live: apiAcademicService, mock: mockAcademicService, module: 'academic-classes', unsupported: apiAcademicService });
  const sections = selectRepository<SectionBoundary>({ live: apiAcademicService, mock: mockAcademicService, module: 'academic-sections', unsupported: apiAcademicService });
  const subjects = selectRepository<SubjectBoundary>({ live: apiAcademicService, mock: mockAcademicService, module: 'academic-subjects', unsupported: apiAcademicService });
  const assignments = selectRepository<AssignmentBoundary>({ live: apiAcademicService, mock: mockAcademicService, module: 'teacher-assignments', unsupported: apiAcademicService });
  return {
    createClass: classes.createClass.bind(classes),
    createSection: sections.createSection.bind(sections),
    createSubject: subjects.createSubject.bind(subjects),
    getClass: classes.getClass.bind(classes),
    getClasses: classes.getClasses.bind(classes),
    getClassSubjectAssignments: assignments.getClassSubjectAssignments.bind(assignments),
    getSection: sections.getSection.bind(sections),
    getSections: sections.getSections.bind(sections),
    getSetupSummary: classes.getSetupSummary.bind(classes),
    getSubject: subjects.getSubject.bind(subjects),
    getSubjects: subjects.getSubjects.bind(subjects),
    updateClass: classes.updateClass.bind(classes),
    updateClassStatus: classes.updateClassStatus.bind(classes),
    updateClassSubjectAssignments: assignments.updateClassSubjectAssignments.bind(assignments),
    updateSection: sections.updateSection.bind(sections),
    updateSectionStatus: sections.updateSectionStatus.bind(sections),
    updateSubject: subjects.updateSubject.bind(subjects),
    updateSubjectStatus: subjects.updateSubjectStatus.bind(subjects),
  };
}

export const academicService = resolveAcademicService();
