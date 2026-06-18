export interface AppErrorLog {
  id: string;
  timestamp: string;
  scope: string;
  message: string;
}

const errorLogKey = 'orthotrackr_error_logs';

export function logAppError(scope: string, error: unknown): void {
  const logs = getErrorLogs();
  const message = error instanceof Error ? error.message : String(error);
  logs.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, timestamp: new Date().toISOString(), scope, message });
  localStorage.setItem(errorLogKey, JSON.stringify(logs.slice(0, 100)));
}

export function getErrorLogs(): AppErrorLog[] {
  const raw = localStorage.getItem(errorLogKey);
  return raw ? (JSON.parse(raw) as AppErrorLog[]) : [];
}

export function clearErrorLogs(): void {
  localStorage.removeItem(errorLogKey);
}
