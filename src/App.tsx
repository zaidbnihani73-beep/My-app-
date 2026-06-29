import { useState, useEffect } from 'react';
import { MainView } from './types';
import { AuthViews } from './components/AuthViews';
import { DashboardView } from './components/DashboardView';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AnimatePresence, motion } from 'motion/react';
import { supabase } from './lib/supabase';

export default function App() {
  const [view, setView] = useState<MainView>('auth');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || '');
        setView('dashboard');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email || '');
        setView('dashboard');
      } else {
        setUserEmail('');
        setView('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setView('dashboard');
    showToast('تم تسجيل الدخول بنجاح');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserEmail('');
    setView('auth');
    showToast('تم تسجيل الخروج');
  };

  const isAdmin = userEmail === 'zaidbnihani73@gmail.com';

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-background selection:bg-primary/10" dir="rtl">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-fixed-dim/10 rounded-full blur-[100px] -z-10 translate-x-1/4 -translate-y-1/4 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-surface-tint/5 rounded-full blur-[120px] -z-10 -translate-x-1/4 translate-y-1/4 pointer-events-none"></div>

      {view === 'dashboard' && <Navbar onLogout={handleLogout} />}

      <main className={`flex-grow flex flex-col ${view === 'auth' ? 'items-center justify-center p-4 md:p-8' : 'max-w-7xl mx-auto w-full px-4 md:px-8 py-12'}`}>
        <AnimatePresence mode="wait">
          {view === 'auth' ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex justify-center"
            >
              <AuthViews 
                onLogin={handleLogin} 
                onSignup={(email) => showToast(`تم إرسال رمز التحقق إلى ${email}`)} 
                onError={(msg) => showToast(msg, 'error')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full"
            >
              <DashboardView onAction={(msg) => showToast(msg)} isAdmin={isAdmin} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-surface-container-lowest border-primary/20 text-primary' : 'bg-error-container border-error/20 text-error'
            }`}
          >
            <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
