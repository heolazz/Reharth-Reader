import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Mail, Lock, User, Github, Sprout, Eye, EyeOff, CheckSquare, Square, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

interface AuthPageProps {
    onLogin: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = () => {
    const { signIn, signUp, signInWithProvider, loading } = useAuthStore();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showIntro, setShowIntro] = useState(true); // New state for 'Get Started' view

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password, name);
            }
        } catch (error: any) {
            alert(error.message || 'An error occurred');
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#1a1614] flex md:items-center md:justify-center relative overflow-hidden">

            {/* === MOBILE LAYOUT (Absolute Wrapper) === */}
            <div className="md:hidden fixed inset-0 flex flex-col bg-[#1a1614]">

                {/* 1. Mobile Header & Background Image */}
                <div className={`relative w-full overflow-hidden transition-all duration-500 ease-in-out z-0 ${showIntro ? 'h-full' : 'h-[40%]'}`}>
                    {/* Background Image */}
                    <div className="absolute inset-0">
                        <img
                            src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop"
                            alt="Library"
                            className="w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1614]/30 via-[#1a1614]/60 to-[#1a1614]" />
                    </div>

                    {/* Header Content */}
                    <div className={`relative z-10 flex flex-col h-full p-8 transition-all duration-500 ${showIntro ? 'justify-end pb-12' : 'justify-center items-start'}`}>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-[#F8F5F1]/10 backdrop-blur-md rounded-full flex items-center justify-center text-[#F8F5F1]">
                                <Sprout size={18} />
                            </div>
                        </div>

                        <div className="text-[#F8F5F1] w-full">
                            {showIntro ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key="intro-content"
                                >
                                    <h1 className="font-serif text-4xl mb-4 leading-tight">Effortlessly Manage Your Reading Journey</h1>
                                    <p className="text-[#F8F5F1]/70 text-base mb-8">The ultimate reading companion designed to streamline your library and supercharge your literary life.</p>

                                    <button
                                        onClick={() => setShowIntro(false)}
                                        className="w-full bg-[#6B8E6D] text-[#1a1614] py-4 rounded-2xl font-semibold text-lg hover:bg-[#5a7a5c] transition-colors shadow-lg active:scale-[0.98]"
                                    >
                                        Get Started
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    key="form-header"
                                >
                                    <button
                                        onClick={() => setShowIntro(true)}
                                        className="flex items-center gap-1 text-[#F8F5F1]/80 hover:text-white mb-4 -ml-1 transition-colors"
                                    >
                                        <ChevronLeft size={18} />
                                        <span className="text-xs font-medium uppercase tracking-wider">Back</span>
                                    </button>
                                    <h1 className="font-serif text-2xl mb-1 leading-tight">Welcome Back</h1>
                                    <p className="text-[#F8F5F1]/60 text-xs">Sign in to continue your reading journey</p>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Mobile Bottom Sheet (Form) */}
                <div className={`flex-1 bg-[#F8F5F1] rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] overflow-hidden transition-transform duration-500 ease-in-out z-10 ${showIntro ? 'translate-y-full absolute bottom-0 w-full h-[60%]' : 'translate-y-0 relative'}`}>
                    <div className="h-full overflow-y-auto px-6 py-8">
                        {/* Toggle Switch */}
                        <div className="bg-[#EAE5DF] p-1 rounded-full flex mb-8">
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-3 rounded-full text-sm font-medium transition-all duration-300 ${isLogin ? 'bg-white text-[#3D3028] shadow-sm' : 'text-[#3D3028]/50 hover:text-[#3D3028]'}`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-3 rounded-full text-sm font-medium transition-all duration-300 ${!isLogin ? 'bg-white text-[#3D3028] shadow-sm' : 'text-[#3D3028]/50 hover:text-[#3D3028]'}`}
                            >
                                Register
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {!isLogin && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-[#3D3028]/50 ml-1">Full Name</label>
                                            <div className="relative group">
                                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D3028]/40 group-focus-within:text-[#3D3028] transition-colors" />
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="John Doe"
                                                    className="w-full bg-white border border-[#EAE5DF] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#3D3028] placeholder-[#3D3028]/30 focus:outline-none focus:border-[#3D3028]/30 focus:ring-4 focus:ring-[#3D3028]/5 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#3D3028]/50 ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D3028]/40 group-focus-within:text-[#3D3028] transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full bg-white border border-[#EAE5DF] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#3D3028] placeholder-[#3D3028]/30 focus:outline-none focus:border-[#3D3028]/30 focus:ring-4 focus:ring-[#3D3028]/5 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#3D3028]/50 ml-1">Password</label>
                                <div className="relative group">
                                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D3028]/40 group-focus-within:text-[#3D3028] transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-white border border-[#EAE5DF] rounded-xl py-2.5 pl-10 pr-12 text-sm text-[#3D3028] placeholder-[#3D3028]/30 focus:outline-none focus:border-[#3D3028]/30 focus:ring-4 focus:ring-[#3D3028]/5 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3D3028]/40 hover:text-[#3D3028] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="flex items-center justify-between pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => setRememberMe(!rememberMe)}
                                    className="flex items-center gap-2 text-xs text-[#3D3028]/60 hover:text-[#3D3028] transition-colors group"
                                >
                                    {rememberMe ?
                                        <CheckSquare size={16} className="text-[#3E2723]" /> :
                                        <Square size={16} className="text-[#3D3028]/30 group-hover:text-[#3D3028]/60" />
                                    }
                                    Remember me
                                </button>
                                <button type="button" className="text-xs font-medium text-[#3E2723] hover:underline">
                                    Forgot Password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full bg-[#6B8E6D] text-[#1a1614] rounded-xl py-3.5 font-semibold text-base hover:bg-[#5a7a5c] transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 mt-2 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
                            </button>
                        </form>

                        <div className="relative py-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#3D3028]/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-[#F8F5F1] text-[#3D3028]/40 text-xs font-medium">Or login with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pb-8">
                            <button onClick={() => signInWithProvider('google')} className="flex items-center justify-center gap-3 bg-white border border-[#EAE5DF] rounded-2xl py-3.5 text-[#3D3028] hover:bg-gray-50 shadow-sm"><span className="text-lg font-serif font-bold text-[#EA4335]">G</span><span className="text-sm font-medium">Google</span></button>
                            <button onClick={() => signInWithProvider('github')} className="flex items-center justify-center gap-3 bg-white border border-[#EAE5DF] rounded-2xl py-3.5 text-[#3D3028] hover:bg-gray-50 shadow-sm"><Github size={20} /><span className="text-sm font-medium">GitHub</span></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* === DESKTOP LAYOUT (Hidden on Mobile) === */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="hidden md:flex w-full max-w-[1000px] h-[650px] max-h-[90vh] bg-[#F8F5F1] rounded-3xl shadow-2xl overflow-hidden flex-row relative z-30"
            >

                {/* === LEFT SIDE (Desktop Only Image) === */}
                <div className="w-1/2 bg-[#1a1614] relative text-[#F8F5F1] p-12 flex flex-col justify-between h-full">
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop"
                            alt="Library"
                            className="w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1614]/30 via-[#1a1614]/60 to-[#1a1614] z-10" />
                    </div>

                    <div className="relative z-20">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#F8F5F1] rounded-full flex items-center justify-center text-[#1a1614]">
                                <Sprout size={20} strokeWidth={1.5} />
                            </div>
                            <span className="font-serif text-xl font-medium tracking-wide">Reharth</span>
                        </div>
                    </div>

                    <div className="relative z-20 max-w-sm">
                        <h2 className="font-serif text-4xl mb-4 leading-tight">
                            "A reader lives a thousand lives before he dies."
                        </h2>
                        <p className="text-white/60 font-sans text-sm tracking-wide">
                            — GEORGE R.R. MARTIN
                        </p>
                    </div>
                </div>

                {/* === RIGHT SIDE (Desktop Form) === */}
                <div className="w-1/2 bg-[#F8F5F1] px-12 pt-12 pb-12 flex flex-col h-full overflow-y-auto items-center">

                    <div className="w-full max-w-[320px]">
                        {/* Desktop Header */}
                        <div className="text-center mb-8">
                            <h2 className="font-serif text-3xl text-[#3D3028] mb-2 font-medium">
                                {isLogin ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="text-[#3D3028]/60 text-sm">
                                {isLogin ? 'Enter your details to sign in' : 'Start your reading journey today'}
                            </p>
                        </div>

                        {/* Toggle Switch */}
                        <div className="bg-[#EAE5DF] p-1 rounded-full flex mb-6">
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-300 ${isLogin ? 'bg-white text-[#3D3028] shadow-sm' : 'text-[#3D3028]/50 hover:text-[#3D3028]'
                                    }`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-300 ${!isLogin ? 'bg-white text-[#3D3028] shadow-sm' : 'text-[#3D3028]/50 hover:text-[#3D3028]'
                                    }`}
                            >
                                Register
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {!isLogin && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-[#3D3028]/50 ml-1">Full Name</label>
                                            <div className="relative group">
                                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D3028]/40 group-focus-within:text-[#3D3028] transition-colors" />
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="John Doe"
                                                    className="w-full bg-white border border-[#EAE5DF] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#3D3028] placeholder-[#3D3028]/30 focus:outline-none focus:border-[#3D3028]/30 focus:ring-4 focus:ring-[#3D3028]/5 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#3D3028]/50 ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D3028]/40 group-focus-within:text-[#3D3028] transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full bg-white border border-[#EAE5DF] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#3D3028] placeholder-[#3D3028]/30 focus:outline-none focus:border-[#3D3028]/30 focus:ring-4 focus:ring-[#3D3028]/5 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#3D3028]/50 ml-1">Password</label>
                                <div className="relative group">
                                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D3028]/40 group-focus-within:text-[#3D3028] transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-white border border-[#EAE5DF] rounded-xl py-2.5 pl-10 pr-12 text-sm text-[#3D3028] placeholder-[#3D3028]/30 focus:outline-none focus:border-[#3D3028]/30 focus:ring-4 focus:ring-[#3D3028]/5 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3D3028]/40 hover:text-[#3D3028] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="flex items-center justify-between pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => setRememberMe(!rememberMe)}
                                    className="flex items-center gap-2 text-xs text-[#3D3028]/60 hover:text-[#3D3028] transition-colors group"
                                >
                                    {rememberMe ?
                                        <CheckSquare size={16} className="text-[#3E2723]" /> :
                                        <Square size={16} className="text-[#3D3028]/30 group-hover:text-[#3D3028]/60" />
                                    }
                                    Remember me
                                </button>
                                <button type="button" className="text-xs font-medium text-[#3E2723] hover:underline">
                                    Forgot Password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full bg-[#6B8E6D] text-[#ffffff] rounded-xl py-3.5 font-semibold text-base hover:bg-[#5a7a5c] transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 mt-4 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
                            </button>
                        </form>

                        <div className="relative py-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#3D3028]/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-[#F8F5F1] text-[#3D3028]/40 text-[10px] font-bold uppercase tracking-wider">Or login with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => signInWithProvider('google')}
                                className="flex items-center justify-center gap-2 bg-white border border-[#EAE5DF] rounded-xl py-2.5 text-[#3D3028] hover:bg-gray-50 hover:border-[#3D3028]/20 transition-all shadow-sm"
                            >
                                <span className="text-base font-serif font-bold text-[#EA4335]">G</span>
                                <span className="text-xs font-medium">Google</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => signInWithProvider('github')}
                                className="flex items-center justify-center gap-2 bg-white border border-[#EAE5DF] rounded-xl py-2.5 text-[#3D3028] hover:bg-gray-50 hover:border-[#3D3028]/20 transition-all shadow-sm"
                            >
                                <Github size={16} />
                                <span className="text-xs font-medium">GitHub</span>
                            </button>
                        </div>
                    </div>
                </div>

            </motion.div>
        </div>
    );
};
