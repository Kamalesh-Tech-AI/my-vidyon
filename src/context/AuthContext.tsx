import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
      console.log('[AUTH] Verifying role for:', email);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timed out after 30 seconds')), 30000)
      );

      const profileFetchPromise = (async () => {
        let detectedRole: UserRole | null = null;
        let institutionId: string | undefined = undefined;

        // 1. Fetch profile with institution data in one query
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, institution_id, is_active')
          .eq('id', userId)
          .maybeSingle();

        // If Super Admin, return immediately
        if (profile?.role === 'admin') {
          return {
            id: userId,
            email: email,
            name: profile.full_name || email.split('@')[0],
            role: 'admin' as UserRole,
            institutionId: profile.institution_id,
            forcePasswordChange: false
          };
        }

        // Check if profile is active
        if (profile?.is_active === false) {
          console.error('🚫 [AUTH] BLOCKING LOGIN - Profile is disabled');
          throw new Error('USER_DISABLED');
        }

        // 2. Parallel queries for role detection (optimized)
        const [instRes, studentRes, parentRes, staffRes] = await Promise.all([
          supabase.from('institutions').select('institution_id').eq('admin_email', email).maybeSingle(),
          supabase.from('students').select('institution_id, is_active').eq('email', email).maybeSingle(),
          supabase.from('parents').select('institution_id, is_active').eq('email', email).maybeSingle(),
          supabase.from('staff_details').select('institution_id, role').eq('profile_id', userId).maybeSingle()
        ]);

        // Check Institution Admin
        if (instRes.data) {
          detectedRole = 'institution';
          institutionId = instRes.data.institution_id;
        }

        // Check Student
        if (!detectedRole && studentRes.data) {
          if (studentRes.data.is_active === false) {
            console.error('🚫 [AUTH] BLOCKING LOGIN - Student account is disabled');
            throw new Error('USER_DISABLED');
          }
          detectedRole = 'student';
          institutionId = studentRes.data.institution_id;
        }

        // Check Parent
        if (!detectedRole && parentRes.data) {
          if (parentRes.data.is_active === false) {
            console.error('🚫 [AUTH] BLOCKING LOGIN - Parent account is disabled');
            throw new Error('USER_DISABLED');
          }
          detectedRole = 'parent';
          institutionId = parentRes.data.institution_id;
        }

        // Check Staff/Faculty
        if (!detectedRole && staffRes.data) {
          detectedRole = staffRes.data.role as UserRole;
          institutionId = staffRes.data.institution_id;
        }

        // Default to profile role
        if (!detectedRole && profile) {
          detectedRole = profile.role as UserRole;
          institutionId = profile.institution_id;
        }

        if (!detectedRole) {
          console.error('No role detected for user');
          return null;
        }

        // 3. Check institution status (only if institutionId exists and not admin)
        if (institutionId && detectedRole !== 'admin') {
          try {
            const { data: institution, error: instError } = await supabase
              .from('institutions')
              .select('status')
              .eq('institution_id', institutionId)
              .maybeSingle();

            if (!instError && institution) {
              const status = institution.status || 'active';

              if (status === 'inactive') {
                console.error('🚫 [AUTH] BLOCKING LOGIN - Institution is INACTIVE');
                throw new Error('INSTITUTION_INACTIVE');
              }

              if (status === 'deleted') {
                console.error('🚫 [AUTH] BLOCKING LOGIN - Institution is DELETED');
                throw new Error('INSTITUTION_DELETED');
              }
            }
          } catch (error: any) {
            // Re-throw blocking errors
            if (error.message === 'INSTITUTION_INACTIVE' || error.message === 'INSTITUTION_DELETED') {
              throw error;
            }
            // Log other errors but don't block login
            console.warn('⚠️ [AUTH] Error checking institution status (continuing):', error);
          }
        }

        // 4. Sync profile if role changed (fire and forget - don't wait)
        if (profile && profile.role !== detectedRole) {
          void (async () => {
            try {
              await supabase.from('profiles')
                .update({ role: detectedRole, institution_id: institutionId })
                .eq('id', userId);
              console.log('[AUTH] Profile role synced');
            } catch (err) {
              console.warn('[AUTH] Profile sync failed:', err);
            }
          })();
        }

        return {
          id: userId,
          email: email,
          name: profile?.full_name || email.split('@')[0],
          role: detectedRole,
          institutionId: institutionId,
          forcePasswordChange: false // We'll skip this check for performance
        };
      })();

      // Race between profile fetch and timeout
      const result = await Promise.race([profileFetchPromise, timeoutPromise]);
      return result as User | null;

    } catch (err: any) {
      console.error('Profile fetch error:', err);
      if (err.message === 'INSTITUTION_INACTIVE' || err.message === 'INSTITUTION_DELETED' || err.message === 'USER_DISABLED') {
        throw err; // Re-throw blocking errors
      }
      return null;
    }
  }, []);

  const userRef = useRef(state.user);
  useEffect(() => {
    userRef.current = state.user;
  }, [state.user]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    let isInitialLoad = true;

    // Listen for auth changes and handle initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔄 [AUTH] Event: ${event}`);

      if (session) {
        // If we already have the same user and it's just a token refresh (not SIGNED_IN), 
        // we can skip the heavy profile fetch to avoid transient network issues logging the user out.
        if (userRef.current?.id === session.user.id && event !== 'SIGNED_IN' && !isInitialLoad) {
          console.log('[AUTH] Token refresh for same user, skipping profile fetch');
          return;
        }

        try {
          if (isInitialLoad) {
            setState(prev => ({ ...prev, isLoading: true }));
          }

          const user = await fetchUserProfile(session.user.id, session.user.email!);

          if (user) {
            setState({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Profile explicitly not found in DB
            console.error('🚫 [AUTH] Profile not found - signing out');
            await supabase.auth.signOut();
            setState({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error: any) {
          const isBlockingError = ['INSTITUTION_INACTIVE', 'INSTITUTION_DELETED', 'USER_DISABLED'].includes(error.message);

          if (isBlockingError) {
            console.error('🚫 [AUTH] Blocking error - signing out:', error.message);
            await supabase.auth.signOut();
            setState({ user: null, isAuthenticated: false, isLoading: false });

            toast.error('Access Denied', {
              description: error.message === 'USER_DISABLED'
                ? 'Your account has been disabled.'
                : error.message === 'INSTITUTION_INACTIVE'
                  ? 'Your institution has been deactivated.'
                  : 'Your institution has been deleted.',
            });
          } else {
            // Transient error (timeout/network)
            console.warn('⚠️ [AUTH] Transient auth error (not signing out):', error);
            // If it's the initial load and it failed, we MUST stop loading
            if (isInitialLoad) {
              setState(prev => ({ ...prev, isLoading: false }));
            }
          }
        }
      } else {
        // No session
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }

      isInitialLoad = false;
    });

    // Sub-periodic check for institution status (optional, but keep it robust)
    const statusCheckInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !userRef.current) return;

      try {
        // Use a silent fetch that doesn't trigger global loading or aggressive error handling
        await fetchUserProfile(session.user.id, session.user.email!);
      } catch (error: any) {
        if (['INSTITUTION_INACTIVE', 'INSTITUTION_DELETED', 'USER_DISABLED'].includes(error.message)) {
          console.error('🚫 [AUTH] Mid-session block detected');
          await supabase.auth.signOut();
          setState({ user: null, isAuthenticated: false, isLoading: false });
          toast.error('Session Expired', { description: 'Your access has been revoked.' });
        }
      }
    }, 60000); // Reduce frequency to once per minute

    return () => {
      subscription.unsubscribe();
      clearInterval(statusCheckInterval);
    };
  }, [fetchUserProfile]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    console.log('[AUTH] Login started for:', credentials.email);
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Mock Login Bypass for Testing
      const mockLogins: Record<string, { role: UserRole, password: string, name: string }> = {
        'canteen@gmail.com': { role: 'canteen_manager', password: '123455', name: 'Mock Canteen Manager' },
        // 'ape@gmail.com': { role: 'accountant', password: '123456', name: 'Mock Accountant' },
      };

      const normalizedEmail = credentials.email.trim().toLowerCase();
      const normalizedPassword = credentials.password.trim();

      console.log('[AUTH] Checking mock for:', { email: normalizedEmail, pass: normalizedPassword });

      if (mockLogins[normalizedEmail] && mockLogins[normalizedEmail].password === normalizedPassword) {
        console.log('[AUTH] Using mock credentials for:', normalizedEmail);

        // Attempt to get a real institution ID to allow mock user to see data
        let mockInstId = 'MYVID2026';
        try {
          const { data: instData } = await supabase.from('institutions').select('institution_id').limit(1).maybeSingle();
          if (instData) {
            mockInstId = instData.institution_id;
            console.log('[AUTH] Mock user latched to real institution:', mockInstId);
          }
        } catch (e) {
          console.warn('Failed to fetch real institution for mock user, using default');
        }

        const mockData = mockLogins[normalizedEmail];
        const mockUser: User = {
          id: `MOCK_${mockData.role.toUpperCase()}`,
          email: normalizedEmail,
          name: mockData.name,
          role: mockData.role,
          institutionId: mockInstId,
        };

        setState({
          user: mockUser,
          isAuthenticated: true,
          isLoading: false,
        });
        toast.success("Logged in with mock account");
        navigate(ROLE_ROUTES[mockData.role]);
        return;
      }

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

      // Add timeout to prevent infinite hang (shortened to 20s for better UX)
      const authPromise = supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login request timed out after 20 seconds. This usually means a weak internet connection or that the database is momentarily busy. Please try again.')), 20000)
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
      const profilePromise = fetchUserProfile(data.user.id, data.user.email);
      const profileTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Retrieving user profile timed out. The database might be slow or your connection dropped.')), 25000)
      );

      const user = await Promise.race([profilePromise, profileTimeoutPromise]) as any;

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

      // Handle specific error cases
      if (error.message === 'USER_DISABLED') {
        toast.error('Access Denied', {
          description: 'Your account has been disabled. Please contact your administrator for access.',
        });
      } else if (error.message === 'INSTITUTION_INACTIVE') {
        toast.error('Access Denied', {
          description: 'Your institution is currently inactive. Please contact your administrator for access.',
        });
      } else if (error.message === 'INSTITUTION_DELETED') {
        toast.error('Access Denied', {
          description: 'Your institution has been deleted. Please contact support for assistance.',
        });
      } else if (error.message?.includes('Database error') || error.message?.includes('banned')) {
        // Handle database errors or banned users
        toast.error('Access Denied', {
          description: 'You cannot access this portal. Please contact your administrator.',
        });
      } else {
        const errorMessage = error.message || "An error occurred during login";
        toast.error(errorMessage);
      }

      // Sign out if institution is inactive, deleted, or user is disabled
      if (error.message === 'INSTITUTION_INACTIVE' || error.message === 'INSTITUTION_DELETED' || error.message === 'USER_DISABLED' || error.message?.includes('banned')) {
        await supabase.auth.signOut();
      }

      throw error;
    }
  }, [navigate, fetchUserProfile]);

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out...');

      // Show loading toast
      const loadingToast = toast.loading('Logging out...');

      // Add timeout to prevent infinite hang
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Logout timed out')), 5000)
      );

      try {
        const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any;

        if (error) {
          console.warn('Logout error (continuing anyway):', error);
        }
      } catch (timeoutError) {
        console.warn('Logout timed out (continuing anyway):', timeoutError);
      }

      // Always clear state regardless of Supabase response
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // Success toast
      toast.success('Logged out successfully', {
        id: loadingToast,
      });

      console.log('✅ Logout successful');

      // Navigate to login
      navigate('/login');
    } catch (error: any) {
      console.error('Unexpected logout error:', error);

      // Even on error, clear state and navigate
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      toast.error('Logged out (with errors)', {
        description: 'You have been logged out',
      });

      navigate('/login');
    }
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
