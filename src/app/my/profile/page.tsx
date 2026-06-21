import { redirect } from 'next/navigation';
import Navbar from '@/components/landing/Navbar';
import ProfileClient from '@/components/my/ProfileClient';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title:  '내 프로필',
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, nickname, avatar_url, email, plan, created_at, trip_count')
    .eq('auth_id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <ProfileClient profile={profile} />
    </main>
  );
}
