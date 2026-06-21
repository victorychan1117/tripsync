'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Pencil, Mail, Calendar, Crown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const EMOJI_AVATARS = [
  '✈️','🌏','🗺️','🏖️','🏔️','🗼','🎒','🌸',
  '⭐','🦋','🌙','☀️','🌺','🍀','🦊','🐱',
  '🌊','🏄','🎯','🚀','🏕️','🌄','🌴','🐚',
];

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  email: string | null;
  plan: string;
  created_at: string;
  trip_count: number;
}

function AvatarDisplay({
  nickname,
  avatarUrl,
  size = 88,
}: {
  nickname: string;
  avatarUrl: string | null;
  size?: number;
}) {
  if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
    return (
      <img
        src={avatarUrl}
        alt="avatar"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }
  if (avatarUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#f1f5f9', border: '2px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.46, lineHeight: 1,
      }}>
        {avatarUrl}
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: 'white',
      boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
    }}>
      {nickname.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProfileClient({ profile }: { profile: Profile }) {
  const [nickname, setNickname]           = useState(profile.nickname);
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(profile.avatar_url);
  const [saving, setSaving]               = useState(false);
  const [showPicker, setShowPicker]       = useState(false);
  const [toast, setToast]                 = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) { showToast('닉네임을 입력해주세요.', 'err'); return; }
    if (trimmed.length > 20) { showToast('닉네임은 20자 이하로 입력해주세요.', 'err'); return; }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({ nickname: trimmed, avatar_url: avatarUrl })
        .eq('id', profile.id);
      if (error) throw error;
      showToast('프로필이 저장됐어요.');
    } catch {
      showToast('저장에 실패했어요.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const joinedAt = new Date(profile.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const isDirty = nickname.trim() !== profile.nickname || avatarUrl !== profile.avatar_url;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-5">

        {/* ── 프로필 편집 카드 ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* 그라디언트 헤더 */}
          <div
            className="h-24"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          />

          <div className="px-6 pb-8 -mt-12">
            {/* 아바타 */}
            <div className="relative inline-block mb-4">
              <AvatarDisplay nickname={nickname || '?'} avatarUrl={avatarUrl} size={80} />
              <button
                onClick={() => setShowPicker(v => !v)}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-500 hover:bg-violet-600 rounded-full flex items-center justify-center shadow-md transition-colors"
                title="아바타 변경"
              >
                <Pencil size={12} color="white" />
              </button>
            </div>

            {/* 이모지 피커 */}
            <AnimatePresence>
              {showPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="overflow-hidden mb-5"
                >
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">
                      아바타 선택
                    </p>
                    <div className="grid grid-cols-8 gap-1.5">
                      {EMOJI_AVATARS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => { setAvatarUrl(emoji); setShowPicker(false); }}
                          className={[
                            'w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all hover:bg-violet-100',
                            avatarUrl === emoji ? 'bg-violet-100 ring-2 ring-violet-400' : 'bg-white',
                          ].join(' ')}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { setAvatarUrl(null); setShowPicker(false); }}
                      className="mt-3 w-full text-[11px] text-slate-400 hover:text-violet-500 font-semibold transition-colors pt-3 border-t border-slate-200"
                    >
                      기본 이니셜로 초기화
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 닉네임 */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                  닉네임
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  maxLength={20}
                  placeholder="닉네임 입력"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 focus:bg-white transition-all"
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-[11px] text-slate-400">공개 페이지에서 여행장 이름으로 표시돼요.</p>
                  <p className="text-[11px] text-slate-400">{nickname.length}/20</p>
                </div>
              </div>

              <motion.button
                onClick={handleSave}
                disabled={saving || !isDirty}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-sm font-bold rounded-xl shadow-md shadow-violet-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                {saving ? '저장 중...' : '변경 사항 저장'}
              </motion.button>
            </div>
          </div>
        </div>

        {/* ── 계정 정보 (읽기 전용) ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-extrabold text-slate-700 mb-4">계정 정보</h3>
          <div className="space-y-0 divide-y divide-slate-100">
            {[
              { icon: <Mail size={15} color="#6366F1" />, label: '이메일', value: profile.email ?? '—' },
              { icon: <Calendar size={15} color="#6366F1" />, label: '가입일', value: joinedAt },
              {
                icon: <Crown size={15} color={profile.plan === 'premium' ? '#F59E0B' : '#94a3b8'} />,
                label: '플랜',
                value: profile.plan === 'premium' ? '프리미엄' : '무료',
                badge: true,
              },
            ].map(({ icon, label, value, badge }) => (
              <div key={label} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-2.5">
                  {icon}
                  <span className="text-[13px] text-slate-500 font-semibold">{label}</span>
                </div>
                {badge ? (
                  <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${
                    profile.plan === 'premium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {value}
                  </span>
                ) : (
                  <span className="text-[13px] text-slate-700 font-semibold">{value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 토스트 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={[
              'fixed bottom-safe left-1/2 -translate-x-1/2 z-[200] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl pointer-events-none whitespace-nowrap',
              toast.type === 'err' ? 'bg-red-500' : 'bg-slate-900',
            ].join(' ')}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
