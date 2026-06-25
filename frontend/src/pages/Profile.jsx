import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings, Check, Lock, Bell } from 'lucide-react';
import { loadSettings, saveSettings } from '../components/NotificationManager';
import { AuthContext } from '../AuthContext';
import { api } from '../api';
import AvatarCropper from '../components/AvatarCropper';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ signature: '', avatar: '' });
  const [wallPublic, setWallPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperImage, setCropperImage] = useState(null);
  const [notifSettings, setNotifSettings] = useState(loadSettings());
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const updateNotif = (patch) => {
    const next = { ...notifSettings, ...patch };
    setNotifSettings(next);
    saveSettings(next);
  };
  const enableNotifications = async () => {
    if (!('Notification' in window)) return alert('当前浏览器不支持通知（iOS Safari 需先把网页加到主屏幕）');
    try {
      if (window.Notification.permission === 'denied') return alert('通知已被拒绝。请到浏览器设置里重新允许。');
      if (window.Notification.permission === 'default') await window.Notification.requestPermission();
      updateNotif({ enabled: true });
    } catch (e) { alert('通知初始化失败：' + e.message); }
  };

  // 选择图片后打开裁切器
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('图片不能超过 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperImage(event.target.result);
    };
    reader.readAsDataURL(file);

    // 清空 input 让用户可以重复选同一张
    e.target.value = '';
  };

  // 裁切完成
  const handleCropConfirm = (croppedBase64) => {
    setEditForm(prev => ({ ...prev, avatar: croppedBase64 }));
    setCropperImage(null);
  };

  useEffect(() => {
    if (!user?.token) return;
    setLoading(true);
    api.getProfile(user.token).then(data => {
      if (!data.error) {
        setProfile(data);
        setWallPublic(data.wall_public === 1);
        setEditForm({ signature: data.signature || '', avatar: data.avatar_url || '' });
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleToggleWallPublic = async () => {
    const newStatus = !wallPublic;
    try {
      await api.updateProfile(user.token, { wall_public: newStatus ? 1 : 0 });
      setWallPublic(newStatus);
    } catch (e) {
      alert('设置失败');
    }
  };

  const handleSaveProfile = async () => {
    try {
      await api.updateProfile(user.token, { 
        signature: editForm.signature,
        avatar_url: editForm.avatar
      });
      setProfile({ ...profile, signature: editForm.signature, avatar_url: editForm.avatar });
      setEditingProfile(false);
      alert('✅ 个人资料已更新');
    } catch (e) {
      alert('更新失败');
    }
  };

  if (editingProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {cropperImage && (
          <AvatarCropper
            imageSrc={cropperImage}
            onConfirm={handleCropConfirm}
            onCancel={() => setCropperImage(null)}
          />
        )}
        <div className="bg-white shadow sticky top-0">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => setEditingProfile(false)} className="text-gray-500">← 返回</button>
            <h1 className="text-xl font-bold">编辑个人资料</h1>
            <div></div>
          </div>
        </div>
        <div className="max-w-md mx-auto p-4 pt-8">
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">个性签名</label>
              <input
                type="text"
                placeholder="输入你的个性签名"
                maxLength="50"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={editForm.signature}
                onChange={(e) => setEditForm({...editForm, signature: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">{editForm.signature.length}/50</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">头像</label>
              <div className="flex items-center gap-4">
                {editForm.avatar ? (
                  <img src={editForm.avatar} alt="头像" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold">
                    {profile?.name?.[0] || '?'}
                  </div>
                )}
                <div className="flex-1">
                  <label className="inline-block bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg cursor-pointer font-medium text-sm transition">
                    📷 选择并裁切
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                  {editForm.avatar && (
                    <button
                      onClick={() => setEditForm({...editForm, avatar: ''})}
                      className="ml-2 text-red-500 text-sm hover:text-red-700"
                    >
                      移除
                    </button>
                  )}
                  <p className="text-xs text-gray-500 mt-2">支持 JPG/PNG，自动压缩</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"
            >
              保存更改
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow sticky top-0">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-500 inline-flex items-center gap-1"><ChevronLeft size={18} /> 返回</button>
          <h1 className="text-xl font-bold inline-flex items-center gap-2"><Settings size={20} /> 设置</h1>
          <div></div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pt-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center mb-4">
            <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500">正在加载...</p>
          </div>
        ) : (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="text-center mb-6">
            {profile?.avatar_url && <img src={profile.avatar_url} alt="avatar" className="w-24 h-24 rounded-full mx-auto mb-4" />}
            <p className="text-lg font-semibold text-gray-600">{profile?.signature || '暂未设置签名'}</p>
            <p className="text-xs text-gray-500 mt-1">账号：{profile?.name}</p>
          </div>
          <button
            onClick={() => setEditingProfile(true)}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"
          >
            编辑个人资料
          </button>
        </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h3 className="font-semibold mb-4">隐私设置</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">打卡墙</p>
              <p className="text-sm text-gray-500">控制打卡墙的公开状态</p>
            </div>
            <button
              onClick={handleToggleWallPublic}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                wallPublic ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${wallPublic ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4 inline-flex items-center gap-1.5">
            {wallPublic ? <><Check size={12} /> 打卡墙已公开，朋友可以在排行榜查看</> : <><Lock size={12} /> 打卡墙已私密，只有你能看到</>}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h3 className="font-semibold mb-4 inline-flex items-center gap-2"><Bell size={16} /> 通知</h3>

          {typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission !== 'granted' && (
            <button
              onClick={enableNotifications}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 mb-3 text-sm"
            >
              开启通知权限
            </button>
          )}

          <label className="flex items-center justify-between py-2">
            <span className="text-sm">每日打卡提醒</span>
            <input
              type="checkbox"
              checked={notifSettings.remindDaily}
              onChange={e => updateNotif({ remindDaily: e.target.checked })}
              className="w-5 h-5 accent-indigo-600"
            />
          </label>

          <label className="flex items-center justify-between py-2">
            <span className="text-sm">提醒时间</span>
            <input
              type="time"
              value={notifSettings.dailyTime}
              onChange={e => updateNotif({ dailyTime: e.target.value })}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
              disabled={!notifSettings.remindDaily}
            />
          </label>

          <label className="flex items-center justify-between py-2">
            <span className="text-sm">新点赞 / 评论</span>
            <input
              type="checkbox"
              checked={notifSettings.remindLikes}
              onChange={e => updateNotif({ remindLikes: e.target.checked })}
              className="w-5 h-5 accent-indigo-600"
            />
          </label>

          <label className="flex items-center justify-between py-2">
            <span className="text-sm">连击成就（7 / 30 / 100 天）</span>
            <input
              type="checkbox"
              checked={notifSettings.remindStreak}
              onChange={e => updateNotif({ remindStreak: e.target.checked })}
              className="w-5 h-5 accent-indigo-600"
            />
          </label>

          <label className="flex items-center justify-between py-2">
            <span className="text-sm">目标达成提醒</span>
            <input
              type="checkbox"
              checked={notifSettings.remindGoal}
              onChange={e => updateNotif({ remindGoal: e.target.checked })}
              className="w-5 h-5 accent-indigo-600"
            />
          </label>

          <p className="text-xs text-gray-500 mt-3">
            通知只在网页打开时触发。装到主屏后效果更可靠。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold mb-4">账户</h3>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700"
          >
            登出
          </button>
        </div>
      </div>
    </div>
  );
}
