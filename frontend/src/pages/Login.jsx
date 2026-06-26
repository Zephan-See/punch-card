import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { api } from '../api';

export default function Login() {
  const [mode, setMode] = useState('login');  // login | register | forgot
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        navigate('/home');
      } else if (mode === 'register') {
        await register(form.name, form.email, form.password);
        navigate('/home');
      } else if (mode === 'forgot') {
        const res = await api.sendPasswordReset(form.email);
        if (res.error) throw new Error(res.error);
        alert('✅ 重置邮件已发送到 ' + form.email + '\n\n请查收邮箱，点击邮件里的链接设置新密码（也检查一下垃圾箱）');
        setMode('login');
      }
    } catch (e) {
      setError(e.message || '出错了');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Mascot greeting */}
        <div className="flex flex-col items-center mb-2">
          <img src="/stickers/Morning.png" alt="" className="w-32 h-32 object-contain" />
          <p className="text-base font-medium text-gray-700 mt-1">一日一卡，百日同行</p>
        </div>

        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800 inline-flex items-center justify-center gap-2 w-full"><CalendarDays size={22} /> 打卡小程序</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="姓名"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          )}
          <input
            type="email"
            placeholder="邮箱"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="密码"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '处理中...' : (mode === 'login' ? '登录' : mode === 'register' ? '注册' : '发送重置邮件')}
          </button>
        </form>

        {mode === 'login' && (
          <button
            onClick={() => { setMode('forgot'); setError(''); }}
            className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
          >
            忘记密码？
          </button>
        )}

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="w-full mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          {mode === 'login' ? '还没有账号？注册一个' : mode === 'register' ? '已有账号？登录' : '返回登录'}
        </button>

        {mode === 'register' && (
          <p className="text-center text-xs text-gray-400 mt-3 leading-relaxed">
            注册即表示你已阅读并同意
            <a href="/terms" className="text-indigo-600 hover:underline mx-0.5">服务条款</a>
            和
            <a href="/privacy" className="text-indigo-600 hover:underline mx-0.5">隐私政策</a>
          </p>
        )}

        <div className="flex items-center justify-center gap-3 mt-6 text-xs text-gray-400">
          <a href="/terms" className="hover:text-gray-600">服务条款</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-gray-600">隐私政策</a>
        </div>
      </div>
    </div>
  );
}
