import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { api } from '../api';
import CheckinCard from '../components/CheckinCard';

export default function Feed() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const loadFeed = () => {
    if (!user?.token) return;
    setLoading(true);
    api.getFeed(user.token)
      .then(data => setCheckins(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFeed();
  }, [user]);

  const updateCheckin = (checkinId, updates) => {
    setCheckins(prev => prev.map(c =>
      c.id === checkinId ? { ...c, ...updates } : c
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-500">← 返回</button>
          <h1 className="text-xl font-bold">📡 动态流</h1>
          <button onClick={loadFeed} className="text-indigo-600 text-sm">🔄 刷新</button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pt-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500">数据加载中...</p>
            <p className="text-xs text-gray-400 mt-2">请稍候 2-3 秒</p>
          </div>
        ) : checkins.length > 0 ? (
          checkins.map(checkin => (
            <CheckinCard
              key={checkin.id}
              checkin={checkin}
              displayName={checkin.signature || checkin.name}
              currentUserId={user?.id}
              token={user?.token}
              onUpdate={(updates) => updateCheckin(checkin.id, updates)}
              allowComment={checkin.user_id == user?.id}
            />
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">暂无动态</p>
            <p className="text-xs text-gray-400 mt-2">公开打卡墙的朋友打卡后会显示在这里</p>
          </div>
        )}
      </div>
    </div>
  );
}
