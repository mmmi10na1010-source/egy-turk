import React, { useState } from 'react';
import { Search, Shield, LogOut, Menu, X } from 'lucide-react';
import { EgyTurkLogo } from './EgyTurkLogo';

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onOpenAdminDashboard: () => void;
  onAdminLogout: () => void;
  myListCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  isAdmin,
  onOpenAdminLogin,
  onOpenAdminDashboard,
  onAdminLogout,
  myListCount
}) => {
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const navLinks = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'drama', label: 'دراما تركية' },
    { id: 'action', label: 'أكشن وإثارة' },
    { id: 'historical', label: 'تاريخية' },
    { id: 'movies', label: 'أفلام تركية' },
    { id: 'series', label: 'مسلسلات تركية' },
    { id: 'mylist', label: `قائمتي${myListCount > 0 ? ` (${myListCount})` : ''}` }
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#060608]/95 backdrop-blur-md border-b border-zinc-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 shrink-0">
          <EgyTurkLogo size="md" onClick={() => onSelectTab('home')} />
        </div>

        <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onSelectTab(link.id)}
                className={`transition-colors whitespace-nowrap py-1 relative ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-1 inset-x-0 h-0.5 bg-gradient-to-l from-[#dc2626] to-[#881337] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center">
            {showSearchInput ? (
              <div className="flex items-center bg-[#14141c] border border-[#9F1239]/60 rounded-lg px-3 py-1.5 w-44 sm:w-60 transition-all">
                <Search className="w-4 h-4 text-rose-400 ml-2 shrink-0" />
                <input
                  type="text"
                  placeholder="ابحث عن مسلسل أو فيلم تركي أو حلقة..."
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('@#')) {
                      onSearchChange('');
                      setShowSearchInput(false);
                      if (isAdmin) {
                        onOpenAdminDashboard();
                      } else {
                        onOpenAdminLogin();
                      }
                      return;
                    }
                    onSearchChange(val);
                  }}
                  autoFocus
                  className="bg-transparent text-xs text-white placeholder-zinc-400 focus:outline-none w-full"
                />
                <button
                  onClick={() => {
                    setShowSearchInput(false);
                    onSearchChange('');
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/70 rounded-lg transition-colors"
                title="بحث"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenAdminDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#881337] hover:bg-[#9F1239] text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
                title="لوحة التحكم الإدارية"
              >
                <Shield className="w-3.5 h-3.5 text-rose-200" />
                <span className="hidden sm:inline">لوحة الإدارة</span>
              </button>
              <button
                onClick={onAdminLogout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/70 transition-colors"
                title="تسجيل الخروج من الإدارة"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-zinc-300 hover:text-white rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0c0c12] border-b border-zinc-800 px-4 py-3 space-y-1.5">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                onSelectTab(link.id);
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-right px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === link.id
                  ? 'bg-red-950/60 text-red-300 border border-red-800/50'
                  : 'text-zinc-300 hover:bg-[#14141c]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
