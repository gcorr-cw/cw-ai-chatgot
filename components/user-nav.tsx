'use client';
import { ChevronUp, LogOut, Moon, Sun, MessageSquare, FileText, GitCompare } from 'lucide-react';
import Image from 'next/image';
import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function UserNav({ user }: { user: User }) {
  const { setTheme, theme } = useTheme();
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Load advanced options state from localStorage on initial render
  useEffect(() => {
    const savedState = localStorage.getItem('showAdvancedOptions');
    if (savedState !== null) {
      setShowAdvancedOptions(savedState === 'true');
    }
  }, []);

  // Update localStorage when advanced options state changes
  const handleAdvancedOptionsChange = (value: boolean) => {
    setShowAdvancedOptions(value);
    localStorage.setItem('showAdvancedOptions', String(value));
    
    // Dispatch a custom event to notify other components
    const event = new CustomEvent('advancedOptionsChanged', { 
      detail: { enabled: value } 
    });
    window.dispatchEvent(event);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
          <Image
            src={`/images/CwOnlyLogo.png`}
            alt={'CW'}
            width={32}
            height={32}
            className="rounded-full"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user?.email && <p className="font-medium text-sm">{user.email}</p>}
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="advanced-options" className="text-sm cursor-pointer text-gray-400 dark:text-gray-500">Advanced options</Label>
          </div>
          <div className="ml-4">
            <Switch 
              id="advanced-options" 
              checked={showAdvancedOptions}
              onCheckedChange={handleAdvancedOptionsChange}
              size="sm"
              className="data-[state=checked]:bg-gray-600 data-[state=unchecked]:bg-gray-400 dark:data-[state=checked]:bg-gray-400 dark:data-[state=unchecked]:bg-gray-600"
            />
          </div>
        </div>
        
        {showAdvancedOptions && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="h-4 w-4" />
                Chat
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/markdown" className="flex items-center gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                Markdown utility
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/diffview" className="flex items-center gap-2 cursor-pointer">
                <GitCompare className="h-4 w-4" />
                Text compare
              </Link>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer flex items-center gap-2"
          onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <button
            type="button"
            className="w-full cursor-pointer flex items-center gap-2"
            onClick={() => {
              signOut({
                redirectTo: '/',
              });
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}