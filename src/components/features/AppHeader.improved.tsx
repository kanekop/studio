"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, SmilePlus, Users, LogIn, UserPlus, Home, Settings, LogOut, Network, Building } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useFaceRoster } from '@/contexts';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const { currentUser, isAuthLoading } = useAuth();
  const { clearAllData, clearCurrentRoster } = useFaceRoster();
  const { handleError } = useErrorHandler();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await clearAllData();
      await signOut(auth);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Logout failed'));
    }
  };

  const handleHomeClick = () => {
    clearCurrentRoster();
    router.push('/');
  };

  const navLinks = [
    { label: 'Home', icon: Home, action: handleHomeClick },
    { label: 'People', icon: Users, href: '/people' },
    { label: 'Connections', icon: Network, href: '/connections' },
  ];

  const renderAuthSection = () => {
    if (isAuthLoading) {
      return <Skeleton className="h-9 w-24" />;
    }

    if (!currentUser) {
      return (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Log In
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">
              <UserPlus className="mr-2 h-4 w-4" />
              Sign Up
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium">
                {currentUser.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {currentUser.displayName || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {currentUser.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderNavigation = () => (
    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
      {navLinks.map((link) => {
        const Icon = link.icon;
        if (link.action) {
          return (
            <button
              key={link.label}
              onClick={link.action}
              className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center bg-transparent border-none p-0"
            >
              <Icon className="mr-2 h-4 w-4" />
              {link.label}
            </button>
          );
        }
        return (
          <Link
            key={link.href}
            href={link.href!}
            className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center"
          >
            <Icon className="mr-2 h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  const renderMobileNavigation = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <div className="flex flex-col space-y-4 mt-6">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-2 text-lg font-semibold">FaceRoster</h2>
            <nav className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                if (link.action) {
                  return (
                    <button
                      key={link.label}
                      onClick={link.action}
                      className="w-full flex items-center px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors bg-transparent border-none"
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {link.label}
                    </button>
                  );
                }
                return (
                  <Link
                    key={link.href}
                    href={link.href!}
                    className="flex items-center px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          {currentUser && (
            <>
              <div className="px-3 py-2 border-t">
                <div className="flex flex-col space-y-2">
                  <div className="px-2">
                    <p className="text-sm font-medium">
                      {currentUser.displayName || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start px-2"
                    asChild
                  >
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start px-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          {renderMobileNavigation()}
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <SmilePlus className="h-6 w-6 text-primary" />
            <span className="font-headline font-bold text-xl hidden sm:inline-block">
              FaceRoster
            </span>
          </Link>
        </div>
        
        {renderNavigation()}
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          {renderAuthSection()}
        </div>
      </div>
    </header>
  );
}