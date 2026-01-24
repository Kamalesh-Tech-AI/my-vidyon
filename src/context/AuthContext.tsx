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
      console.log('[AUTH] Verifying role across tables for:', email);

      let detectedRole: UserRole | null = null;
      let institutionId: string | undefined = undefined;

      // 1. Initial Profile Fetch to check for Super Admin or basic info
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // If Super Admin, stay as admin
      if (profile?.role === 'admin') {
        detectedRole = 'admin';
        institutionId = profile.institution_id;
      }

      if (!detectedRole) {
        // Parallelize queries for efficiency across entity tables
        const [instRes, studentRes, parentRes] = await Promise.all([
          supabase.from('institutions').select('institution_id').eq('admin_email', email).maybeSingle(),
          supabase.from('students').select('institution_id').eq('email', email).maybeSingle(),
          supabase.from('parents').select('institution_id').eq('email', email).maybeSingle()
        ]);

        // 2. Check if user is an Institution Admin
        if (instRes.data) {
          detectedRole = 'institution';
          institutionId = instRes.data.institution_id;
        }

        // 3. Check if user is a Student (Search by email)
        if (!detectedRole && studentRes.data) {
          detectedRole = 'student';
          institutionId = studentRes.data.institution_id;
        }

        // 4. Check if user is a Parent (Search by email)
        if (!detectedRole && parentRes.data) {
          detectedRole = 'parent';
          institutionId = parentRes.data.institution_id;
        }

        // 5. Check if user is Staff/Faculty (Search by profile_id)
        if (!detectedRole) {
          const { data: staffData } = await supabase
            .from('staff_details')
            .select('institution_id, role')
            .eq('profile_id', userId)
            .maybeSingle();

          if (staffData) {
            detectedRole = staffData.role as UserRole;
            institutionId = staffData.institution_id;
          }
        }
      }

      // 6. Default to existing profile role if still not found
      if (!detectedRole && profile) {
        detectedRole = profile.role as UserRole;
        institutionId = profile.institution_id;
      }

      if (!detectedRole) {
        console.error('No role detected for user');
        return null;
      }

      // 6. Sync profile if role changed
      if (profile && profile.role !== detectedRole) {
        await supabase.from('profiles').update({ role: detectedRole, institution_id: institutionId }).eq('id', userId);
      }

      // 7. Check institution status - FIXED to use institution_id (TEXT) not id (UUID)
      let institutionStatus = 'active';
      if (institutionId) {
        console.log('🔒 [AUTH] Checking institution status for institutionId:', institutionId);

        try {
          // Query by institution_id (TEXT field like "sardgtq3r") not id (UUID)
          const { data: institution, error: instError } = await supabase
            .from('institutions')
            .select('id, institution_id, name, status, current_academic_year')
            .eq('institution_id', institutionId)  // Changed from .eq('id', institutionId)
            .maybeSingle();

          console.log('🔒 [AUTH] Institution query result:', { institution, instError });

          if (instError) {
            console.error('🔒 [AUTH] Error fetching institution:', instError);
            // If status column doesn't exist (migration not run), allow login
            if (instError.message?.includes('column') && instError.message?.includes('status')) {
              console.warn('🔒 [AUTH] Status column does not exist. Migration not run. Allowing login.');
              institutionStatus = 'active';
            }
          } else if (institution) {
            institutionStatus = institution.status || 'active';
            console.log('🔒 [AUTH] Institution found:', institution.name);
            console.log('🔒 [AUTH] Institution status:', institutionStatus);

            // Block login if institution is inactive (except for admin)
            if (institutionStatus === 'inactive' && detectedRole !== 'admin') {
              console.error('🚫 [AUTH] BLOCKING LOGIN - Institution is INACTIVE');
              throw new Error('INSTITUTION_INACTIVE');
            }

            if (institutionStatus === 'deleted' && detectedRole !== 'admin') {
              console.error('🚫 [AUTH] BLOCKING LOGIN - Institution is DELETED');
              throw new Error('INSTITUTION_DELETED');
            }

            console.log('✅ [AUTH] Institution status check passed');
          } else {
            console.warn('⚠️ [AUTH] Institution not found for institution_id:', institutionId);
          }
        } catch (error: any) {
          // Re-throw our custom errors
          if (error.message === 'INSTITUTION_INACTIVE' || error.message === 'INSTITUTION_DELETED') {
            console.error('🚫 [AUTH] Re-throwing blocking error');
            throw error;
          }
          // Log other errors but don't block login
          console.error('❌ [AUTH] Unexpected error checking institution status:', error);
        }
      }

      // 8. Get user metadata from Auth (for force_password_change)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const forcePasswordChange = authUser?.user_metadata?.force_password_change === true;

      return {
        id: userId,
        email: email,
        name: profile?.full_name || email.split('@')[0],
        role: detectedRole,
        institutionId: institutionId,
        forcePasswordChange
      };
    } catch (err: any) {
      console.error('Profile fetch transition error:', err);
      if (err.message === 'INSTITUTION_INACTIVE') {
        throw err; // Re-throw to handle in login
      }
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
      // Mock Login Bypass for Testing
      const mockLogins: Record<string, { role: UserRole, password: string, name: string }> = {
        'canteen@gmail.com': { role: 'canteen_manager', password: '123455', name: 'Mock Canteen Manager' },
        'ape@gmail.com': { role: 'accountant', password: '123456', name: 'Mock Accountant' },
      };

      const normalizedEmail = credentials.email.trim().toLowerCase();
      const normalizedPassword = credentials.password.trim();

      console.log('[AUTH] Checking mock for:', { email: normalizedEmail, pass: normalizedPassword });

      if (mockLogins[normalizedEmail] && mockLogins[normalizedEmail].password === normalizedPassword) {
        console.log('[AUTH] Using mock credentials for:', normalizedEmail);
        const mockData = mockLogins[normalizedEmail];
        const mockUser: User = {
          id: `MOCK_${mockData.role.toUpperCase()}`,
          email: normalizedEmail,
          name: mockData.name,
          role: mockData.role,
          institutionId: 'MYVID2026', // Use a default test institution ID
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

      // Add timeout to prevent infinite hang
      const authPromise = supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login request timed out after 45 seconds. Please check your internet connection.')), 45000)
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

      // Handle specific error cases
      if (error.message === 'INSTITUTION_INACTIVE') {
        toast.error('Access Denied', {
          description: 'Your institution is currently inactive. Please contact your administrator for access.',
        });
      } else if (error.message === 'INSTITUTION_DELETED') {
        toast.error('Access Denied', {
          description: 'Your institution has been deleted. Please contact support for assistance.',
        });
      } else {
        const errorMessage = error.message || "An error occurred during login";
        toast.error(errorMessage);
      }

      // Sign out if institution is inactive or deleted
      if (error.message === 'INSTITUTION_INACTIVE' || error.message === 'INSTITUTION_DELETED') {
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
