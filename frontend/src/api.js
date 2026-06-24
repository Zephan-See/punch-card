// ⚠️ 重要：替换为你最新部署的 Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbzbRYIBBDu-eSaL3NNpmFweNpivpR9kQ0lripJxUmwtJ84Dt0Ntq4X2CLqdIY5nAQxtMw/exec';

// 使用 text/plain 避免 CORS preflight 问题（Apps Script 不支持）
async function postAPI(action, data = {}) {
  try {
    const payload = JSON.stringify({ action, ...data });

    const res = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: payload
    });

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      return { error: '后端返回错误：' + text.substring(0, 100) };
    }
  } catch (e) {
    console.error('API Error:', e);
    return { error: '网络错误：' + e.message };
  }
}

async function getAPI(action, params = {}) {
  try {
    const queryParams = new URLSearchParams({ action, ...params });
    const url = `${API_URL}?${queryParams.toString()}`;
    
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });
    
    const text = await res.text();
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      return { error: '后端返回错误' };
    }
  } catch (e) {
    console.error('API Error:', e);
    return { error: '网络错误：' + e.message };
  }
}

export const api = {
  register: (name, email, password) => postAPI('register', { name, email, password }),
  login: (email, password) => postAPI('login', { email, password }),
  getProfile: (token) => postAPI('getProfile', { token }),
  updateProfile: (token, updates) => postAPI('updateProfile', { token, ...updates }),
  checkIn: (token, content, mediaFields = {}) => postAPI('checkIn', { token, content, ...mediaFields }),
  getMyCheckins: async (token) => {
    const res = await postAPI('getMyCheckins', { token });
    return res.data || [];
  },
  getWall: async (userId) => {
    const res = await getAPI('getWall', { userId });
    if (res.error) throw new Error(res.error);
    return res.data || [];
  },
  getLeaderboard: async () => {
    const res = await getAPI('leaderboard');
    return res.data || [];
  },
  getFeed: async (token) => {
    const res = await postAPI('feed', { token });
    return res.data || [];
  },
  like: (token, checkinId) => postAPI('like', { token, checkinId }),
  unlike: (token, checkinId) => postAPI('unlike', { token, checkinId }),
  addComment: (token, checkinId, content) => postAPI('addComment', { token, checkinId, content }),
  getComments: async (checkinId) => {
    const res = await getAPI('getComments', { checkinId });
    return res.data || [];
  },
  deleteComment: (token, commentId) => postAPI('deleteComment', { token, commentId }),

  // Admin APIs
  checkAdmin: (token) => postAPI('isAdmin', { token }),
  adminStats: (token) => postAPI('adminStats', { token }),
  adminUsers: async (token) => {
    const res = await postAPI('adminUsers', { token });
    return res.data || [];
  },
  adminAllCheckins: async (token) => {
    const res = await postAPI('adminAllCheckins', { token });
    return res.data || [];
  },
  adminDeleteUser: (token, userId) => postAPI('adminDeleteUser', { token, userId }),
  adminDeleteCheckin: (token, checkinId) => postAPI('adminDeleteCheckin', { token, checkinId }),
  adminUpdateSettings: (token, settings) => postAPI('adminUpdateSettings', { token, ...settings }),

  // Settings (public read)
  getSettings: async () => {
    const res = await getAPI('getSettings');
    return res || {};
  }
};
