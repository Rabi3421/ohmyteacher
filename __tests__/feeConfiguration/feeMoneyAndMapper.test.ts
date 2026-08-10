import {
  mapCreateFeeStructureItemRequest,
  mapUpdateFeeStructureItemRequest,
  parseFeeHead,
  parseFeeHeadList,
  parseFeeStructureItem,
} from '../../src/services/feeConfiguration/currentFeeConfigurationMapper';
import {
  addFeePaise,
  feePaiseToDto,
  MAX_FEE_AMOUNT_PAISE,
  parseFeeAmountDto,
  parseFeeAmountInput,
} from '../../src/utils/feeMoney';

const head = {
  created_at: '2026-08-03T10:00:00Z',
  frequency: 'monthly',
  id: 7,
  is_active: true,
  name: 'Tuition Fee',
  school: 1,
};
const item = {
  amount: '800.00',
  created_at: '2026-08-03T10:00:00Z',
  fee_head: 7,
  id: 9,
  is_mandatory: true,
  school_class: 21,
};

describe('exact fee money', () => {
  it.each([
    ['0', 0, '0.00'],
    ['0.01', 1, '0.01'],
    ['800.5', 80_050, '800.50'],
    ['99999999.99', MAX_FEE_AMOUNT_PAISE, '99999999.99'],
  ])('round trips %s exactly', (input, paise, canonical) => {
    expect(parseFeeAmountInput(input)).toBe(paise);
    expect(feePaiseToDto(paise)).toBe(canonical);
    expect(parseFeeAmountDto(canonical)).toBe(paise);
  });

  it.each(['-1.00', 'NaN', 'Infinity', '1,000.00', '1.001', '+1.00', '01.00', '100000000.00', ''])('rejects malformed or excessive input %s', value => {
    expect(() => parseFeeAmountInput(value)).toThrow();
  });

  it('requires canonical fixed-scale strings from DRF', () => {
    expect(() => parseFeeAmountDto('1')).toThrow();
    expect(() => parseFeeAmountDto(1)).toThrow();
  });

  it('adds exact integer paise and rejects invalid totals', () => {
    expect(addFeePaise([1, 80_050, 99])).toBe(80_150);
    expect(() => addFeePaise([1.5])).toThrow();
  });
});

describe('fee configuration mapper', () => {
  it('maps exact Head envelopes and rejects unknown frequency', () => {
    expect(parseFeeHead({ fee_head: head, success: true })).toMatchObject({ frequency: 'MONTHLY', id: '7', schoolId: '1', status: 'ACTIVE' });
    expect(parseFeeHeadList({ fee_heads: [{ ...head, frequency: 'one_time', is_active: false }], success: true })[0]).toMatchObject({ frequency: 'ONE_TIME', status: 'INACTIVE' });
    expect(() => parseFeeHead({ fee_head: { ...head, frequency: 'quarterly' }, success: true })).toThrow();
  });

  it('maps Item decimal strings to exact paise', () => {
    expect(parseFeeStructureItem({ fee_structure_item: item, success: true })).toEqual({ amountPaise: 80_000, classId: '21', createdAt: item.created_at, feeHeadId: '7', id: '9', mandatory: true });
  });

  it('creates exact Item bodies and changed-field PATCH bodies', () => {
    expect(mapCreateFeeStructureItemRequest({ amountPaise: 80_050, classId: '21', feeHeadId: '7', mandatory: false })).toEqual({ amount: '800.50', fee_head: 7, is_mandatory: false, school_class: 21 });
    expect(mapUpdateFeeStructureItemRequest({ amountPaise: 1 })).toEqual({ amount: '0.01' });
    expect(() => mapUpdateFeeStructureItemRequest({})).toThrow();
  });
});
