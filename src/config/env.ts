type EnvironmentName = 'development' | 'staging' | 'production';
type DataSource = 'mock' | 'api';

export interface AppEnvironment {
  name: EnvironmentName;
  apiBaseUrl: string;
  apiTimeoutMs: number;
  enableMocks: boolean;
  dataSource: DataSource;
}

export const env: AppEnvironment = {
  name: __DEV__ ? 'development' : 'production',
  apiBaseUrl: 'http://localhost:8000/api',
  apiTimeoutMs: 15_000,
  enableMocks: __DEV__,
  dataSource: 'mock',
};
