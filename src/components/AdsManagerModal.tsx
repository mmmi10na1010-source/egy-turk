import React, { useState } from 'react';
import { X, Check, Megaphone, Info } from 'lucide-react';
import { AdSettings } from '../types';

interface AdsManagerModalProps {
  initialSettings: AdSettings;
  onSave: (settings: AdSettings) => void;
  onClose: () => void;
}

export const AdsManagerModal: React.FC<AdsManagerModalProps> = ({
  initialSettings,
  onSave,
  onClose
}) => {
  const [isEnabled, setIsEnabled] = useState(initialSettings.isEnabled);
  const [headerScript, setHeaderScript] = useState(initialSettings.headerScript || '');
  const [playerBannerHtml, setPlayerBannerHtml] = useState(initialSettings.playerBannerHtml || '');
  const [homeBannerHtml, setHomeBannerHtml] = useState(initialSettings.homeBannerHtml || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      isEnabled,
      headerScript: headerScript.trim(),
      playerBannerHtml: playerBannerHtml.trim(),
      homeBannerHtml: homeBannerHtml.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0e0e14] border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl my-auto space-y-5 animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white shadow-md">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>إدارة إعلانات موقع ايجي تورك (EGY TURK)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 font-mono">
                  ADS MANAGER
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                إضافة وتشغيل أكواد إعلانات الشبكات الإعلانية بسهولة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#161620] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#161620] border border-zinc-800">
            <div>
              <h4 className="text-sm font-bold text-white">تفعيل الإعلانات في الموقع</h4>
              <p className="text-xs text-zinc-400">
                عند التعطيل، لن تظهر أي إعلانات للزوار حتى لو كانت الأكواد موجودة
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#881337]"></div>
            </label>
          </div>

          <div className="p-3.5 rounded-xl bg-red-950/35 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">كيف تضيف كود الإعلانات؟</p>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                انسخ الكود المقدم لك من شبكة الإعلانات وضعه في الحقل المناسب أدناه وسيتم تفعيله فورياً عبر السحابة.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-200">
              كود التحقق العام / كود الهيدر (Header Script)
            </label>
            <textarea
              rows={3}
              value={headerScript}
              onChange={(e) => setHeaderScript(e.target.value)}
              placeholder='<script async src="..."></script>'
              dir="ltr"
              className="w-full bg-[#161620] border border-zinc-700 focus:border-[#b91c1c] rounded-xl p-3 text-xs text-white font-mono outline-none text-left"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-200">
              كود بنر إعلاني أسفل مشغل الفيديو (Player Banner)
            </label>
            <textarea
              rows={3}
              value={playerBannerHtml}
              onChange={(e) => setPlayerBannerHtml(e.target.value)}
              placeholder="<!-- ضع كود البنر هنا HTML أو Script -->"
              dir="ltr"
              className="w-full bg-[#161620] border border-zinc-700 focus:border-[#b91c1c] rounded-xl p-3 text-xs text-white font-mono outline-none text-left"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-200">
              كود بنر إعلاني في الصفحة الرئيسية (Home Banner)
            </label>
            <textarea
              rows={3}
              value={homeBannerHtml}
              onChange={(e) => setHomeBannerHtml(e.target.value)}
              placeholder="<!-- ضع كود بنر الصفحة الرئيسية هنا -->"
              dir="ltr"
              className="w-full bg-[#161620] border border-zinc-700 focus:border-[#b91c1c] rounded-xl p-3 text-xs text-white font-mono outline-none text-left"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#161620] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-semibold transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#b91c1c] to-[#881337] hover:from-[#dc2626] hover:to-[#9F1239] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>حفظ إعدادات الإعلانات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
