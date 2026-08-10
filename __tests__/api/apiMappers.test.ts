import {
  mapBackendDecimalToPaise,
  mapBackendId,
  mapBackendPage,
} from '../../src/services/api/apiMappers';

describe('backend DTO mappers', () => {
  it('maps backend IDs and decimal currency without changing domain types', () => {
    expect(mapBackendId(42)).toBe('42');
    expect(mapBackendDecimalToPaise('12.34')).toBe(1234);
  });

  it('maps DRF pagination separately from domain items', () => {
    expect(
      mapBackendPage(
        { count: 1, next: null, previous: null, results: [{ id: 7 }] },
        item => ({ id: String(item.id) }),
      ),
    ).toEqual({
      items: [{ id: '7' }],
      metadata: { count: 1, next: null, previous: null },
    });
  });
});
