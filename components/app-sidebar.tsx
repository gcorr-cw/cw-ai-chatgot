'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Input } from './ui/input';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedOptionsEnabled, setAdvancedOptionsEnabled] = useState(false);

  // Check if advanced options are enabled
  useEffect(() => {
    const savedState = localStorage.getItem('showAdvancedOptions');
    setAdvancedOptionsEnabled(savedState === 'true');
    
    // Listen for custom event for advanced options changes
    const handleAdvancedOptionsChange = (e: CustomEvent) => {
      setAdvancedOptionsEnabled(e.detail.enabled);
      // Hide search if advanced options are disabled
      if (!e.detail.enabled) {
        setShowSearch(false);
      }
    };
    
    // Add event listener for the custom event
    window.addEventListener('advancedOptionsChanged', handleAdvancedOptionsChange as EventListener);
    
    return () => {
      window.removeEventListener('advancedOptionsChanged', handleAdvancedOptionsChange as EventListener);
    };
  }, []);

  // Focus search input when search is shown
  useEffect(() => {
    if (showSearch) {
      const searchInput = document.getElementById('chat-search');
      if (searchInput) {
        searchInput.focus();
      }
    }
  }, [showSearch]);

  // Handle clearing search and closing search box
  const handleClearSearch = () => {
    setSearchQuery('');
    if (!searchQuery) {
      setShowSearch(false);
    }
  };

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span 
                className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer text-[#d14810] dark:text-gray-200"
              >
                CW-ChatGPT
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {advancedOptionsEnabled && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      type="button"
                      className={`p-2 h-fit ${showSearch ? 'text-primary' : ''}`}
                      onClick={() => setShowSearch(!showSearch)}
                    >
                      <Search size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent align="end">Search Chats</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      router.push('/');
                      setOpenMobile(false);
                    }}
                  >
                    <PlusIcon />
                    <span className="sr-only">New Chat</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Chat</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {showSearch && advancedOptionsEnabled && (
            <div className="mt-2 px-1 relative">
              <Input
                id="chat-search"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-8 bg-muted/30"
              />
              <Search 
                size={14} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={handleClearSearch}
                >
                  <X size={14} />
                  <span className="sr-only">Clear search</span>
                </Button>
              )}
            </div>
          )}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} searchQuery={searchQuery} />
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
    </Sidebar>
  );
}
