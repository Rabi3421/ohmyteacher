import type {
  ReportCard,
  ReportCardGenerationResultItem,
  ReportCardGenerationRun,
  ReportCardTemplate,
} from '../../models/reportCard';
import { publishedResultRepository } from '../marksResult/publishedResultRepository';
import {
  INITIAL_PUBLISHED_RESULT_SNAPSHOTS,
  INITIAL_REPORT_CARDS,
  INITIAL_REPORT_CARD_RUNS,
  INITIAL_REPORT_CARD_TEMPLATES,
} from './reportCardFixtures';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let templates: ReportCardTemplate[] = [];
let cards: ReportCard[] = [];
let runs: ReportCardGenerationRun[] = [];
let runItems = new Map<string, ReportCardGenerationResultItem[]>();
let sequence = 100;
export function resetMockReportCardRepository(): void {
  templates = clone(INITIAL_REPORT_CARD_TEMPLATES);
  cards = clone(INITIAL_REPORT_CARDS);
  runs = clone(INITIAL_REPORT_CARD_RUNS);
  runItems = new Map();
  sequence = 100;
  publishedResultRepository.replace(INITIAL_PUBLISHED_RESULT_SNAPSHOTS);
}
resetMockReportCardRepository();
export const reportCardRepository = {
  snapshot: () => clone({ cards, runs, sequence, templates }),
  restore(value: {
    cards: ReportCard[];
    runs: ReportCardGenerationRun[];
    sequence: number;
    templates: ReportCardTemplate[];
  }) {
    cards = clone(value.cards);
    runs = clone(value.runs);
    // Issued sequence values are never reused, even when entity writes roll back.
    sequence = Math.max(sequence, value.sequence);
    templates = clone(value.templates);
  },
  templates: () => templates,
  cards: () => cards,
  runs: () => runs,
  runItems: (id: string) => runItems.get(id) ?? [],
  setTemplates: (value: ReportCardTemplate[]) => {
    templates = value;
  },
  setCards: (value: ReportCard[]) => {
    cards = value;
  },
  setRuns: (value: ReportCardGenerationRun[]) => {
    runs = value;
  },
  setRunItems: (id: string, value: ReportCardGenerationResultItem[]) => {
    runItems.set(id, value);
  },
  nextSequence: () => ++sequence,
};
