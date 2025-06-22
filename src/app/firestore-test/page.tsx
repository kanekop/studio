'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Button } from '@/components/ui/button';

export default function FirestoreTestPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [writeStatus, setWriteStatus] = useState<string>('');

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleWriteTest = async () => {
    if (!db) {
      setWriteStatus('Error: Firestore is not initialized.');
      return;
    }
    if (!currentUser) {
      setWriteStatus('Error: User is not logged in. Cannot perform write test.');
      return;
    }

    setWriteStatus('Attempting to write to Firestore...');
    try {
      const testDocRef = doc(db, 'test_writes', currentUser.uid);
      await setDoc(testDocRef, {
        message: 'This is a test write from the firestore-test page.',
        timestamp: Timestamp.now(),
        userEmail: currentUser.email
      });
      setWriteStatus(`Success! Document written to /test_writes/${currentUser.uid}`);
    } catch (error: any) {
      console.error("Firestore write failed:", error);
      setWriteStatus(`Error writing to Firestore: ${error.message}`);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Firestore Write Test</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="font-semibold">Auth Status</h2>
        {isLoading ? (
          <p>Checking auth status...</p>
        ) : currentUser ? (
          <div>
            <p className="text-green-600">Logged in as:</p>
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>UID:</strong> {currentUser.uid}</p>
          </div>
        ) : (
          <p className="text-red-600">Not logged in.</p>
        )}
      </div>

      <div className="flex flex-col items-center">
        <Button 
          onClick={handleWriteTest} 
          disabled={!currentUser || isLoading}
          className="mb-4"
        >
          Perform Write Test
        </Button>
        {writeStatus && (
          <div className="w-full p-4 bg-blue-100 border border-blue-400 rounded">
            <h3 className="font-semibold mb-2">Write Result:</h3>
            <p className="text-sm break-words">{writeStatus}</p>
          </div>
        )}
      </div>
    </div>
  );
} 