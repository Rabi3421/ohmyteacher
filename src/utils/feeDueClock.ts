export interface FeeDueClock {
  now(): Date;
  today(): string;
}

export const systemFeeDueClock: FeeDueClock = {
  now: () => new Date(),
  today: () => new Date().toISOString().slice(0, 10),
};

export function fixedFeeDueClock(isoDateTime: string): FeeDueClock {
  return {
    now: () => new Date(isoDateTime),
    today: () => isoDateTime.slice(0, 10),
  };
}
