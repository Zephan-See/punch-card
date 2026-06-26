import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, RotateCw, BarChart3, Users, ClipboardList, Pencil, CalendarDays, TrendingUp, Heart, Flag } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import { api } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('stats');
  const [users, setUsers] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [reports, setReports] = useState([]);
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
      } else if (tab === 'reports') {
        const data = await api.adminGetReports(user.token);
        setReports(data);
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
    if (!confirm('⚠️ 永久删除这条打卡？\n\n如果只是想暂时隐藏，请用「隐藏」按钮')) return;
    const res = await api.adminDeleteCheckin(user.token, checkinId);
    if (res.error) alert('❌ ' + res.error);
    else { alert('✅ 已删除'); loadAll(); }
  };

  const handleResolveReport = async (reportId, alsoHideId) => {
    if (alsoHideId) {
      if (!confirm('确定隐藏被举报的打卡，并标记此举报已处理？')) return;
      const h = await api.adminToggleHideCheckin(user.token, alsoHideId, true);
      if (h.error) return alert('❌ 隐藏失败：' + h.error);
    } else {
      if (!confirm('标记此举报已处理（不采取行动）？')) return;
    }
    const res = await api.adminResolveReport(user.token, reportId);
    if (res.error) alert('❌ ' + res.error);
    else { alert('✅ 已处理'); loadAll(); }
  };

  const handleToggleHideCheckin = async (checkinId, isHidden) => {
    const next = !isHidden;
    const verb = next ? '隐藏' : '取消隐藏';
    if (!confirm(`${verb}这条打卡？\n\n${next ? '隐藏后所有人（含本人）无法看到、无法分享，但内容仍保留' : '恢复显示在动态流 / 打卡墙'}`)) return;
    const res = await api.adminToggleHideCheckin(user.token, checkinId, next);
    if (res.error) alert('❌ ' + res.error);
    else { alert(`✅ 已${verb}`); loadAll(); }
  };

  const handleToggleFreeze = async (userId, name, isFrozen) => {
    const next = !isFrozen;
    const verb = next ? '冻结' : '解冻';
    if (!confirm(`确定${verb}用户 "${name}" 吗？\n\n${next ? '冻结后将无法发布打卡、评论、点赞，但仍可登录浏览' : '解除限制，恢复正常使用'}`)) return;
    const res = await api.adminToggleFreeze(user.token, userId, next);
    if (res.error) alert('❌ ' + res.error);
    else { alert(`✅ 已${verb}`); loadAll(); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 - 手机适配 */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-3 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="text-white opacity-80 hover:opacity-100 text-sm inline-flex items-center gap-1"><ChevronLeft size={16} /> 返回</button>
          <h1 className="text-base sm:text-xl font-bold inline-flex items-center gap-2"><Shield size={18} /> 管理员后台</h1>
          <button onClick={loadAll} className="text-white opacity-80 hover:opacity-100 text-sm" aria-label="刷新"><RotateCw size={16} /></button>
        </div>
      </div>

      {/* Tab 切换 - 手机适配 */}
      <div className="bg-white shadow-sm sticky top-12 z-40">
        <div className="max-w-2xl mx-auto px-2 flex">
          {[
            { key: 'stats', label: '统计', Icon: BarChart3 },
            { key: 'users', label: '用户', Icon: Users },
            { key: 'checkins', label: '打卡', Icon: ClipboardList },
            { key: 'reports', label: '举报', Icon: Flag }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-2 py-2.5 font-medium text-sm border-b-2 transition inline-flex items-center justify-center gap-1.5 ${
                tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'
              }`}
            >
              <t.Icon size={16} /> {t.label}
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
                  <button onClick={() => setEditingActivity(true)} className="text-indigo-600 text-sm inline-flex items-center gap-1"><Pencil size={14} /> 编辑</button>
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
                <p className="text-xs text-orange-700 inline-flex items-center gap-1"><CalendarDays size={12} /> 今日打卡</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.todayCheckins}</p>
                <p className="text-xs text-orange-700 mt-1">人/次</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-3 rounded-lg border border-green-200">
                <p className="text-xs text-green-700 inline-flex items-center gap-1"><BarChart3 size={12} /> 最近 7 天</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.recent7DaysCheckins}</p>
                <p className="text-xs text-green-700 mt-1">次打卡</p>
              </div>
            </div>

            {/* 7 天趋势图 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-bold mb-3 text-sm inline-flex items-center gap-1.5"><TrendingUp size={14} /> 最近 7 天打卡趋势</h3>
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
              <h3 className="font-bold text-sm inline-flex items-center gap-1.5"><Users size={14} /> 用户列表（{users.length}）</h3>
            </div>
            {users.map(u => (
              <div key={u.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" loading="lazy" decoding="async" className="w-10 h-10 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {u.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold truncate text-sm">{u.name}</p>
                      {u.is_admin && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Admin</span>}
                      {u.frozen && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">已冻结</span>}
                      {!u.wall_public && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">私密</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    {u.signature && <p className="text-xs text-gray-600 mt-0.5 truncate">{u.signature}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-indigo-600">{u.total_days}天</p>
                    {!u.is_admin && (
                      <div className="flex flex-col items-end gap-1 mt-1">
                        <button
                          onClick={() => handleToggleFreeze(u.id, u.name, u.frozen)}
                          className={`text-xs ${u.frozen ? 'text-green-600' : 'text-blue-500'}`}
                        >
                          {u.frozen ? '解冻' : '冻结'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="text-xs text-red-500"
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'reports' ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <h3 className="font-bold text-sm inline-flex items-center gap-1.5"><Flag size={14} /> 待处理举报（{reports.length}）</h3>
            </div>
            {reports.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">暂无待处理举报</p>
            ) : reports.map(r => (
              <div key={r.id} className="p-3 border-b last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">
                    举报人：<span className="text-gray-700 font-medium">{r.reporter_name}</span> · {new Date(r.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mb-2">
                  <span className="font-semibold">原因：</span>{r.reason || '（未填）'}
                </p>
                {r.checkins ? (
                  <div className="bg-gray-50 rounded p-3 mb-2 text-sm">
                    {r.checkins.hidden_at && <span className="inline-block text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded mr-1">已隐藏</span>}
                    <span className="text-gray-700 whitespace-pre-wrap">{r.checkins.content}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mb-2">原打卡已被删除</p>
                )}
                <div className="flex gap-2">
                  {r.checkins && !r.checkins.hidden_at && (
                    <button
                      onClick={() => handleResolveReport(r.id, r.checkin_id)}
                      className="text-xs bg-yellow-500 text-white px-3 py-1.5 rounded-full"
                    >
                      隐藏并标记处理
                    </button>
                  )}
                  <button
                    onClick={() => handleResolveReport(r.id, null)}
                    className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full"
                  >
                    标记已处理
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'checkins' ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <h3 className="font-bold text-sm inline-flex items-center gap-1.5"><ClipboardList size={14} /> 所有打卡（{checkins.length}）</h3>
            </div>
            {checkins.map(c => (
              <div key={c.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                <div className="flex items-start gap-2 mb-2">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {c.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      {c.hidden_at && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">已隐藏</span>}
                    </div>
                    <p className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => handleToggleHideCheckin(c.id, !!c.hidden_at)}
                      className={`text-xs ${c.hidden_at ? 'text-green-600' : 'text-yellow-600'}`}
                    >
                      {c.hidden_at ? '取消隐藏' : '隐藏'}
                    </button>
                    <button
                      onClick={() => handleDeleteCheckin(c.id)}
                      className="text-xs text-red-500"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 ml-10 whitespace-pre-wrap text-sm">{c.content}</p>
                <p className="text-xs text-gray-400 mt-1 ml-10 inline-flex items-center gap-1"><Heart size={11} fill="currentColor" /> {c.like_count}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
