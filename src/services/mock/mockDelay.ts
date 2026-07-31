export function mockDelay(durationMs = 450): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, durationMs)));
}
