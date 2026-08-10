import type { AcademicClass, AcademicContext } from '../../models/academic';
import type {
  CurrentClassFeeStructure,
  CurrentFeeStructureItem,
} from '../../models/currentFeeConfiguration';
import { addFeePaise } from '../../utils/feeMoney';
import type { AcademicService } from '../academic/academicService';
import { academicService } from '../academic/academicServiceResolver';
import { ApiClientError } from '../api/apiError';
import type { CurrentFeeStructureItemService } from './currentFeeStructureItemService';
import { liveCurrentFeeStructureItemService } from './liveCurrentFeeStructureItemService';
import type { CurrentFeeStructureService } from './currentFeeStructureService';

export function buildCurrentClassFeeStructure(
  context: AcademicContext,
  schoolClass: AcademicClass,
  items: CurrentFeeStructureItem[],
): CurrentClassFeeStructure {
  if (items.some(item => item.classId !== schoolClass.id)) {
    throw new ApiClientError({
      code: 'FEE_CLASS_SCOPE_MISMATCH',
      kind: 'server',
      message: 'The server returned a Structure Item outside its requested Class.',
    });
  }
  return {
    ...context,
    classId: schoolClass.id,
    className: schoolClass.name,
    classStatus: schoolClass.status,
    id: schoolClass.id,
    items,
    totalPaise: addFeePaise(items.map(item => item.amountPaise)),
  };
}

export class LiveCurrentFeeStructureService
  implements CurrentFeeStructureService
{
  constructor(
    private readonly academics: Pick<AcademicService, 'getClass' | 'getClasses'>,
    private readonly items: CurrentFeeStructureItemService,
  ) {}

  async list(context: AcademicContext): Promise<CurrentClassFeeStructure[]> {
    const classes = (
      await this.academics.getClasses(context, {
        page: 1,
        pageSize: 10_000,
        sort: 'DISPLAY_ORDER_ASC',
        status: 'ALL',
      })
    ).data.items;
    const itemGroups = await Promise.all(
      classes.map(schoolClass => this.items.list(schoolClass.id)),
    );
    return classes.map((schoolClass, index) =>
      buildCurrentClassFeeStructure(context, schoolClass, itemGroups[index]),
    );
  }

  async get(
    context: AcademicContext,
    classId: string,
  ): Promise<CurrentClassFeeStructure> {
    const [schoolClass, items] = await Promise.all([
      this.academics.getClass(context, classId),
      this.items.list(classId),
    ]);
    return buildCurrentClassFeeStructure(context, schoolClass.data, items);
  }
}

export const liveCurrentFeeStructureService =
  new LiveCurrentFeeStructureService(academicService, liveCurrentFeeStructureItemService);
