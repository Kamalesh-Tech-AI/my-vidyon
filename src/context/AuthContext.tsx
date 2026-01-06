import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole, AuthState, LoginCredentials, ROLE_ROUTES } from '@/types/auth';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void; // Demo feature
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const navigate = useNavigate();

  const fetchUserProfile = useCallback(async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        name: data.full_name || email.split('@')[0],
        role: data.role as UserRole,
        institutionId: data.institution_id,
      };
    } catch (err) {
      console.error('Profile fetch transition error:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    // Safety check for unconfigured Supabase
    if (!isSupabaseConfigured()) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Check active session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          const user = await fetchUserProfile(session.user.id, session.user.email!);
          setState({
            user,
            isAuthenticated: !!user,
            isLoading: false,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        // Ensure loading state is cleared even on error
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const user = await fetchUserProfile(session.user.id, session.user.email!);
        setState({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      } else if (event === 'SIGNED_OUT') {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    console.log('[AUTH] Login started for:', credentials.email);
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      if (!isSupabaseConfigured()) {
        console.log('[AUTH] Using demo mode');
        // Fallback to demo logic for development if Supabase is not configured
        toast.info("Using demo login (Supabase not configured)");
        await new Promise(resolve => setTimeout(resolve, 1000));

        let role: UserRole = 'student';
        if (credentials.email === 'ADMINERP@gmail.com' || credentials.email.includes('admin')) role = 'admin';
        else if (credentials.email === 'INST@gmail.com' || credentials.email.includes('institution')) role = 'institution';
        else if (credentials.email.includes('STAFF') || credentials.email.includes('faculty')) role = 'faculty';
        else if (credentials.email === 'PARENT@gmail.com' || credentials.email.includes('parent')) role = 'parent';

        const demoUser: User = {
          id: 'DEMO001',
          email: credentials.email,
          name: 'Demo User',
          role: role,
        };

        setState({
          user: demoUser,
          isAuthenticated: true,
          isLoading: false,
        });
        navigate(ROLE_ROUTES[role]);
        return;
      }

      console.log('[AUTH] Calling Supabase signInWithPassword');

      // Add timeout to prevent infinite hang
      const authPromise = supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login request timed out after 60 seconds. Please check your internet connection.')), 60000)
      );

      const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any;

      if (error) {
        console.error('[AUTH] Supabase auth error:', error);
        throw error;
      }

      console.log('[AUTH] Auth successful, user ID:', data.user?.id);

      if (!data.user?.email) {
        throw new Error("User email not found");
      }

      console.log('[AUTH] Fetching user profile...');
      const user = await fetchUserProfile(data.user.id, data.user.email);

      if (user) {
        console.log('[AUTH] Profile found, role:', user.role);
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        console.log('[AUTH] Navigating to:', ROLE_ROUTES[user.role]);
        navigate(ROLE_ROUTES[user.role]);
      } else {
        console.error('[AUTH] No profile found in database');
        await supabase.auth.signOut();
        throw new Error("Profile not found. Please contact your administrator.");
      }
    } catch (error: any) {
      console.error('[AUTH] Login error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast.error(error.message || "An error occurred during login");
      throw error;
    }
  }, [navigate, fetchUserProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    navigate('/login');
  }, [navigate]);

  const switchRole = useCallback((role: UserRole) => {
    // Only for demo/testing purposes
    const demoUser: User = {
      id: 'DEMO_' + role.toUpperCase(),
      email: `${role}@demo.com`,
      name: `Demo ${role}`,
      role: role,
    };
    setState({
      user: demoUser,
      isAuthenticated: true,
      isLoading: false,
    });
    navigate(ROLE_ROUTES[role]);
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
