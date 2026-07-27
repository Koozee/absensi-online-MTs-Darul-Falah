import { GasConfig } from './types';

export const APP_CONFIG = {
  gasConfig: {
    webAppUrl: import.meta.env.VITE_GAS_WEB_APP_URL || '',
    autoSync: true
  } as GasConfig
};
