import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Camera } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { api } from '../api';
import CheckinCard from '../components/CheckinCard';

export default function Wall() {
  const [checkins, setCheckins] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { userId } = useParams();  // /wall/:userId 查看朋友

  const viewingFriend = userId && userId != user?.id;

  const loadData = () => {
    if (!user?.token) return;
    setLoading(true);
    setError('');

    if (viewingFriend) {
      // 查看朋友的打卡墙
      api.getWall(userId)
        .then(data => {
          setCheckins(data);
          // 从第一条打卡里取用户信息
          if (data.length > 0) {
            setUserInfo({ name: data[0].name, avatar_url: data[0].avatar_url, signature: data[0].signature });
          }
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      // 查看自己的打卡墙
      Promise.all([
        api.getMyCheckins(user.token).then(data => setCheckins(data)),
        api.getProfile(user.token).then(data => {
          if (!data.error) setUserInfo(data);
        })
      ]).finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadData();
  }, [user, userId]);

  const updateCheckin = (checkinId, updates) => {
    setCheckins(prev => prev.map(c =>
      c.id === checkinId ? { ...c, ...updates } : c
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-500 inline-flex items-center gap-1"><ChevronLeft size={18} /> 返回</button>
          <h1 className="text-xl font-bold inline-flex items-center gap-2">
            <Camera size={20} />
            {viewingFriend ? `${userInfo?.name || ''}的打卡墙` : '我的打卡墙'}
          </h1>
          <div></div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pt-6">
        {/* 用户信息卡片（查看朋友时） */}
        {viewingFriend && userInfo && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 text-center">
            {userInfo.avatar_url ? (
              <img src={userInfo.avatar_url} alt="" loading="lazy" decoding="async" className="w-16 h-16 rounded-full mx-auto mb-2" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                {userInfo.name?.[0] || '?'}
              </div>
            )}
            <p className="font-semibold">{userInfo.name}</p>
            {userInfo.signature && <p className="text-sm text-gray-500 mt-1">{userInfo.signature}</p>}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500">数据加载中...</p>
            <p className="text-xs text-gray-400 mt-2">请稍候 2-3 秒</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">❌ {error}</p>
          </div>
        ) : checkins.length > 0 ? (
          checkins.map(checkin => (
            <CheckinCard
              key={checkin.id}
              checkin={checkin}
              displayName={viewingFriend ? (userInfo?.signature || checkin.name) : (userInfo?.signature || userInfo?.name)}
              currentUserId={user?.id}
              token={user?.token}
              onUpdate={(updates) => updateCheckin(checkin.id, updates)}
              allowComment={!viewingFriend}
            />
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">暂无打卡记录</p>
            {!viewingFriend && <p className="text-xs text-gray-400 mt-2">回到首页打卡试试</p>}
          </div>
        )}
      </div>
    </div>
  );
}
