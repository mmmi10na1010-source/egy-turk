import React from 'react';

interface EgyTurkLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withAnimation?: boolean;
  onClick?: () => void;
  className?: string;
}

export const playEgyTurkIntroSound = () => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(110, now);
    osc1.frequency.exponentialRampToValueAtTime(34, now + 1.25);

    gain1.gain.setValueAtTime(0.55, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(220, now + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(440, now + 0.72);

    gain2.gain.setValueAtTime(0.01, now);
    gain2.gain.linearRampToValueAtTime(0.16, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.linearRampToValueAtTime(2200, now + 0.35);
    filter.frequency.exponentialRampToValueAtTime(320, now + 1.3);

    osc2.connect(filter);
    filter.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.05);

    osc1.stop(now + 1.5);
    osc2.stop(now + 1.5);
  } catch {
    // Audio context may require user interaction
  }
};

export const EgyTurkLogo: React.FC<EgyTurkLogoProps> = ({
  size = 'md',
  onClick,
  className = ''
}) => {
  const sizeConfig = {
    sm: {
      text: 'text-xl',
      spacing: 'tracking-tight',
      glow: 'drop-shadow-[0_2px_10px_rgba(220,38,38,0.4)]',
      curveH: 'h-1 w-full max-w-[68px]'
    },
    md: {
      text: 'text-2xl sm:text-[28px]',
      spacing: 'tracking-tight',
      glow: 'drop-shadow-[0_2px_14px_rgba(220,38,38,0.45)]',
      curveH: 'h-1.5 w-full max-w-[88px]'
    },
    lg: {
      text: 'text-3xl sm:text-4xl',
      spacing: 'tracking-tight',
      glow: 'drop-shadow-[0_3px_18px_rgba(220,38,38,0.5)]',
      curveH: 'h-2 w-full max-w-[116px]'
    },
    xl: {
      text: 'text-5xl sm:text-6xl',
      spacing: 'tracking-tight',
      glow: 'drop-shadow-[0_4px_24px_rgba(220,38,38,0.65)]',
      curveH: 'h-2.5 w-full max-w-[175px]'
    }
  }[size];

  const handleClick = () => {
    playEgyTurkIntroSound();
    if (onClick) onClick();
  };

  return (
    <div
      dir="rtl"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="ايجي تورك - EGY TURK"
      className={`group relative inline-flex flex-col items-start cursor-pointer select-none transition-transform duration-200 active:scale-95 ${className}`}
      title="ايجي تورك | EGY TURK"
    >
      {/* Brand Name: ايجي تورك - native inline text layout for 100% exact Arabic baseline alignment */}
      <div
        className={`font-egyturk-logo font-extrabold inline-block leading-[1.3] whitespace-nowrap ${sizeConfig.text} ${sizeConfig.spacing} ${sizeConfig.glow}`}
      >
        {/* "ايجي" in pure crisp white */}
        <span className="text-white font-extrabold group-hover:text-zinc-100 transition-colors select-none">
          ايجي
        </span>{' '}
        {/* "تورك" in vivid red to dark burgundy */}
        <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#ef4444] via-[#dc2626] to-[#7f1d1d] font-extrabold group-hover:brightness-110 transition-all select-none">
          تورك
        </span>
      </div>

      {/* Exact B1 underline accent bar in red & dark burgundy */}
      <div className={`mt-0.5 ${sizeConfig.curveH} relative overflow-hidden rounded-full`}>
        <div className="w-full h-full bg-gradient-to-l from-transparent via-[#dc2626] to-[#881337] opacity-90 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};
