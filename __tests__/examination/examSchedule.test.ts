import {
  INITIAL_EXAM_CLASS_CONFIGURATIONS,
  INITIAL_EXAM_SUBJECT_PAPERS,
} from '../../src/services/examinationSetup/examinationSetupFixtures';
import {
  calculateScheduleEndTime,
  detectScheduleConflicts,
  sortScheduledPapers,
} from '../../src/utils/examSchedule';

const config = INITIAL_EXAM_CLASS_CONFIGURATIONS[0];
const base = {
  ...INITIAL_EXAM_SUBJECT_PAPERS[0],
  examClassConfigurationId: config.id,
  classId: config.classId,
};
const input = (papers = [base]) => ({
  configurations: [config],
  examEndDate: '2026-08-31',
  examStartDate: '2026-08-01',
  papers,
  sessionEndDate: '2027-03-31',
  sessionStartDate: '2026-04-01',
});

describe('Exam schedule utility', () => {
  it('calculates end times and rejects invalid/cross-midnight values', () => {
    expect(calculateScheduleEndTime('09:30', 90)).toBe('11:00');
    expect(calculateScheduleEndTime('24:00', 30)).toBeUndefined();
    expect(calculateScheduleEndTime('23:30', 60)).toBeUndefined();
  });

  it('detects Class, Section, and room overlap with typed severity', () => {
    const second = {
      ...base,
      id: 'paper-2',
      subjectId: 'subject-2',
      subjectNameSnapshot: 'Mathematics',
      room: base.room,
    };
    const conflicts = detectScheduleConflicts(input([base, second]));
    expect(conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CLASS_TIME_OVERLAP',
          severity: 'BLOCKER',
        }),
        expect.objectContaining({
          code: 'SECTION_TIME_OVERLAP',
          severity: 'BLOCKER',
        }),
        expect.objectContaining({
          code: 'ROOM_TIME_OVERLAP',
          severity: 'WARNING',
        }),
      ]),
    );
  });

  it('reports missing and out-of-range schedules and sorts stably', () => {
    const missing = { ...base, id: 'missing', examDate: undefined };
    const outside = {
      ...base,
      id: 'outside',
      examDate: '2028-01-01',
      startTime: '08:00',
    };
    const codes = detectScheduleConflicts(input([missing, outside])).map(
      item => item.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        'MISSING_SCHEDULE',
        'OUTSIDE_EXAM_DATE_RANGE',
        'OUTSIDE_SESSION_RANGE',
      ]),
    );
    expect(sortScheduledPapers([outside, base]).map(item => item.id)).toEqual([
      base.id,
      outside.id,
    ]);
  });
});
