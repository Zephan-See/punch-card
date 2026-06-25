import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Pin, Pencil, Lightbulb, Camera, Radio, Trophy, Settings, Shield } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { api } from '../api';
import Mascot from '../components/Mascot';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activityName, setActivityName] = useState('');

  useEffect(() => {
    if (!user?.token) return;
    setLoading(true);
    Promise.all([
      api.getProfile(user.token).then(data => {
        if (!data.error) setProfile(data);
      }),
      api.checkAdmin(user.token).then(res => setIsAdmin(res?.isAdmin === true)),
      api.getSettings().then(s => setActivityName(s.activity_name || '100人100天打卡活动'))
    ])
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [user]);

  const today = new Date().toLocaleDateString('zh-CN');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2"><CalendarDays size={22} /> 打卡</h1>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-gray-500 hover:text-gray-700 text-sm">
            登出
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pt-8 pb-20">
        {activityName && (
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-lg shadow-lg p-4 mb-4 text-center">
            <p className="text-xs opacity-80 mb-1 inline-flex items-center gap-1"><Pin size={12} /> 当前活动</p>
            <p className="text-lg font-bold">{activityName}</p>
          </div>
        )}

        <Mascot />

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-gray-400">
                <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></span>
                加载中...
              </span>
            ) : (
              <>{profile?.signature || profile?.name || '用户'}，欢迎回来！</>
            )}
          </h2>
          <p className="text-gray-500 text-sm mb-6">{today}</p>

          <button
            onClick={() => navigate('/checkin')}
            className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 mb-4 inline-flex items-center justify-center gap-2"
          >
            <Pencil size={18} /> 立即打卡
          </button>

          <p className="text-center text-gray-500 text-sm inline-flex items-center justify-center gap-1.5 w-full">
            <Lightbulb size={14} /> 每人每天只能打卡一次
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => navigate('/wall')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition inline-flex items-center justify-center gap-2">
            <Camera size={18} /> 我的打卡墙
          </button>
          <button onClick={() => navigate('/feed')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition inline-flex items-center justify-center gap-2">
            <Radio size={18} /> 动态流
          </button>
          <button onClick={() => navigate('/leaderboard')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition inline-flex items-center justify-center gap-2">
            <Trophy size={18} /> 排行榜
          </button>
          <button onClick={() => navigate('/profile')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition inline-flex items-center justify-center gap-2">
            <Settings size={18} /> 设置
          </button>
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full mt-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition inline-flex items-center justify-center gap-2"
          >
            <Shield size={18} /> 管理员后台
          </button>
        )}
      </div>
    </div>
  );
}
