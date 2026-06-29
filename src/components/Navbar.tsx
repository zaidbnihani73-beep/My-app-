import React from 'react';

interface NavbarProps {
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  return (
    <nav className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-50 backdrop-blur-md bg-white/80">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center h-20">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined font-bold text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_upload</span>
            </div>
            <span className="text-3xl font-bold text-primary">تطبيقاتي</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors py-2" href="#">الرئيسية</a>
            <a className="text-sm font-bold text-primary relative py-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-primary after:rounded-t-full" href="#">تطبيقاتي</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-all text-sm font-bold px-4 py-2 rounded-lg hover:bg-primary/5 active:scale-95"
          >
            تسجيل الخروج
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
