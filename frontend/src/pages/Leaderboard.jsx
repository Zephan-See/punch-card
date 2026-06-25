import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Lightbulb, Medal } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { api } from '../api';

const MEDAL_COLOR = ['#f5b342', '#a8a8a8', '#cd7f32'];

export default function Leaderboard() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.getLeaderboard()
      .then(data => setRanking(data))
      .finally(() => setLoading(false));
  }, []);

  const handleViewWall = (usr) => {
    if (usr.id == user?.id) {
      navigate('/wall');
      return;
    }
    if (!usr.wall_public) {
      alert('🔒 该用户设置了私密打卡墙，无法查看');
      return;
    }
    navigate(`/wall/${usr.id}`);
  };

  const getMedal = (idx) => {
    if (idx <= 2) return <Medal size={28} fill={MEDAL_COLOR[idx]} color={MEDAL_COLOR[idx]} strokeWidth={1.5} />;
    return idx + 1;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-500 inline-flex items-center gap-1"><ChevronLeft size={18} /> 返回</button>
          <h1 className="text-xl font-bold inline-flex items-center gap-2"><Trophy size={22} /> 排行榜</h1>
          <div></div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pt-6">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500">数据加载中...</p>
            <p className="text-xs text-gray-400 mt-2">请稍候 2-3 秒</p>
          </div>
        ) : ranking.length > 0 ? (
          <>
            {/* 前三名特殊样式 */}
            {ranking.slice(0, 3).length > 0 && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 mb-4 border border-yellow-200">
                <p className="text-center font-semibold text-orange-700 mb-3 inline-flex items-center justify-center gap-1.5 w-full"><Trophy size={16} /> 本期前三名</p>
                <div className="space-y-2">
                  {ranking.slice(0, 3).map((usr, idx) => (
                    <button
                      key={usr.id}
                      onClick={() => handleViewWall(usr)}
                      className={`w-full rounded-lg p-3 flex items-center justify-between transition shadow-sm ${
                        usr.id == user?.id ? 'bg-indigo-50 border-2 border-indigo-400' : 'bg-white hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getMedal(idx)}</span>
                        {usr.avatar_url ? (
                          <img src={usr.avatar_url} alt="" className="w-12 h-12 rounded-full" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg">
                            {usr.name?.[0] || '?'}
                          </div>
                        )}
                        <div className="text-left">
                          <p className="font-bold text-gray-800">
                            {usr.signature || usr.name}
                            {usr.id == user?.id && <span className="ml-2 text-xs text-indigo-600">(你)</span>}
                          </p>
                          {usr.signature && <p className="text-xs text-gray-500">@{usr.name}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-orange-600">{usr.total_days}</p>
                        <p className="text-xs text-gray-500">天</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 其余排名 */}
            {ranking.slice(3).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {ranking.slice(3).map((usr, idx) => (
                  <button
                    key={usr.id}
                    onClick={() => handleViewWall(usr)}
                    className={`w-full p-4 flex items-center justify-between border-b last:border-b-0 transition ${
                      usr.id == user?.id ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-semibold w-8 text-center">{idx + 4}</span>
                      {usr.avatar_url ? (
                        <img src={usr.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold">
                          {usr.name?.[0] || '?'}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-medium text-gray-800">
                          {usr.signature || usr.name}
                          {usr.id == user?.id && <span className="ml-2 text-xs text-indigo-600">(你)</span>}
                        </p>
                        {usr.signature && <p className="text-xs text-gray-500">@{usr.name}</p>}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-indigo-600">{usr.total_days}天</span>
                  </button>
                ))}
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-4 inline-flex items-center justify-center gap-1.5 w-full">
              <Lightbulb size={12} /> 点击任意用户查看 TA 的打卡墙
            </p>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">暂无排行数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
