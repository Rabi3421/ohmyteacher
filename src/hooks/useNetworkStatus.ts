import { useNetInfo } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  connectionType: string;
}

export function useNetworkStatus(): NetworkStatus {
  const netInfo = useNetInfo();

  return {
    isConnected: netInfo.isConnected,
    isInternetReachable: netInfo.isInternetReachable,
    connectionType: netInfo.type,
  };
}
