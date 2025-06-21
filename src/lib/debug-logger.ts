// Debug logging utility for systematic error tracking
export const debugLog = {
  error: (location: string, error: any) => {
    console.error(`[${location}]`, {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      timestamp: new Date().toISOString()
    });
  },
  warn: (location: string, message: string, data?: any) => {
    console.warn(`[${location}] ${message}`, data);
  },
  info: (location: string, message: string, data?: any) => {
    console.info(`[${location}] ${message}`, data);
  },
  debug: (location: string, message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${location}] ${message}`, data);
    }
  }
};

// Environment-based logging with different levels
const LOG_LEVEL = process.env.NEXT_PUBLIC_LOG_LEVEL || 'error';

export const log = {
  debug: (...args: any[]) => {
    if (['debug'].includes(LOG_LEVEL)) console.log(...args);
  },
  info: (...args: any[]) => {
    if (['debug', 'info'].includes(LOG_LEVEL)) console.info(...args);
  },
  warn: (...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(LOG_LEVEL)) console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  }
};