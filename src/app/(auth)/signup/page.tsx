
"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
// import { auth } from '@/lib/firebase';
// import { useToast } from '@/hooks/use-toast';
// import { useRouter } from 'next/navigation';

// TODO: Implement full signup logic

export default function SignupPage() {
  // const router = useRouter();
  // const { toast } = useToast();
  // const [email, setEmail] = React.useState('');
  // const [password, setPassword] = React.useState('');
  // const [confirmPassword, setConfirmPassword] = React.useState('');
  // const [isLoading, setIsLoading] = React.useState(false);

  // const handleSignup = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (password !== confirmPassword) {
  //     toast({ title: "Signup Failed", description: "Passwords do not match.", variant: "destructive" });
  //     return;
  //   }
  //   setIsLoading(true);
  //   try {
  //     await createUserWithEmailAndPassword(auth, email, password);
  //     toast({ title: "Signup Successful", description: "Welcome! You can now log in." });
  //     router.push('/login'); 
  //   } catch (error: any) {
  //     toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  
  // const handleGoogleSignIn = async () => {
  //   setIsLoading(true);
  //   const provider = new GoogleAuthProvider();
  //   try {
  //     await signInWithPopup(auth, provider);
  //     toast({ title: "Sign-in Successful", description: "Welcome!" });
  //     router.push('/'); 
  //   } catch (error: any) {
  //     toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join FaceRoster to save your visual rosters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {/* <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Sign up with Google'}
          </Button> */}
          <p className="text-center text-muted-foreground p-8">
            Signup form will be implemented here.
          </p>
        </CardContent>
        <CardFooter className="text-center block">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
