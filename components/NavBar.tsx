import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Library, Layers, Sprout, Search, BookOpen, User, Compass, Download } from 'lucide-react';
import { Page } from '../types';
import { useAuthStore } from '../stores/useAuthStore';

interface NavBarProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
    searchQuery: string;
    onSearch: (query: string) => void;
    onOpenProfile?: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({ currentPage, onNavigate, searchQuery, onSearch, onOpenProfile }) => {
    const { user } = useAuthStore();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert("App already installed or your browser doesn't support PWA installation right now. Please try using Chrome or Safari, or check your home screen!");
            return;
        }
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    // Apple Books style icons
    const navItems: { id: Page; label: string; icon: React.ReactNode; activeIcon: React.ReactNode }[] = [
        {
            id: 'home',
            label: 'Reading Now',
            icon: <BookOpen size={24} strokeWidth={1.5} />,
            activeIcon: <BookOpen size={24} strokeWidth={2.5} fill="currentColor" fillOpacity={0.1} />
        },
        {
            id: 'library',
            label: 'Library',
            icon: <Library size={24} strokeWidth={1.5} />,
            activeIcon: <Library size={24} strokeWidth={2.5} fill="currentColor" fillOpacity={0.1} />
        },
        {
            id: 'collections',
            label: 'Collections',
            icon: <Layers size={24} strokeWidth={1.5} />,
            activeIcon: <Layers size={24} strokeWidth={2.5} fill="currentColor" fillOpacity={0.1} />
        },
        {
            id: 'explore',
            label: 'Explore',
            icon: <Compass size={24} strokeWidth={1.5} />,
            activeIcon: <Compass size={24} strokeWidth={2.5} fill="currentColor" fillOpacity={0.1} />
        },
    ];

    return (
        <nav>
            {/* === DESKTOP TOP BAR (macOS Style) === */}
            <div className="hidden md:flex fixed top-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5 px-6 h-14 items-center justify-between transition-all">

                {/* 1. Logo Section */}
                <div className="flex items-center gap-3 w-1/4">
                    <div className="text-black">
                        <Sprout size={20} strokeWidth={1.5} />
                    </div>
                    {/* Apple Books style often hides app name in toolbar, but we keep it subtle */}
                    <h1 className="text-lg font-medium text-black tracking-tight">Reharth</h1>
                </div>

                {/* 2. Navigation Menu (Centered - Text Links) */}
                <div className="flex-1 flex justify-center gap-8">
                    {navItems.map((item) => {
                        const isActive = currentPage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className={`relative px-2 py-1 flex items-center gap-2 transition-all duration-200 group ${isActive
                                    ? 'text-black'
                                    : 'text-black/50 hover:text-black/80'
                                    }`}
                            >
                                <span className="text-sm font-medium tracking-wide">
                                    {item.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-underline"
                                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-black rounded-full opacity-0" // Subtle or hidden underline
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 3. Search Bar (Right - macOS Search Field) */}
                <div className="w-1/4 flex justify-end items-center gap-2">
                    <button
                        onClick={handleInstallClick}
                        className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#6B8E6D] hover:bg-[#5a7a5c] text-white rounded-full text-xs font-bold uppercase tracking-widest transition-colors shadow-sm"
                    >
                        <Download size={14} />
                        Install App
                    </button>
                    {onOpenProfile && (
                        <button
                            onClick={onOpenProfile}
                            className="ml-6 flex items-center gap-3 pl-3 pr-1 py-1 rounded-full border border-transparent hover:border-black/10 hover:bg-black/5 transition-all group"
                        >
                            <span className="text-sm font-medium text-black hidden lg:block opacity-60 group-hover:opacity-100 transition-opacity">
                                {user?.name?.split(' ')[0] || 'Profile'}
                            </span>
                            <div className="w-8 h-8 rounded-full border border-black/10 overflow-hidden shadow-sm group-hover:scale-105 transition-all">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-black flex items-center justify-center text-[#F3F0EB] text-xs font-bold">
                                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                        </button>
                    )}
                </div>
            </div>

            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-xl border-b border-[#3E2723]/5 px-4 h-12 flex items-center justify-between transition-all">
                <div className="flex items-center gap-2">
                    <div className="text-black">
                        <Sprout size={18} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-lg font-medium text-black tracking-tight">Reharth</h1>
                </div>
                <button
                    onClick={handleInstallClick}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#6B8E6D] hover:bg-[#5a7a5c] text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm"
                >
                    <Download size={12} />
                    Install
                </button>
            </div>

            {/* === MOBILE BOTTOM NAV (iOS Tab Bar) === */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-2xl border-t border-[#3E2723]/10 pb-safe">
                <div className="flex justify-around items-end pt-2 pb-1">
                    {navItems.map((item) => {
                        const isActive = currentPage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 active:opacity-70 transition-opacity`}
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                <div className={`transition-all duration-200 ${isActive ? 'text-black scale-100' : 'text-[#999] scale-100'
                                    }`}>
                                    {isActive ? item.activeIcon : item.icon}
                                </div>
                                <span className={`text-[10px] font-medium tracking-tight transition-colors ${isActive ? 'text-black' : 'text-[#999]'
                                    }`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}

                    {/* Profile Tab */}
                    {onOpenProfile && (
                        <button
                            onClick={onOpenProfile}
                            className={`flex-1 flex flex-col items-center justify-center gap-1 active:opacity-70 transition-opacity`}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <div className={`transition-all duration-200 text-[#999] scale-100 items-center justify-center flex h-6 w-6 mt-0.5`}>
                                {user?.avatar_url ? (
                                    <div className="w-6 h-6 rounded-full overflow-hidden border border-[#3E2723]/20">
                                        <img src={user.avatar_url} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <User size={24} strokeWidth={1.5} />
                                )}
                            </div>
                            <span className={`text-[10px] font-medium tracking-tight transition-colors text-[#999]`}>
                                Profile
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
};
