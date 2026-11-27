import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('EGY TURK Uncaught Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060608] text-zinc-100 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 mb-6 shadow-2xl animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
            تم استعادة الاتصال بنجاح
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
            حدث تنشيط في المتصفح، اضغط على الزر أدناه لإعادة تشغيل موقع ايجي تورك بالكامل فوراً.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white font-bold text-sm shadow-lg transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة تشغيل الموقع</span>
            </button>

            <button
              onClick={this.handleResetStorage}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#161620] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-sm font-semibold transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>العودة للرئيسية</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
