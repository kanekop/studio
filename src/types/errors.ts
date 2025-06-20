export enum ErrorType {
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  STORAGE = 'STORAGE',
  FIRESTORE = 'FIRESTORE',
  UNKNOWN = 'UNKNOWN'
}

export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public originalError?: any,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }

  static fromFirebaseError(error: any): AppError {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    if (errorCode.includes('permission-denied')) {
      return new AppError(
        'アクセス権限がありません',
        ErrorType.PERMISSION,
        error,
        errorCode
      );
    }

    if (errorCode.includes('not-found') || errorCode.includes('object-not-found')) {
      return new AppError(
        'リソースが見つかりません',
        ErrorType.NOT_FOUND,
        error,
        errorCode
      );
    }

    if (errorCode.includes('network') || errorCode.includes('unavailable')) {
      return new AppError(
        'ネットワークエラーが発生しました',
        ErrorType.NETWORK,
        error,
        errorCode
      );
    }

    if (errorCode.includes('unauthenticated')) {
      return new AppError(
        '認証が必要です',
        ErrorType.AUTHENTICATION,
        error,
        errorCode
      );
    }

    if (errorCode.includes('storage')) {
      return new AppError(
        'ストレージエラーが発生しました',
        ErrorType.STORAGE,
        error,
        errorCode
      );
    }

    if (errorCode.includes('firestore')) {
      return new AppError(
        'データベースエラーが発生しました',
        ErrorType.FIRESTORE,
        error,
        errorCode
      );
    }

    return new AppError(
      errorMessage,
      ErrorType.UNKNOWN,
      error,
      errorCode
    );
  }

  static isNetworkError(error: any): boolean {
    return error instanceof AppError && error.type === ErrorType.NETWORK;
  }

  static isPermissionError(error: any): boolean {
    return error instanceof AppError && error.type === ErrorType.PERMISSION;
  }

  static isNotFoundError(error: any): boolean {
    return error instanceof AppError && error.type === ErrorType.NOT_FOUND;
  }
}