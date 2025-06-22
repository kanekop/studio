'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        if (auth) {
          await signOut(auth);
          console.log("Successfully signed out.");
        }
      } catch (error) {
        console.error('Error during logout:', error);
      } finally {
        // Redirect to login page after trying to logout
        router.push('/login');
      }
    };

    performLogout();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold mb-2">Logging Out</h1>
        <p className="text-gray-600">Please wait while we sign you out...</p>
      </div>
    </div>
  );
} 