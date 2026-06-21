'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { AffiliateInsertion } from '@/lib/affiliate/affiliateRules';

interface Props {
  insertion:    AffiliateInsertion;
  roomId:       string;
  destination?: string | null;
  /** header — 페이지 상단 전체 폭 배너 / divider — Day 사이 컴팩트 배너 */
  variant:      'header' | 'divider';
  className?:   string;
}

export default function AffiliateBanner({
  insertion,
  roomId,
  destination,
  variant,
  className = '',
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  const handleClick = () => {
    // 클릭 추적 — 실패해도 링크 이동 차단 안 함
    fetch('/api/affiliate/click', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner:     insertion.partner,
        roomId,
        destination: destination ?? null,
      }),
    }).catch(() => {});

    window.open(insertion.url, '_blank', 'noopener,noreferrer');
  };

  const isHeader = variant === 'header';

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={className}
        >
          <div
            style={{ background: insertion.bgGradient }}
            className={`relative rounded-2xl text-white overflow-hidden ${
              isHeader ? 'px-4 py-4 shadow-md' : 'px-3.5 py-2.5'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* 이모지 */}
              <span
                className="shrink-0 select-none leading-none"
                style={{ fontSize: isHeader ? 22 : 18 }}
              >
                {insertion.emoji}
              </span>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <p className={`font-extrabold leading-tight ${isHeader ? 'text-[14px]' : 'text-[13px]'}`}>
                  {insertion.label}
                </p>
                <p className={`text-white/75 font-medium truncate mt-0.5 ${isHeader ? 'text-[12px]' : 'text-[11px]'}`}>
                  {insertion.sublabel}
                </p>
              </div>

              {/* CTA 버튼 */}
              <button
                onClick={handleClick}
                className={`shrink-0 rounded-xl font-bold text-white bg-white/20 hover:bg-white/30 active:scale-95 transition-all ${
                  isHeader ? 'px-4 py-2 text-[13px]' : 'px-3 py-1.5 text-[12px]'
                }`}
              >
                {isHeader ? '최저가 검색 →' : '확인 →'}
              </button>

              {/* 닫기 */}
              <button
                onClick={() => setDismissed(true)}
                aria-label="배너 닫기"
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
