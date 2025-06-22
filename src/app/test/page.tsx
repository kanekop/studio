'use client';
import { useEffect, useState } from 'react';
import { auth, db, storage } from '@/infrastructure/firebase/config';
import { debugLog } from '@/shared/utils/debug-logger';

export default function TestPage() {
  const [status, setStatus] = useState<Record<string, any>>({});

  useEffect(() => {
    const checkFirebase = async () => {
      try {
        debugLog.info('TestPage', 'Starting Firebase connection test');
        
        const user = auth?.currentUser;
        setStatus(prev => ({ 
          ...prev, 
          auth: !!auth, 
          db: !!db,
          storage: !!storage,
          user: !!user,
          timestamp: new Date().toISOString()
        }));

        debugLog.info('TestPage', 'Firebase services status', {
          auth: !!auth,
          db: !!db,
          storage: !!storage,
          user: !!user
        });

      } catch (error) {
        debugLog.error('TestPage', error);
        setStatus(prev => ({ ...prev, authError: true, error: error }));
      }
    };
    
    checkFirebase();
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">System Status Test</h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Firebase Services</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(status, null, 2)}
        </pre>
      </div>
      
      <div className="mt-6 space-y-4">
        <div className="bg-white p-4 border rounded">
          <h3 className="font-medium">Auth Status</h3>
          <p className={status.auth ? 'text-green-600' : 'text-red-600'}>
            {status.auth ? '✓ Available' : '✗ Not Available'}
          </p>
        </div>
        
        <div className="bg-white p-4 border rounded">
          <h3 className="font-medium">Firestore Status</h3>
          <p className={status.db ? 'text-green-600' : 'text-red-600'}>
            {status.db ? '✓ Available' : '✗ Not Available'}
          </p>
        </div>
        
        <div className="bg-white p-4 border rounded">
          <h3 className="font-medium">Storage Status</h3>
          <p className={status.storage ? 'text-green-600' : 'text-red-600'}>
            {status.storage ? '✓ Available' : '✗ Not Available'}
          </p>
        </div>
      </div>
    </div>
  );
}