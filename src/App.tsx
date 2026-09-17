import { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { ToastProvider } from './components/ToastContext';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { AdminDashboard } from './components/AdminDashboard';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsPage } from './components/TermsPage';
import { Page, User } from './types';
import { getSessionUser, setSessionUser, SessionUser, api } from './lib/apiClient';

// Konversi SessionUser (backend) -> User (types.ts UI)
function sessionToUser(session: SessionUser | null): User | null {
  if (!session) return null;
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role:
      session.role === 'Maste' || session.role?.toLowerCase().includes('master')
        ? 'Master / Pemilik Web App'
        : 'Orang Tua / Administrator',
    avatarUrl: session.avatar_url || undefined,
    activePlan: session.active_plan,
    activePlanLabel: session.active_plan_label,
    childrenCount: session.children_count,
    devicesCount: session.devices_count,
    expiresAt: session.expires_at,
    status: session.status,
  };
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const savedSession = getSessionUser();
    if (savedSession && savedSession.id > 0) {
      console.debug('[App] restore session dari localStorage → user:', savedSession.id, savedSession.email);
      return 'dashboard';
    }
    return 'landing';
  });

  const [activeUser, setActiveUser] = useState<User | null>(() => {
    return sessionToUser(getSessionUser());
  });

  // Default fallback user in case none is active
  const defaultUser: User = {
    name: 'Ahmad Faisal',
    email: 'orangtua@litensikids.id',
    role: 'Orang Tua / Administrator',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop'
  };

  const handleLoginSuccess = (user: User) => {
    console.log('[App] handleLoginSuccess, simpan user:', user.email, user.id);
    setActiveUser(user);

    // Pastikan session user tersimpan juga di penyimpanan internal apiClient
    const session: SessionUser = {
      id: user.id || 1,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatarUrl,
      active_plan: user.activePlan,
      active_plan_label: user.activePlanLabel,
      children_count: user.childrenCount,
      devices_count: user.devicesCount,
      expires_at: user.expiresAt,
      status: user.status,
    };
    setSessionUser(session);
  };

  const handleLogout = async () => {
    console.log('[App] handleLogout dipanggil');
    // Panggil endpoint logout (opsional untuk clean-up)
    try {
      await api.post('/auth/logout', {}, { authRequired: false, skipUserParam: true });
    } catch (e) {
      console.warn('[App] logout API error, lanjut clear local:', e);
    }
    setActiveUser(null);
    setSessionUser(null);
    setCurrentPage('landing');
  };

  const navigateToPage = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="w-full min-h-screen font-sans antialiased text-slate-800 bg-slate-50 transition-colors duration-300">
          {currentPage === 'landing' && (
            <LandingPage onNavigate={navigateToPage} />
          )}
          
          {currentPage === 'login' && (
            <LoginPage 
              onNavigate={navigateToPage} 
              onLoginSuccess={handleLoginSuccess} 
            />
          )}
          
          {currentPage === 'register' && (
            <RegisterPage 
              onNavigate={navigateToPage} 
              onLoginSuccess={handleLoginSuccess}
            />
          )}
          
          {currentPage === 'forgot' && (
            <ForgotPasswordPage onNavigate={navigateToPage} />
          )}
          
          {currentPage === 'dashboard' && (
            <AdminDashboard 
              user={activeUser || defaultUser} 
              onLogout={handleLogout} 
              onNavigate={navigateToPage}
            />
          )}

          {currentPage === 'privacy' && (
            <PrivacyPolicyPage onNavigate={navigateToPage} />
          )}

          {currentPage === 'terms' && (
            <TermsPage onNavigate={navigateToPage} />
          )}
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
