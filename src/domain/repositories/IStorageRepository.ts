export interface IStorageRepository {
  /**
   * Uploads a file to a specified path in the storage.
   * @param path The full path in storage where the file should be saved (e.g., 'users/userId/rosters/fileName.jpg').
   * @param file The file object to upload.
   * @returns A promise that resolves with the public download URL of the uploaded file.
   */
  upload(path: string, file: File): Promise<string>;
} 