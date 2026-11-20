import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserSession, AuthRole } from '../types/energy';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-supabase')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const getAccessToken = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read the authenticated session: ${error.message}`);
  return data.session?.access_token || null;
};

export const signOutSupabase = async (): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
};

// Pre-configured instant demo profiles for zero-setup testing
export const DEMO_CONSUMER_USER: UserSession = {
  id: 'usr_consumer_aarav',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@energyq.ai',
  role: 'consumer',
  meterId: 'BESCOM-IND-4092',
  locality: 'Indiranagar 2nd Stage, Bengaluru',
  accessLevel: 'CONSUMER_SMART_HOME_ADMIN',
};

export const DEMO_OPERATOR_USER: UserSession = {
  id: 'usr_operator_ramesh',
  name: 'Eng. Ramesh K.',
  email: 'scada.ops@bescom.karnataka.gov.in',
  role: 'operator',
  division: 'Bengaluru Urban SCADA Control Division',
  accessLevel: 'GRID_COMMAND_LEVEL_4',
};

export const getDemoUser = (role: AuthRole): UserSession => {
  return role === 'consumer' ? DEMO_CONSUMER_USER : DEMO_OPERATOR_USER;
};

export const signInWithSupabase = async (
  email: string,
  pass: string,
  role: AuthRole
): Promise<{ user: UserSession | null; error: string | null }> => {
  if (!supabase) {
    return { user: null, error: 'Supabase is not configured. Use the clearly labelled demo login instead.' };
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { user: null, error: error.message };
    const userRole = data.user?.app_metadata?.role;
    if (!data.user || !data.session || userRole !== role) {
      await supabase.auth.signOut();
      return { user: null, error: 'This account is not authorized for the selected portal.' };
    }

    return {
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || email.split('@')[0],
        email: data.user.email || email,
        role: userRole,
        meterId: data.user.user_metadata?.meter_id || (userRole === 'consumer' ? 'BESCOM-IND-4092' : undefined),
        locality: data.user.user_metadata?.locality || (userRole === 'consumer' ? 'Indiranagar 2nd Stage' : undefined),
        division: userRole === 'operator' ? 'Bengaluru Urban SCADA Control' : undefined,
        accessLevel: userRole === 'operator' ? 'GRID_COMMAND_LEVEL_4' : 'CONSUMER_ADMIN',
      },
      error: null,
    };
  } catch (err) {
    console.error('Supabase sign-in failed:', err);
    return { user: null, error: 'Sign-in failed. Check your connection and try again.' };
  }
};

export const signUpWithSupabase = async (
  email: string,
  pass: string,
  role: AuthRole,
  name?: string
): Promise<{ user: UserSession | null; error: string | null }> => {
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            name: name || email.split('@')[0],
            role: role,
            meter_id: role === 'consumer' ? 'BESCOM-IND-4092' : undefined,
            locality: role === 'consumer' ? 'Indiranagar 2nd Stage' : undefined,
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const session: UserSession = {
          id: data.user.id,
          name: name || email.split('@')[0],
          email: data.user.email || email,
          role: role,
          meterId: role === 'consumer' ? 'BESCOM-IND-4092' : undefined,
          locality: role === 'consumer' ? 'Indiranagar 2nd Stage' : undefined,
          division: role === 'operator' ? 'Bengaluru Urban SCADA Control' : undefined,
        };
        return { user: session, error: null };
      }
    } catch (err: any) {
      console.warn('Supabase signup error:', err);
    }
  }

  return {
    user: null,
    error: supabase ? 'Account creation failed. Please try again.' : 'Supabase is not configured. Use the demo login instead.',
  };
};
