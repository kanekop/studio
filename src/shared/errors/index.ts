export enum ErrorCode {
  STORAGE_PERMISSION_DENIED = 'STORAGE_PERMISSION_DENIED',
  STORAGE_NOT_FOUND = 'STORAGE_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FIREBASE_AUTH_ERROR = 'FIREBASE_AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FIRESTORE_ERROR = 'FIRESTORE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public originalError?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
  }

  static isRetryable(error: AppError): boolean {
    return error.retryable;
  }

  static getUserMessage(error: AppError): string {
    switch (error.code) {
      case ErrorCode.STORAGE_PERMISSION_DENIED:
        return 'アクセス権限がありません。ログインし直してお試しください。';
      case ErrorCode.STORAGE_NOT_FOUND:
        return '画像が見つかりません。削除された可能性があります。';
      case ErrorCode.NETWORK_ERROR:
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      case ErrorCode.FIREBASE_AUTH_ERROR:
        return '認証エラーが発生しました。再度ログインしてください。';
      case ErrorCode.VALIDATION_ERROR:
        return '入力内容に問題があります。確認してください。';
      case ErrorCode.FIRESTORE_ERROR:
        return 'データベースエラーが発生しました。しばらく待ってからお試しください。';
      default:
        return '予期しないエラーが発生しました。';
    }
  }
}

export function handleStorageError(error: any): AppError {
  if (error.code === 'storage/unauthorized') {
    return new AppError(
      'アクセス権限がありません',
      ErrorCode.STORAGE_PERMISSION_DENIED,
      error,
      false
    );
  }
  if (error.code === 'storage/object-not-found') {
    return new AppError(
      '画像が見つかりません',
      ErrorCode.STORAGE_NOT_FOUND,
      error,
      false
    );
  }
  if (error.code === 'storage/retry-limit-exceeded' || error.name === 'NetworkError') {
    return new AppError(
      'ネットワークエラーが発生しました',
      ErrorCode.NETWORK_ERROR,
      error,
      true
    );
  }
  return new AppError(
    'ストレージエラーが発生しました',
    ErrorCode.UNKNOWN_ERROR,
    error,
    true
  );
}

export function handleFirestoreError(error: any): AppError {
  if (error.code === 'permission-denied') {
    return new AppError(
      'データベースへのアクセス権限がありません',
      ErrorCode.STORAGE_PERMISSION_DENIED,
      error,
      false
    );
  }
  if (error.code === 'unavailable') {
    return new AppError(
      'データベースが一時的に利用できません',
      ErrorCode.FIRESTORE_ERROR,
      error,
      true
    );
  }
  if (error.code === 'deadline-exceeded' || error.code === 'cancelled') {
    return new AppError(
      'データベース操作がタイムアウトしました',
      ErrorCode.NETWORK_ERROR,
      error,
      true
    );
  }
  return new AppError(
    'データベースエラーが発生しました',
    ErrorCode.FIRESTORE_ERROR,
    error,
    true
  );
}

export function handleAuthError(error: any): AppError {
  return new AppError(
    '認証エラーが発生しました',
    ErrorCode.FIREBASE_AUTH_ERROR,
    error,
    false
  );
}

export function createValidationError(message: string): AppError {
  return new AppError(
    message,
    ErrorCode.VALIDATION_ERROR,
    null,
    false
  );
}