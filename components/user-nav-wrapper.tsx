'use client';
import { UserNav } from '@/components/user-nav';
import type { User } from 'next-auth';

export function UserNavWrapper({ user }: { user: User | undefined }) {
  if (!user) return null;
  return <UserNav user={user} />;
}