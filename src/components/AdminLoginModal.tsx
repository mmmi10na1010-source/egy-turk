import React, { useState } from 'react';
import { X, Shield, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { verifyAdminLogin } from '../services/storage';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [username, setUsername] = useState('egyturk');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const isValid = verifyAdminLogin(username, password);
      setIsLoading(false);
      if (isValid) {
        onSuccess();
        onClose();
      } else {
        setError('بيانات الدخول غير صحيحة. اسم المستخدم هو egyturk وكلمة المرور المحددة.');
      }
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#0e0e14] border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#161620] transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#b91c1c] to-[#4c0519] border border-[#9F1239] flex items-center justify-center mx-auto mb-3 shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">تسجيل دخول المشرف</h2>
          <p className="text-xs text-zinc-400 mt-1">
            إدارة كتالوج ايجي تورك (EGY TURK) للمسلسلات والأفلام التركية
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 text-right">
              اسم المستخدم (Username)
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="egyturk"
                required
                dir="ltr"
                className="w-full bg-[#161620] border border-zinc-700 focus:border-[#9F1239] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#9F1239] transition-colors pl-10 text-left font-mono"
              />
              <User className="absolute left-3 w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              اسم المستخدم: <span className="font-mono text-rose-400">egyturk</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 text-right">
              كلمة المرور (Password)
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                dir="ltr"
                className="w-full bg-[#161620] border border-zinc-700 focus:border-[#9F1239] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#9F1239] transition-colors pl-10 pr-10 text-left font-mono"
              />
              <Lock className="absolute left-3 w-4 h-4 text-zinc-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-zinc-400 hover:text-zinc-200 transition-colors"
                title={showPassword ? 'إخفاء' : 'إظهار'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white font-bold text-sm shadow-md transition-all transform active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
