import { createClient } from '@supabase/supabase-js';

export const getSupabaseConfig = () => {
  let url = import.meta.env.VITE_SUPABASE_URL || '';
  let key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || url === 'YOUR_SUPABASE_URL' || url.includes('placeholder') || url.trim() === '') {
    url = localStorage.getItem('supabase_url') || '';
  }
  if (!key || key === 'YOUR_SUPABASE_ANON_KEY' || key.includes('placeholder') || key.trim() === '') {
    key = localStorage.getItem('supabase_anon_key') || '';
  }
  return { url, key };
};

const { url, key } = getSupabaseConfig();

const isValidUrl = !!url && url.startsWith('http') && !url.includes('placeholder-project');
const hasValidKey = !!key && key !== 'YOUR_SUPABASE_ANON_KEY' && !key.includes('placeholder-key') && key.trim() !== '';

export const isSupabaseConfigured = () => {
  return isValidUrl && hasValidKey;
};

// Real Supabase Client
const realSupabase = isSupabaseConfigured()
  ? createClient(url, key)
  : null;

// Mock / LocalStorage Client for fallback mode
const mockSupabase = {
  auth: {
    getSession: async () => {
      const sessionStr = localStorage.getItem('mock_session');
      if (sessionStr) {
        try {
          return { data: { session: JSON.parse(sessionStr) }, error: null };
        } catch (e) {}
      }
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      const handleStorageChange = () => {
        const sessionStr = localStorage.getItem('mock_session');
        if (sessionStr) {
          try {
            callback('SIGNED_IN', JSON.parse(sessionStr));
          } catch (e) {}
        } else {
          callback('SIGNED_OUT', null);
        }
      };
      window.addEventListener('storage', handleStorageChange);
      
      // Initial trigger
      const sessionStr = localStorage.getItem('mock_session');
      if (sessionStr) {
        try {
          callback('SIGNED_IN', JSON.parse(sessionStr));
        } catch (e) {}
      } else {
        callback('SIGNED_OUT', null);
      }

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              window.removeEventListener('storage', handleStorageChange);
            }
          }
        }
      };
    },
    signInWithPassword: async ({ email, password }: any) => {
      // Allow any login with at least 6 characters password in mock mode
      if (!password || password.length < 6) {
        return { data: { session: null, user: null }, error: new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل') };
      }
      
      const mockUser = {
        id: 'mock-user-id-' + email.split('@')[0],
        email: email,
        user_metadata: { full_name: email.split('@')[0] }
      };
      
      const session = { user: mockUser, access_token: 'mock-token' };
      localStorage.setItem('mock_session', JSON.stringify(session));
      window.dispatchEvent(new Event('storage'));
      return { data: { session, user: mockUser }, error: null };
    },
    signUp: async ({ email, password, options }: any) => {
      if (!password || password.length < 6) {
        return { data: { user: null }, error: new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل') };
      }
      const mockUser = {
        id: 'mock-user-id-' + email.split('@')[0],
        email: email,
        user_metadata: { full_name: options?.data?.full_name || email.split('@')[0] }
      };
      return { data: { user: mockUser }, error: null };
    },
    verifyOtp: async ({ email }: any) => {
      const mockUser = {
        id: 'mock-user-id-' + email.split('@')[0],
        email: email,
        user_metadata: { full_name: email.split('@')[0] }
      };
      const session = { user: mockUser, access_token: 'mock-token' };
      localStorage.setItem('mock_session', JSON.stringify(session));
      window.dispatchEvent(new Event('storage'));
      return { data: { session, user: mockUser }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem('mock_session');
      window.dispatchEvent(new Event('storage'));
      return { error: null };
    }
  },
  from: (table: string) => {
    return {
      select: () => {
        const executeSelect = () => {
          const appsStr = localStorage.getItem('mock_apps') || '[]';
          return { data: JSON.parse(appsStr), error: null };
        };
        return {
          order: () => executeSelect(),
          ...executeSelect()
        };
      },
      insert: (rows: any[]) => {
        const appsStr = localStorage.getItem('mock_apps') || '[]';
        const apps = JSON.parse(appsStr);
        const newRows = rows.map((r, index) => ({
          id: 'mock-id-' + (Date.now() + index),
          created_at: new Date().toISOString(),
          ...r
        }));
        const updatedApps = [...newRows, ...apps];
        localStorage.setItem('mock_apps', JSON.stringify(updatedApps));
        
        return {
          select: () => ({
            data: newRows,
            error: null,
            length: newRows.length,
            map: (fn: any) => newRows.map(fn)
          }),
          data: newRows,
          error: null
        };
      },
      update: (values: any) => ({
        eq: (field: string, val: any) => {
          const appsStr = localStorage.getItem('mock_apps') || '[]';
          let apps = JSON.parse(appsStr);
          apps = apps.map((app: any) => {
            if (app[field] === val) {
              return { ...app, ...values };
            }
            return app;
          });
          localStorage.setItem('mock_apps', JSON.stringify(apps));
          return { error: null };
        }
      }),
      delete: () => ({
        eq: (field: string, val: any) => {
          const appsStr = localStorage.getItem('mock_apps') || '[]';
          let apps = JSON.parse(appsStr);
          apps = apps.filter((app: any) => app[field] !== val);
          localStorage.setItem('mock_apps', JSON.stringify(apps));
          return { error: null };
        }
      })
    };
  }
};

export const supabase = (realSupabase || mockSupabase) as any;

