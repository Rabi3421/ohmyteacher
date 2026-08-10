import { Platform } from 'react-native';

import {
  createApiConfiguration,
  getInjectedApiRuntimeConfig,
  type ApiTarget,
} from './apiConfig';

export type EnvironmentName =
  | 'development'
  | 'staging'
  | 'production'
  | 'test';
type DataSource = 'mock' | 'api';

export interface AppEnvironment {
  name: EnvironmentName;
  apiBaseUrl: string;
  apiTimeoutMs: number;
  apiTarget: ApiTarget;
  enableApiLogging: boolean;
  enableMocks: boolean;
  dataSource: DataSource;
}

const environmentName: EnvironmentName = __DEV__
  ? 'development'
  : 'production';
const api = createApiConfiguration({
  environment: environmentName,
  platform: Platform.OS === 'ios' ? 'ios' : 'android',
  ...getInjectedApiRuntimeConfig(),
});

export const env: AppEnvironment = {
  name: environmentName,
  apiBaseUrl: api.baseUrl,
  apiTimeoutMs: api.timeoutMs,
  apiTarget: api.target,
  enableApiLogging: api.enableLogging,
  enableMocks: __DEV__,
  dataSource: 'mock',
};
