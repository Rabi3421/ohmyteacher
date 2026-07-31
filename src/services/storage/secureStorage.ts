import * as Keychain from 'react-native-keychain';

const SERVICE_PREFIX = 'com.ohmyteacher.storage.';
const STORAGE_USERNAME = 'ohmyteacher';

function serviceForKey(key: string): string {
  return `${SERVICE_PREFIX}${key}`;
}

export interface SecureStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export const secureStorage: SecureStorage = {
  async setItem(key, value) {
    const saved = await Keychain.setGenericPassword(STORAGE_USERNAME, value, {
      service: serviceForKey(key),
    });

    if (!saved) {
      throw new Error(`Unable to securely store "${key}".`);
    }
  },

  async getItem(key) {
    const credentials = await Keychain.getGenericPassword({
      service: serviceForKey(key),
    });

    return credentials ? credentials.password : null;
  },

  async removeItem(key) {
    await Keychain.resetGenericPassword({ service: serviceForKey(key) });
  },

  async clear() {
    const services = await Keychain.getAllGenericPasswordServices();
    const appServices = services.filter(service =>
      service.startsWith(SERVICE_PREFIX),
    );
    await Promise.all(
      appServices.map(service =>
        Keychain.resetGenericPassword({
          service,
        }),
      ),
    );
  },
};
