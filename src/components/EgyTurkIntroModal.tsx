import React, { useEffect } from 'react';
import { EgyTurkLogo, playEgyTurkIntroSound } from './EgyTurkLogo';

interface EgyTurkIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EgyTurkIntroModal: React.FC<EgyTurkIntroModalProps> = ({
  isOpen,
  onClose
}) => {
  useEffect(() => {
    if (isOpen) {
      playEgyTurkIntroSound();
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#060608] flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-300">
      <div className="absolute w-[480px] h-[480px] bg-gradient-to-r from-[#4c0519]/30 via-[#881337]/25 to-[#7f1d1d]/25 rounded-full blur-[120px] pointer-events-none" />

      <button
        onClick={onClose}
        className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-[#14141b] border border-zinc-700 text-zinc-400 hover:text-white hover:border-[#9F1239] text-xs font-semibold transition-colors z-20"
      >
        تخطي
      </button>

      <div className="relative z-10 flex flex-col items-center justify-center transform transition-transform duration-700 scale-125">
        <EgyTurkLogo size="xl" withAnimation={false} />
      </div>
    </div>
  );
};
