// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

/**
 * Logger interface
 */
export interface Logger {
  /**
   * Log an debug message
   * @param msg - The message to log
   */
  readonly debug: (msg: string) => void;
  /**
   * Log an info message
   * @param msg - The message to log
   */
  readonly info: (msg: string) => void;
  /**
   * Log a warning message
   * @param msg - The message to log
   */
  readonly warn: (msg: string) => void;
  /**
   * Log an error message
   * @param msg - The message to log
   */
  readonly error: (msg: string) => void;
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'ignore';

/////////////////////////////////////////////////////////////////////

const logLevelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  ignore: 4,
};

/**
 * Create a console logger with log level filtering
 * @param prefix - Optional prefix
 * @param logLevel - Log level to filter messages (default: 'info')
 * @returns The logger
 */
export const createConsoleLogger = (
  prefix?: string,
  logLevel: LogLevel = 'info'
): Logger => {
  const currentLogLevel = logLevelPriority[logLevel];

  const shouldLog = (level: LogLevel): boolean => {
    return logLevelPriority[level] >= currentLogLevel;
  };

  const noop = () => {};

  return prefix
    ? {
        debug: shouldLog('debug')
          ? (msg) => console.debug(`[${prefix}]: [debug]: ${msg}`)
          : noop,
        info: shouldLog('info')
          ? (msg) => console.info(`[${prefix}]: [info]: ${msg}`)
          : noop,
        warn: shouldLog('warn')
          ? (msg) => console.warn(`[${prefix}]: [warning]: ${msg}`)
          : noop,
        error: shouldLog('error')
          ? (msg) => console.error(`[${prefix}]: [error]: ${msg}`)
          : noop,
      }
    : {
        debug: shouldLog('debug')
          ? (msg) => console.debug(`[debug]: ${msg}`)
          : noop,
        info: shouldLog('info') ? (msg) => console.info(`info]: ${msg}`) : noop,
        warn: shouldLog('warn')
          ? (msg) => console.warn(`[warning]: ${msg}`)
          : noop,
        error: shouldLog('error')
          ? (msg) => console.error(`[error]: ${msg}`)
          : noop,
      };
};
