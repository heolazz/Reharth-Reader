import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Camera, LogOut, Loader2,
    User, Mail, Globe, AtSign, Quote, LayoutDashboard
} from 'lucide-react';
import { Page } from '../types';
import { useAuthStore } from '../stores/useAuthStore';
import { Toast, useToast } from './Toast';

interface ProfilePageProps {
    onBack: () => void;
    onNavigate?: (page: Page) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, onNavigate }) => {
    const { user, signOut } = useAuthStore();
    const { toast, showToast, hideToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [website, setWebsite] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Animation Variants ---
    const pageVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.6 } },
        exit: { opacity: 0 }
    };

    const contentVariants = {
        initial: { y: 20, opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { delay: 0.2, duration: 0.5 } }
    };

    useEffect(() => {
        if (user) loadProfile();
    }, [user]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const { getUserProfile } = await import('../lib/supabaseDb');
            const profile = await getUserProfile();
            if (profile) {
                setFullName(profile.full_name || '');
                setUsername(profile.username || '');
                setWebsite(profile.website || '');
                setAvatarUrl(profile.avatar_url);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { updateUserProfile } = await import('../lib/supabaseDb');
            await updateUserProfile({
                full_name: fullName,
                username,
                website,
                avatar_url: avatarUrl || undefined,
            });
            showToast('Profile updated successfully', 'success');
        } catch (error) {
            showToast('Failed to update', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        try {
            setLoading(true);
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { supabase } = await import('../lib/supabase');

            let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setAvatarUrl(publicUrl);

            // Auto save
            const { updateUserProfile } = await import('../lib/supabaseDb');
            await updateUserProfile({ avatar_url: publicUrl });

            showToast('Photo updated', 'success');
        } catch (error) {
            showToast('Error uploading', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 flex flex-col md:flex-row bg-white text-[#2D2A26] font-sans overflow-hidden"
        >
            <Toast {...toast} onClose={hideToast} />

            {/* --- LEFT COLUMN: MOODY / IMAGE SIDE (Desktop) / HEADER (Mobile) --- */}
            <div className="w-full md:w-[40%] lg:w-[35%] bg-[#1a1614] relative flex flex-col justify-between p-8 md:p-12 text-[#F8F5F1] overflow-hidden shrink-0">
                {/* Background Image Effect */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop"
                        alt="Library"
                        className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#1a1614]/30 via-[#1a1614]/60 to-[#1a1614] z-10" />
                </div>

                {/* Top Nav (Left) */}
                <div className="relative z-20 flex justify-between items-center md:block">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-medium tracking-wide uppercase">Back</span>
                    </button>
                    {/* Mobile Title */}
                    <span className="md:hidden font-serif text-lg italic">Profile</span>
                </div>

                {/* Avatar Section (Centered in Left Panel) */}
                <div className="relative z-20 flex flex-col items-center text-center mt-8 md:mt-0">
                    <div
                        className="relative group cursor-pointer mb-6"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-24 h-24 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-[#F8F5F1]/10 shadow-2xl relative">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="User" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full bg-[#2D2A26] flex items-center justify-center text-white/20">
                                    <User size={40} strokeWidth={1} />
                                </div>
                            )}
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Camera size={20} className="text-white drop-shadow-md" />
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-[#6B8E6D] text-white p-1.5 rounded-full shadow-lg md:hidden">
                            <Camera size={12} />
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-serif leading-tight mb-1">
                        {fullName || 'Your Name'}
                    </h2>
                    <p className="text-white/50 text-xs md:text-sm font-medium tracking-wide">
                        @{username || 'username'}
                    </p>
                </div>

                {/* Bottom Quote (Desktop Only) */}
                <div className="relative z-20 hidden md:block">
                    <Quote size={24} className="text-white/20 mb-3" />
                    <p className="font-serif text-xl leading-snug text-white/90 italic">
                        "A reader lives a thousand lives before he dies."
                    </p>
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">George R.R. Martin</span>
                    </div>
                </div>
            </div>

            {/* --- RIGHT COLUMN: FORM SIDE --- */}
            <div className="flex-1 bg-white overflow-y-auto w-full">
                <div className="max-w-2xl mx-auto px-6 py-10 md:p-16 lg:p-24 min-h-full flex flex-col justify-center">

                    <motion.div variants={contentVariants} initial="initial" animate="animate">
                        <div className="mb-8 text-center md:text-left">
                            <h1 className="font-serif text-3xl md:text-4xl text-[#3D3028] mb-2 font-medium">Edit Profile</h1>
                            <p className="text-[#3D3028]/50 text-sm">Update your personal details.</p>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-5">

                            {/* Input Group: Full Name */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#3D3028]/40 uppercase tracking-widest ml-1">
                                    Full Name
                                </label>
                                <div className="bg-white p-3 md:p-3.5 rounded-xl shadow-sm border border-[#3D3028]/10 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#6B8E6D]/10 focus-within:border-[#6B8E6D]/30 transition-all">
                                    <User size={16} className="text-[#3D3028]/30" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        className="flex-1 bg-transparent outline-none text-sm text-[#3D3028] placeholder-[#3D3028]/20 font-medium"
                                    />
                                </div>
                            </div>

                            {/* Input Group: Username */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#3D3028]/40 uppercase tracking-widest ml-1">
                                    Username
                                </label>
                                <div className="bg-white p-3 md:p-3.5 rounded-xl shadow-sm border border-[#3D3028]/10 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#6B8E6D]/10 focus-within:border-[#6B8E6D]/30 transition-all">
                                    <AtSign size={16} className="text-[#3D3028]/30" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="username"
                                        className="flex-1 bg-transparent outline-none text-sm text-[#3D3028] placeholder-[#3D3028]/20 font-medium"
                                    />
                                </div>
                            </div>

                            {/* Input Group: Website */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#3D3028]/40 uppercase tracking-widest ml-1">
                                    Website
                                </label>
                                <div className="bg-white p-3 md:p-3.5 rounded-xl shadow-sm border border-[#3D3028]/10 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#6B8E6D]/10 focus-within:border-[#6B8E6D]/30 transition-all">
                                    <Globe size={16} className="text-[#3D3028]/30" />
                                    <input
                                        type="url"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        placeholder="https://your-site.com"
                                        className="flex-1 bg-transparent outline-none text-sm text-[#3D3028] placeholder-[#3D3028]/20 font-medium"
                                    />
                                </div>
                            </div>

                            {/* Read-Only: Email */}
                            <div className="space-y-1.5 opacity-60 pointer-events-none">
                                <label className="text-[10px] font-bold text-[#3D3028]/40 uppercase tracking-widest ml-1">
                                    Email Address
                                </label>
                                <div className="bg-[#F8F5F1] p-3 md:p-3.5 rounded-xl border border-[#3D3028]/5 flex items-center gap-3">
                                    <Mail size={16} className="text-[#3D3028]/30" />
                                    <span className="flex-1 text-[#3D3028]/60 text-sm font-medium">{user?.email}</span>
                                </div>
                            </div>

                            <div className="pt-6 space-y-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#6B8E6D] hover:bg-[#5a7a5c] text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-[#6B8E6D]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                                </button>

                                {/* Admin Button - Only visible to admin users */}
                                {user?.role === 'admin' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onNavigate?.('admin');
                                        }}
                                        className="w-full py-3.5 bg-[#3D3028] text-[#F9F7F2] rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg hover:bg-[#2C1810] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LayoutDashboard size={14} />
                                        Admin Panel
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setShowLogoutConfirm(true)}
                                    className="w-full py-3.5 text-[#3D3028]/40 hover:text-[#B91C1C] font-bold uppercase tracking-widest text-[10px] transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>

            {/* --- LOGOUT MODAL --- */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLogoutConfirm(false)}
                            className="absolute inset-0 bg-[#3D3028]/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-2xl p-8 shadow-2xl relative z-10 text-center"
                        >
                            <h3 className="font-serif text-2xl text-[#3D3028] mb-2">Leaving so soon?</h3>
                            <p className="text-[#3D3028]/50 text-sm mb-8">
                                Any unsaved changes will be lost.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => signOut()}
                                    className="w-full py-3 bg-[#B91C1C] text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#991B1B]"
                                >
                                    Yes, Log Out
                                </button>
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="w-full py-3 text-[#3D3028]/60 hover:bg-[#3D3028]/5 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};