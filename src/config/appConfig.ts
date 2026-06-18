export interface AppConfig {
  appName: string;
  backupRetentionDays: number;
  pendingReviewDays: number;
  imageMaxSize: number;
  imageQuality: number;
}

const configKey = 'orthotrackr_config';

export const defaultConfig: AppConfig = {
  appName: 'OrthoTrackr',
  backupRetentionDays: 7,
  pendingReviewDays: 25,
  imageMaxSize: 1280,
  imageQuality: 0.78
};

export function getAppConfig(): AppConfig {
  const raw = localStorage.getItem(configKey);
  if (!raw) return defaultConfig;
  return { ...defaultConfig, ...(JSON.parse(raw) as Partial<AppConfig>) };
}

export function saveAppConfig(config: AppConfig): void {
  localStorage.setItem(configKey, JSON.stringify(config));
}
