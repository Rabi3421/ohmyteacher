import type {
  DiscountDefinition,
  EffectiveFeePreview,
  FeeStructure,
  StudentDiscountAssignment,
  StudentFeeAmountOverride,
  StudentFeeItemSelection,
} from '../models/fee';

export interface FeeCalculationInput {
  structure: FeeStructure;
  selections: readonly StudentFeeItemSelection[];
  overrides: readonly StudentFeeAmountOverride[];
  discountAssignments: readonly StudentDiscountAssignment[];
  discountDefinitions: readonly DiscountDefinition[];
  selectedMonths?: readonly number[];
  fineRuleNames?: readonly string[];
}

export function rupeesToPaise(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

export function paiseToRupees(amountPaise: number): number {
  return amountPaise / 100;
}

export function calculateEffectiveFee(
  input: FeeCalculationInput,
): EffectiveFeePreview {
  const lineItems = input.structure.items
    .filter(item => item.status === 'ACTIVE')
    .map(item => {
      const selection = input.selections.find(
        candidate => candidate.feeStructureItemId === item.id,
      );
      const selected =
        item.mandatory ||
        item.applicability === 'ALL_STUDENTS' ||
        Boolean(selection?.selected);
      const multiplier =
        item.frequency === 'MONTHLY'
          ? input.selectedMonths
            ? input.selectedMonths.filter(
                month =>
                  !item.applicableMonths ||
                  item.applicableMonths.includes(month),
              ).length
            : 1
          : 1;
      const baseAmountPaise = rupeesToPaise(item.amount) * multiplier;
      const override = input.overrides.find(
        candidate => candidate.feeStructureItemId === item.id,
      );
      const exempt = selected && override?.type === 'EXEMPT';
      const effectiveAmountPaise = !selected || exempt
        ? 0
        : override?.type === 'CUSTOM_AMOUNT'
          ? rupeesToPaise(override.customAmount ?? 0) * multiplier
          : baseAmountPaise;
      return {
        baseAmountPaise,
        effectiveAmountPaise,
        exempt,
        feeHeadId: item.feeHeadId,
        feeStructureItemId: item.id,
        label: item.feeHeadName,
        overrideType: override?.type ?? ('DEFAULT_AMOUNT' as const),
        selected,
      };
    });

  const grossAmountPaise = lineItems
    .filter(item => item.selected)
    .reduce((total, item) => total + item.baseAmountPaise, 0);
  const selectedOptionalAmountPaise = input.structure.items.reduce(
    (total, item) => {
      const line = lineItems.find(
        candidate => candidate.feeStructureItemId === item.id,
      );
      return item.applicability !== 'ALL_STUDENTS' && line?.selected
        ? total + line.effectiveAmountPaise
        : total;
    },
    0,
  );
  const effectiveBeforeDiscount = lineItems.reduce(
    (total, item) => total + item.effectiveAmountPaise,
    0,
  );
  const customOverrideDeltaPaise = lineItems.reduce(
    (total, item) =>
      item.overrideType === 'CUSTOM_AMOUNT'
        ? total + item.effectiveAmountPaise - item.baseAmountPaise
        : total,
    0,
  );
  const exemptionAmountPaise = lineItems.reduce(
    (total, item) => total + (item.exempt ? item.baseAmountPaise : 0),
    0,
  );

  let remaining = effectiveBeforeDiscount;
  const discounts = input.discountAssignments
    .filter(item => item.status === 'ACTIVE')
    .map(assignment => {
      const definition = input.discountDefinitions.find(
        item =>
          item.id === assignment.discountDefinitionId &&
          item.status === 'ACTIVE',
      );
      if (!definition) return null;
      const scopedHeads =
        assignment.feeHeadIds.length > 0 &&
        definition.applicableFeeHeadIds.length > 0
          ? assignment.feeHeadIds.filter(headId =>
              definition.applicableFeeHeadIds.includes(headId),
            )
          : assignment.feeHeadIds.length > 0
            ? assignment.feeHeadIds
            : definition.applicableFeeHeadIds;
      const hasHeadScope =
        assignment.feeHeadIds.length > 0 ||
        definition.applicableFeeHeadIds.length > 0;
      const applicablePaise = lineItems
        .filter(
          item =>
            item.selected &&
            item.effectiveAmountPaise > 0 &&
            (!hasHeadScope || scopedHeads.includes(item.feeHeadId)),
        )
        .reduce((total, item) => total + item.effectiveAmountPaise, 0);
      let amountPaise =
        definition.type === 'FIXED'
          ? rupeesToPaise(definition.value)
          : Math.round((applicablePaise * definition.value) / 100);
      if (definition.maximumAmount !== undefined) {
        amountPaise = Math.min(
          amountPaise,
          rupeesToPaise(definition.maximumAmount),
        );
      }
      amountPaise = Math.max(0, Math.min(amountPaise, applicablePaise, remaining));
      remaining -= amountPaise;
      return {
        amountPaise,
        discountDefinitionId: definition.id,
        label: definition.name,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const discountAmountPaise = discounts.reduce(
    (total, item) => total + item.amountPaise,
    0,
  );

  return {
    currency: 'INR',
    customOverrideDeltaPaise,
    discountAmountPaise,
    discounts,
    estimatedFineRuleNames: [...(input.fineRuleNames ?? [])],
    exemptionAmountPaise,
    grossAmountPaise,
    lineItems,
    netConfiguredAmountPaise: Math.max(
      0,
      effectiveBeforeDiscount - discountAmountPaise,
    ),
    selectedOptionalAmountPaise,
    title: 'Estimated Fee Configuration',
  };
}
