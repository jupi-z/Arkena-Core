const startedAt = new Date();

let shuttingDown = false;

export function getStartedAt(): Date {
  return startedAt;
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

export function markShuttingDown(): void {
  shuttingDown = true;
}
