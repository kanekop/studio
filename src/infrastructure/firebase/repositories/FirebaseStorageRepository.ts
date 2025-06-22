import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../config';
import { IStorageRepository } from '@/domain/repositories/IStorageRepository';

export class FirebaseStorageRepository implements IStorageRepository {
  async upload(path: string, file: File): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      // It's better to let the caller handle the error to provide specific user feedback.
      // Here we can log it for debugging purposes.
      console.error("FirebaseStorageRepository: Error uploading file.", {
        path,
        error,
      });
      // Re-throw the error to be caught by the use case/application service.
      throw new Error('Failed to upload file.');
    }
  }
} 