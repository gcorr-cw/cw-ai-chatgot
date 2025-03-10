'use client';
import { ChevronUp, LogOut, Moon, Sun } from 'lucide-react';
import Image from 'next/image';
import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function UserNav({ user }: { user: User }) {
  const { setTheme, theme } = useTheme();

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
        <DropdownMenuSeparator />
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