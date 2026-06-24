import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../AuthContext';
import { api } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('stats');
  const [users, setUsers] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [activityName, setActivityName] = useState('');
  const [editingActivity, setEditingActivity] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.token) return;
    loadAll();
  }, [user, tab]);

  const loadAll = async () => {
    setLoading(true);
    try {
      if (tab === 'stats') {
        const [statsData, settingsData] = await Promise.all([
          api.adminStats(user.token),
          api.getSettings()
        ]);
        if (statsData.error) {
          alert('❌ ' + statsData.error);
          navigate('/home');
          return;
        }
        setStats(statsData);
        setActivityName(settingsData.activity_name || '100人100天打卡活动');
      } else if (tab === 'users') {
        const data = await api.adminUsers(user.token);
        setUsers(data);
      } else if (tab === 'checkins') {
        const data = await api.adminAllCheckins(user.token);
        setCheckins(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveActivity = async () => {
    const res = await api.adminUpdateSettings(user.token, { activity_name: activityName });
    if (res.error) alert('❌ ' + res.error);
    else {
      alert('✅ 已更新活动名称');
      setEditingActivity(false);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!confirm(`⚠️ 确定删除用户 "${name}" 吗？\n\n会删除他的所有打卡、评论、点赞`)) return;
    const res = await api.adminDeleteUser(user.token, userId);
    if (res.error) alert('❌ ' + res.error);
    else { alert('✅ 已删除'); loadAll(); }
  };

  const handleDeleteCheckin = async (checkinId) => {
    if (!confirm('⚠️ 删除这条打卡？')) return;
    const res = await api.adminDeleteCheckin(user.token, checkinId);
    if (res.error) alert('❌ ' + res.error);
    else { alert('✅ 已删除'); loadAll(); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 - 手机适配 */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-3 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="text-white opacity-80 hover:opacity-100 text-sm">← 返回</button>
          <h1 className="text-base sm:text-xl font-bold">🛡️ 管理员后台</h1>
          <button onClick={loadAll} className="text-white opacity-80 hover:opacity-100 text-sm">🔄</button>
        </div>
      </div>

      {/* Tab 切换 - 手机适配 */}
      <div className="bg-white shadow-sm sticky top-12 z-40">
        <div className="max-w-2xl mx-auto px-2 flex">
          {[
            { key: 'stats', label: '📊 统计' },
            { key: 'users', label: '👥 用户' },
            { key: 'checkins', label: '📝 打卡' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-2 py-2.5 font-medium text-sm border-b-2 transition ${
                tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-3">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500">数据加载中...</p>
          </div>
        ) : tab === 'stats' && stats ? (
          <>
            {/* 活动名称卡片 */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-3">
              <p className="text-xs text-gray-500 mb-1">活动名称</p>
              {editingActivity ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    maxLength="50"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    autoFocus
                  />
                  <button onClick={handleSaveActivity} className="bg-indigo-600 text-white px-4 rounded-lg text-sm">保存</button>
                  <button onClick={() => setEditingActivity(false)} className="bg-gray-200 text-gray-700 px-3 rounded-lg text-sm">取消</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-bold text-lg">{activityName}</p>
                  <button onClick={() => setEditingActivity(true)} className="text-indigo-600 text-sm">✏️ 编辑</button>
                </div>
              )}
            </div>

            {/* 总览 - 2列 grid 适配手机 */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500">总用户</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.totalUsers}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500">总打卡</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalCheckins}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500">总点赞</p>
                <p className="text-2xl font-bold text-red-500">{stats.totalLikes}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500">总评论</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalComments}</p>
              </div>
            </div>

            {/* 今日 / 7天 */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gradient-to-br from-orange-50 to-red-50 p-3 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-700">📅 今日打卡</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.todayCheckins}</p>
                <p className="text-xs text-orange-700 mt-1">人/次</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-3 rounded-lg border border-green-200">
                <p className="text-xs text-green-700">📊 最近 7 天</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.recent7DaysCheckins}</p>
                <p className="text-xs text-green-700 mt-1">次打卡</p>
              </div>
            </div>

            {/* 7 天趋势图 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-bold mb-3 text-sm">📈 最近 7 天打卡趋势</h3>
              <div className="flex items-end justify-between gap-1 h-32">
                {stats.dailyTrend?.map((d, i) => {
                  const maxCount = Math.max(...stats.dailyTrend.map(x => x.count), 1);
                  const heightPct = (d.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className="flex-1 w-full flex flex-col justify-end mb-1">
                        <div
                          className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t relative"
                          style={{ height: `${heightPct}%`, minHeight: d.count > 0 ? '6px' : '2px' }}
                        >
                          {d.count > 0 && (
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-indigo-600">
                              {d.count}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{d.date.slice(5)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : tab === 'users' ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <h3 className="font-bold text-sm">👥 用户列表（{users.length}）</h3>
            </div>
            {users.map(u => (
              <div key={u.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {u.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold truncate text-sm">{u.name}</p>
                      {u.is_admin && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Admin</span>}
                      {!u.wall_public && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">私密</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    {u.signature && <p className="text-xs text-gray-600 mt-0.5 truncate">{u.signature}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-indigo-600">{u.total_days}天</p>
                    {!u.is_admin && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="text-xs text-red-500 mt-1"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'checkins' ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <h3 className="font-bold text-sm">📝 所有打卡（{checkins.length}）</h3>
            </div>
            {checkins.map(c => (
              <div key={c.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                <div className="flex items-start gap-2 mb-2">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {c.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    <p className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteCheckin(c.id)}
                    className="text-xs text-red-500"
                  >
                    删除
                  </button>
                </div>
                <p className="text-gray-700 ml-10 whitespace-pre-wrap text-sm">{c.content}</p>
                <p className="text-xs text-gray-400 mt-1 ml-10">❤️ {c.like_count}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
