export interface CommunicationClock {
  now(): string;
  today(): string;
}

export const systemCommunicationClock: CommunicationClock = {
  now: () => new Date().toISOString(),
  today: () => new Date().toISOString().slice(0, 10),
};
