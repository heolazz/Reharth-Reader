import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
    created_at?: string;
    role?: string;
}

interface AuthState {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    signIn: (email: string, password?: string) => Promise<void>;
    signUp: (email: string, password?: string, name?: string) => Promise<void>;
    signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    isAuthenticated: false,

    signIn: async (email, password) => {
        set({ loading: true });
        try {
            if (!password) {
                // Magic Link Flow
                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                });
                if (error) throw error;
                alert('Check your email for the login link!');
                set({ loading: false });
            } else {
                // Password Flow
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // data.user will be picked up by onAuthStateChange listener
            }

        } catch (error: any) {
            console.error('Login failed', error);
            set({ loading: false });
            throw error; // Re-throw to handle in UI
        }
    },

    signUp: async (email, password, name) => {
        set({ loading: true });
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password: password || 'password123', // Default if magic link used, but ideally password required
                options: {
                    data: {
                        full_name: name,
                    }
                }
            });

            if (error) throw error;

            if (data.user && !data.session) {
                alert('Please check your email to verify your account.');
                set({ loading: false });
                return;
            }
            // data.user will be picked up by onAuthStateChange listener

        } catch (error: any) {
            console.error('Signup failed', error);
            set({ loading: false });
            throw error;
        }
    },

    signInWithProvider: async (provider) => {
        set({ loading: true });
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                }
            });
            if (error) throw error;
        } catch (error: any) {
            console.error('Provider login failed', error);
            set({ loading: false });
            throw error;
        }
    },

    signOut: async () => {
        set({ loading: true });
        try {
            await supabase.auth.signOut();
            set({ user: null, isAuthenticated: false, loading: false });
        } catch (error) {
            console.error('Sign out failed', error);
            set({ loading: false });
        }
    },

    resetPassword: async (email) => {
        set({ loading: true });
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            set({ loading: false });
        } catch (error: any) {
            console.error('Password reset failed', error);
            set({ loading: false });
            throw error;
        }
    },

    checkSession: async () => {
        set({ loading: true });

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            const user = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                avatar_url: session.user.user_metadata?.avatar_url,
                created_at: session.user.created_at,
                role: session.user.user_metadata?.role || session.user.app_metadata?.role,
            };
            set({ user, isAuthenticated: true, loading: false });
        } else {
            set({ user: null, isAuthenticated: false, loading: false });
        }

        // Listen for changes
        supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                const user = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                    avatar_url: session.user.user_metadata?.avatar_url,
                    created_at: session.user.created_at,
                    role: session.user.user_metadata?.role || session.user.app_metadata?.role,
                };
                set({ user, isAuthenticated: true, loading: false });
            } else {
                set({ user: null, isAuthenticated: false, loading: false });
            }
        });
    }
}));
