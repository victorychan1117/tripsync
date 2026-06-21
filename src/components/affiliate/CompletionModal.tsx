'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Circle } from 'lucide-react';
import type { AffiliateInsertion } from '@/lib/affiliate/affiliateRules';

const STORAGE_KEY = (roomId: string) => `completion_modal_dismissed_${roomId}`;

interface Props {
  roomId:       string;
  destination:  string | null;
  markerCount:  number;
  hasLodging:   boolean;
  insuranceCTA: AffiliateInsertion;
  lodgingUrl:   string | null;
}

function trackClick(partner: string, roomId: string, destination: string | null) {
  fetch('/api/affiliate/click', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partner, roomId, destination }),
  }).catch(() => {});
}

export default function CompletionModal({
  roomId, destination, markerCount, hasLodging, insuranceCTA, lodgingUrl,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY(roomId))) return;
    } catch {
      return; // 개인정보 보호 모드 등 localStorage 접근 불가 시 미표시
    }
    const timer = setTimeout(() => setVisible(true), 1600);
    return () => clearTimeout(timer);
  }, [roomId]);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY(roomId), '1'); } catch { /* noop */ }
    setVisible(false);
  }, [roomId]);

  const handleInsuranceClick = useCallback(() => {
    trackClick(insuranceCTA.partner, roomId, destination);
    dismiss();
    window.open(insuranceCTA.url, '_blank', 'noopener,noreferrer');
  }, [insuranceCTA, roomId, destination, dismiss]);

  const handleLodgingClick = useCallback(() => {
    trackClick('AGODA', roomId, destination);
    window.open(lodgingUrl!, '_blank', 'noopener,noreferrer');
  }, [roomId, destination, lodgingUrl]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* 딤 배경 */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[700] bg-black/40"
            onClick={dismiss}
          />

          {/* 모달 본체 — 모바일: 바텀시트 / 데스크톱: 중앙 */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            onClick={e => e.stopPropagation()}
            className="fixed bottom-0 sm:bottom-auto sm:top-1/2 left-0 sm:left-1/2 right-0 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 z-[701] w-full sm:w-[420px] bg-white rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl"
          >
            {/* ── 헤더 ── */}
            <div className="bg-gradient-to-r from-violet-500 to-indigo-500 px-5 pt-5 pb-4">
              {/* 모바일 핸들 */}
              <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-4 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-white font-black text-[17px] leading-snug tracking-tight">
                    ✈️ 여행 준비 체크리스트
                  </h3>
                  <p className="text-white/75 text-[12px] mt-0.5">
                    일정이 완성됐어요! 출발 전 아래 항목을 확인해보세요.
                  </p>
                </div>
                <button
                  onClick={dismiss}
                  aria-label="모달 닫기"
                  className="shrink-0 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors mt-0.5"
                >
                  <X size={14} color="white" />
                </button>
              </div>
            </div>

            {/* ── 체크리스트 ── */}
            <div className="px-5 pt-4 pb-2 flex flex-col gap-3">

              {/* 1. 여행 일정 작성 — 항상 완료 */}
              <CheckRow
                done
                emoji="📍"
                label="여행 일정 작성"
                sublabel={`${markerCount}개 장소가 등록됐어요`}
              />

              {/* 2. 숙소 — 마커 카테고리로 자동 감지 */}
              {hasLodging ? (
                <CheckRow
                  done
                  emoji="🏨"
                  label="숙소 등록"
                  sublabel="일정에 숙소가 포함되어 있어요"
                />
              ) : (
                <CheckRow
                  done={false}
                  emoji="🏨"
                  label="숙소 예약"
                  sublabel="아직 숙소가 등록되지 않았어요"
                  ctaLabel={lodgingUrl ? '아고다 →' : undefined}
                  onCta={lodgingUrl ? handleLodgingClick : undefined}
                  ctaColor="bg-gradient-to-r from-orange-500 to-red-500"
                />
              )}

              {/* 3. 여행자보험 — affiliateRules COMPLETION_MODAL CTA */}
              <CheckRow
                done={false}
                emoji={insuranceCTA.emoji}
                label={insuranceCTA.label}
                sublabel={insuranceCTA.sublabel}
                ctaLabel="가입하기 →"
                onCta={handleInsuranceClick}
                ctaStyle={insuranceCTA.bgGradient}
              />
            </div>

            {/* ── 푸터 ── */}
            <div className="px-5 pb-6 pt-2">
              <button
                onClick={dismiss}
                className="w-full py-3 text-[13px] font-semibold text-slate-400 hover:text-slate-600 transition-colors rounded-2xl hover:bg-slate-50"
              >
                다시 보지 않기
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── 체크리스트 행 ─────────────────────────────────────────────────────
function CheckRow({
  done, emoji, label, sublabel, ctaLabel, onCta, ctaStyle, ctaColor,
}: {
  done:       boolean;
  emoji:      string;
  label:      string;
  sublabel:   string;
  ctaLabel?:  string;
  onCta?:     () => void;
  ctaStyle?:  string;   // CSS background (gradient string)
  ctaColor?:  string;   // Tailwind class fallback
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl ${done ? 'bg-emerald-50' : 'bg-slate-50'}`}>
      {done
        ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
        : <Circle       size={20} className="text-slate-300  shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] leading-none select-none">{emoji}</span>
          <p className={`text-[13px] font-bold truncate ${done ? 'text-emerald-700' : 'text-slate-700'}`}>
            {label}
          </p>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sublabel}</p>
      </div>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-xl text-white transition-all active:scale-95 ${ctaColor ?? ''}`}
          style={ctaStyle ? { background: ctaStyle } : undefined}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
