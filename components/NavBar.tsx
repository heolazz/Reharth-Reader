import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Library, Layers, Sprout, Search, BookOpen, User, Compass, Download } from 'lucide-react';
import { Page } from '../types';
import { useAuthStore } from '../stores/useAuthStore';
import { ThemeToggle } from './ThemeToggle';

interface NavBarProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
    searchQuery: string;
    onSearch: (query: string) => void;
    onOpenProfile?: () => void;
    installPrompt?: any;
    onClearInstallPrompt?: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({ currentPage, onNavigate, searchQuery, onSearch, onOpenProfile, installPrompt, onClearInstallPrompt }) => {
    const { user } = useAuthStore();

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if running in standalone mode (installed as PWA)
        const checkStandalone = () => {
            const isWindowStandalone = (window.navigator as any).standalone === true;
            const isMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
            setIsStandalone(isWindowStandalone || isMediaStandalone);
        };

        checkStandalone();

        // Listen for changes (though rare for a mount)
        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        mediaQuery.addEventListener('change', checkStandalone);
        return () => mediaQuery.removeEventListener('change', checkStandalone);
    }, []);

    // Hide install button if already standalone or if not supported/available
    // On iOS we still show it if NOT standalone to provide instructions
    const shouldShowInstall = (!isStandalone && (installPrompt || isIOS));

    const handleInstallClick = async () => {
        if (isIOS) {
            alert("To install Reharth on your iPhone/iPad:\n\n1. Tap the Share button (rectangle with arrow)\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add'");
            return;
        }
        if (!installPrompt) {
            alert("App already installed or your browser doesn't support PWA installation. Please try using Chrome on Android, or check your home screen!");
            return;
        }
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            onClearInstallPrompt?.();
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
            <div className="hidden md:flex fixed top-0 left-0 right-0 z-40 bg-white/85 dark:bg-black/90 backdrop-blur-xl border-b border-black/5 dark:border-white/10 px-6 h-14 items-center justify-between transition-all">

                {/* 1. Logo Section */}
                <div className="flex items-center gap-3 w-1/4">
                    <div className="text-black dark:text-amber-500">
                        <Sprout size={20} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-lg font-medium text-black dark:text-stone-100 tracking-tight">Reharth</h1>
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
                                    ? 'text-black dark:text-amber-400 font-semibold'
                                    : 'text-black/50 dark:text-stone-400 hover:text-black/80 dark:hover:text-stone-200'
                                    }`}
                            >
                                <span className="text-sm font-medium tracking-wide">
                                    {item.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-underline"
                                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-black dark:bg-amber-400 rounded-full opacity-100"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 3. Right Section: Theme Toggle, Install App, Profile */}
                <div className="w-1/4 flex justify-end items-center gap-3">
                    <ThemeToggle variant="dropdown" />
                    {shouldShowInstall && (
                        <button
                            onClick={handleInstallClick}
                            className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#6B8E6D] hover:bg-[#5a7a5c] text-white rounded-full text-xs font-bold uppercase tracking-widest transition-colors shadow-sm"
                        >
                            <Download size={14} />
                            Install App
                        </button>
                    )}
                    {onOpenProfile && (
                        <button
                            onClick={onOpenProfile}
                            className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-full border border-transparent hover:border-black/10 dark:hover:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                        >
                            <span className="text-sm font-medium text-black dark:text-stone-200 hidden lg:block opacity-60 group-hover:opacity-100 transition-opacity">
                                {user?.name?.split(' ')[0] || 'Profile'}
                            </span>
                            <div className="w-8 h-8 rounded-full border border-black/10 dark:border-white/10 overflow-hidden shadow-sm group-hover:scale-105 transition-all">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-black dark:bg-amber-600 flex items-center justify-center text-[#F3F0EB] text-xs font-bold">
                                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* === MOBILE TOP BAR === */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/85 dark:bg-black/90 backdrop-blur-xl border-b border-[#3E2723]/5 dark:border-white/10 px-4 h-12 flex items-center justify-between transition-all">
                <div className="flex items-center gap-2">
                    <div className="text-black dark:text-amber-500">
                        <Sprout size={18} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-lg font-medium text-black dark:text-stone-100 tracking-tight">Reharth</h1>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle variant="icon-only" />
                    {shouldShowInstall && (
                        <button
                            onClick={handleInstallClick}
                            className="flex items-center gap-1.5 px-3 py-1 bg-[#6B8E6D] hover:bg-[#5a7a5c] text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm"
                        >
                            <Download size={12} />
                            Install
                        </button>
                    )}
                </div>
            </div>

            {/* === MOBILE BOTTOM NAV (iOS Tab Bar) === */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/85 dark:bg-black/90 backdrop-blur-2xl border-t border-[#3E2723]/10 dark:border-white/10 pb-safe">
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
                                <div className={`transition-all duration-200 ${isActive ? 'text-black dark:text-amber-400 scale-100' : 'text-[#999] dark:text-stone-400 scale-100'
                                    }`}>
                                    {isActive ? item.activeIcon : item.icon}
                                </div>
                                <span className={`text-[10px] font-medium tracking-tight transition-colors ${isActive ? 'text-black dark:text-amber-400 font-semibold' : 'text-[#999] dark:text-stone-400'
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
                            <div className={`transition-all duration-200 text-[#999] dark:text-stone-400 scale-100 items-center justify-center flex h-6 w-6 mt-0.5`}>
                                {user?.avatar_url ? (
                                    <div className="w-6 h-6 rounded-full overflow-hidden border border-[#3E2723]/20 dark:border-white/20">
                                        <img src={user.avatar_url} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <User size={24} strokeWidth={1.5} />
                                )}
                            </div>
                            <span className={`text-[10px] font-medium tracking-tight transition-colors text-[#999] dark:text-stone-400`}>
                                Profile
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
};
