import type { AcademicContext } from '../../models/academic';
import type { CurrentClassFeeStructure } from '../../models/currentFeeConfiguration';

export interface CurrentFeeStructureService {
  list(context: AcademicContext): Promise<CurrentClassFeeStructure[]>;
  get(context: AcademicContext, classId: string): Promise<CurrentClassFeeStructure>;
}
