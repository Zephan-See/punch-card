import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { supabase } from '../supabase';
import { api } from '../api';

// Reached via the link in the password-reset email. Supabase auto-creates
// a temporary recovery session from the URL hash; we just collect a new
// password and call updateUser.
export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Either the PASSWORD_RECOVERY event fires (immediately on link open),
    // or there's already a session (page refresh) — both are valid entry points.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('密码至少 6 位');
    if (password !== confirmPwd) return setError('两次输入的密码不一致');
    setLoading(true);
    const res = await api.updatePassword(password);
    setLoading(false);
    if (res.error) return setError(res.error);
    await supabase.auth.signOut();
    alert('✅ 密码已重置，请用新密码登录');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-800 inline-flex items-center justify-center gap-2 w-full">
          <KeyRound size={22} /> 重置密码
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">设置一个新密码即可继续打卡</p>

        {!ready ? (
          <p className="text-center text-gray-500 text-sm py-8">
            正在验证重置链接...<br />
            <span className="text-xs text-gray-400">链接已过期？请回到登录页重新申请</span>
          </p>
        ) : (
          <>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                placeholder="新密码（至少 6 位）"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="再输一次新密码"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存新密码'}
              </button>
            </form>
          </>
        )}

        <button
          onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
          className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm"
        >
          返回登录
        </button>
      </div>
    </div>
  );
}
