import { useState, useRef, lazy, Suspense } from 'react';
import { Heart, MessageCircle, Share2, ImageIcon, Send, Download } from 'lucide-react';
import { api } from '../api';

// Poster + its deps (html-to-image, qrcode.react) are ~150KB — only load
// when a user actually clicks the 海报 button.
const Poster = lazy(() => import('./Poster'));

const formatDateTime = (dateString) => {
  if (!dateString) return { date: '未知', time: '未知' };
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString('zh-CN');
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return { date: dateStr, time: timeStr };
};

export default function CheckinCard({ checkin, displayName, currentUserId, token, onUpdate, allowComment = true }) {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterMounted, setPosterMounted] = useState(false);
  const [posterCheckin, setPosterCheckin] = useState(null);
  const posterRef = useRef(null);

  // Fetch a URL and convert to base64 data URL. Falls back to original URL
  // on failure so the poster never just disappears the image entirely.
  const toDataUrl = async (url) => {
    if (!url || url.startsWith('data:')) return url || '';
    try {
      const blob = await fetch(url, { mode: 'cors' }).then(r => r.blob());
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('preload failed', url, e);
      return url;
    }
  };

  const { date, time } = formatDateTime(checkin.created_at);
  const isOwn = checkin.user_id == currentUserId;

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const data = await api.getComments(checkin.id);
      setComments(data || []);
    } catch (e) {
      console.error('loadComments error:', e);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  };

  const handleLike = async () => {
    if (submitting || !token) return;
    setSubmitting(true);

    // Optimistic update via parent
    const wasLiked = checkin.is_liked;
    onUpdate({
      is_liked: !wasLiked,
      like_count: wasLiked ? Math.max(0, (checkin.like_count || 1) - 1) : (checkin.like_count || 0) + 1
    });

    const res = wasLiked
      ? await api.unlike(token, checkin.id)
      : await api.like(token, checkin.id);

    if (res.error) {
      // 失败时回滚
      onUpdate({
        is_liked: wasLiked,
        like_count: checkin.like_count
      });
      alert(res.error);
    }
    setSubmitting(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !token) return;
    setSubmitting(true);
    const res = await api.addComment(token, checkin.id, newComment);
    if (res.error) {
      alert(res.error);
    } else {
      setNewComment('');
      await loadComments();
      // 只更新评论数，不影响点赞
      onUpdate({ comment_count: (checkin.comment_count || 0) + 1 });
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('删除这条留言？')) return;
    const res = await api.deleteComment(token, commentId);
    if (res.error) {
      alert(res.error);
    } else {
      await loadComments();
      onUpdate({ comment_count: Math.max(0, (checkin.comment_count || 1) - 1) });
    }
  };

  const handleShare = async () => {
    const shareText = `📅 ${displayName || checkin.name} 的打卡：\n\n"${checkin.content}"\n\n${date} ${time}\n\n— 来自打卡小程序`;
    const shareUrl = window.location.origin + `/wall/${checkin.user_id}`;

    // 优先用 Web Share API（手机原生分享）
    if (navigator.share) {
      try {
        await navigator.share({
          title: '我的打卡',
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      }
    }

    // 备用：复制到剪贴板
    try {
      await navigator.clipboard.writeText(shareText + '\n' + shareUrl);
      alert('📋 已复制到剪贴板！\n\n粘贴到微信、微博等社交媒体即可分享 ✨');
    } catch (e) {
      alert('分享失败，请手动复制');
    }
  };

  const handlePoster = async () => {
    if (posterLoading) return;
    setPosterLoading(true);
    try {
      // Preload every remote image as a base64 data URL FIRST.
      // The Poster then renders with inline data — no cross-origin fetch
      // happens during html-to-image, no race condition.
      const imageList = Array.isArray(checkin.images)
        ? checkin.images
        : [checkin.image_1, checkin.image_2, checkin.image_3].filter(Boolean);

      const [avatarData, ...imagesData] = await Promise.all([
        toDataUrl(checkin.avatar_url),
        ...imageList.map(toDataUrl)
      ]);

      const preparedCheckin = {
        ...checkin,
        avatar_url: avatarData,
        images: imagesData.filter(Boolean),
        image_1: imagesData[0] || '',
        image_2: imagesData[1] || '',
        image_3: imagesData[2] || ''
      };
      setPosterCheckin(preparedCheckin);
      setPosterMounted(true);

      // Wait for ref to actually contain the new poster after React commits
      const start = Date.now();
      while (Date.now() - start < 5000) {
        if (posterRef.current && posterRef.current.querySelectorAll('img').length > 0) break;
        await new Promise(r => requestAnimationFrame(r));
      }
      if (!posterRef.current) throw new Error('海报组件未就绪');

      // Wait for every <img> to fully decode. img.decode() is the most
      // reliable signal across browsers — Safari especially has quirks
      // where 'load' fires before pixels are decoded.
      const imgs = Array.from(posterRef.current.querySelectorAll('img'));
      await Promise.all(imgs.map(async img => {
        try {
          // First make sure the src is set and loaded
          if (!(img.complete && img.naturalWidth > 0)) {
            await new Promise(resolve => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
              setTimeout(resolve, 5000);
            });
          }
          // Then ensure pixels are decoded and ready to paint
          if (img.decode) await img.decode().catch(() => {});
        } catch (e) { /* don't block on a single bad image */ }
      }));

      // Extra paint cycles — iOS Safari sometimes needs more than two
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 150));

      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(posterRef.current, { pixelRatio: 2 });
      setPosterUrl(dataUrl);
    } catch (e) {
      alert('生成海报失败：' + e.message);
    } finally {
      setPosterLoading(false);
    }
  };

  const sharePoster = async () => {
    if (!posterUrl) return;
    try {
      const blob = await (await fetch(posterUrl)).blob();
      const file = new File([blob], `checkin-${checkin.id}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '我的打卡',
          text: '我在挑战 100 天打卡。来一起？'
        });
      } else {
        // Fallback: trigger download
        const a = document.createElement('a');
        a.href = posterUrl;
        a.download = `checkin-${checkin.id}.png`;
        a.click();
        alert('海报已下载，去 WhatsApp 上传到 Status / 分享');
      }
    } catch (e) {
      if (e.name !== 'AbortError') alert('分享失败：' + e.message);
    }
  };

  const downloadPoster = () => {
    if (!posterUrl) return;
    const a = document.createElement('a');
    a.href = posterUrl;
    a.download = `checkin-${checkin.id}.png`;
    a.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {checkin.avatar_url && <img src={checkin.avatar_url} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded-full" />}
          <div>
            <p className="font-semibold">{displayName || checkin.name || '打卡达人'}</p>
            <p className="text-xs text-gray-500">{date} {time}</p>
          </div>
        </div>
      </div>
      <p className="text-gray-700 mb-3 whitespace-pre-wrap">{checkin.content}</p>

      {/* 媒体内容展示：新 images[] / 老 image_1-3 / 更老 media_url 全兼容 */}
      {(() => {
        let images = Array.isArray(checkin.images) ? checkin.images.filter(Boolean) : [];
        if (images.length === 0) {
          if (checkin.image_1) images.push(checkin.image_1);
          if (checkin.image_2) images.push(checkin.image_2);
          if (checkin.image_3) images.push(checkin.image_3);
        }
        let audio = checkin.audio_url || '';
        let video = checkin.video_url || '';

        if (images.length === 0 && !audio && !video && checkin.media_url) {
          if (checkin.media_type === 'multi' || checkin.media_url.startsWith('{')) {
            try {
              const m = JSON.parse(checkin.media_url);
              images = m.images || [];
              audio = m.audio || '';
              video = m.video || '';
            } catch (e) {}
          } else {
            if (checkin.media_type === 'image') images = [checkin.media_url];
            else if (checkin.media_type === 'audio') audio = checkin.media_url;
            else if (checkin.media_type === 'video') video = checkin.media_url;
          }
        }

        if (images.length === 0 && !audio && !video) return null;

        const gridCols = images.length === 1 ? 'grid-cols-1'
                       : images.length === 2 ? 'grid-cols-2'
                       : images.length <= 4  ? 'grid-cols-2'
                       :                       'grid-cols-3';

        return (
          <div className="mb-3 space-y-2">
            {images.length > 0 && (
              <div className={`grid gap-1 ${gridCols}`}>
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={`w-full object-cover rounded-lg cursor-pointer hover:opacity-90 ${
                      images.length === 1 ? 'max-h-96' : 'aspect-square'
                    }`}
                    onClick={() => window.open(img, '_blank')}
                  />
                ))}
              </div>
            )}
            {/* 视频 */}
            {video && (
              <video src={video} controls className="rounded-lg w-full max-h-96 bg-black" />
            )}
            {/* 录音 */}
            {audio && (
              <audio src={audio} controls className="w-full" />
            )}
          </div>
        );
      })()}

      <div className="flex items-center justify-between border-t pt-3 mt-3 gap-1">
        <button
          onClick={handleLike}
          disabled={submitting}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition ${
            checkin.is_liked ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Heart size={16} fill={checkin.is_liked ? 'currentColor' : 'none'} strokeWidth={2} />
          <span className="font-medium">{checkin.like_count || 0}</span>
        </button>

        {allowComment && (
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
          >
            <MessageCircle size={16} strokeWidth={2} />
            <span className="font-medium">{isOwn ? '补充' : '鼓励'} {checkin.comment_count || 0}</span>
          </button>
        )}

        {/* Share + Poster only for the owner — you don't share other people's checkins */}
        {isOwn && (
          <>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
            >
              <Share2 size={16} strokeWidth={2} />
              <span className="font-medium">分享</span>
            </button>

            <button
              onClick={handlePoster}
              disabled={posterLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-pink-50 text-pink-600 hover:bg-pink-100 transition disabled:opacity-60"
            >
              <ImageIcon size={16} strokeWidth={2} />
              <span className="font-medium">{posterLoading ? '…' : '海报'}</span>
            </button>
          </>
        )}
      </div>

      {/* Off-screen poster — uses preloaded data-URL images to avoid CORS race */}
      {isOwn && posterMounted && posterCheckin && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }} aria-hidden="true">
          <Suspense fallback={null}>
            <Poster ref={posterRef} checkin={posterCheckin} />
          </Suspense>
        </div>
      )}

      {/* Loading overlay: shown the moment user taps 海报, until the PNG is ready */}
      {posterLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="text-white/90 text-sm mt-4 font-medium">生成海报中…</p>
          <p className="text-white/60 text-xs mt-1">正在加载图片</p>
        </div>
      )}

      {posterUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setPosterUrl(null)}
        >
          <img src={posterUrl} alt="poster" className="max-h-[70vh] w-auto rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
          <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
            <button
              onClick={sharePoster}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-full font-medium inline-flex items-center gap-2 shadow-lg"
            >
              <Send size={16} /> 分享 / 发到 Status
            </button>
            <button
              onClick={downloadPoster}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-full font-medium inline-flex items-center gap-2"
            >
              <Download size={16} /> 保存
            </button>
          </div>
          <p className="text-white/70 mt-3 text-xs">长按图片也可保存</p>
          <button onClick={() => setPosterUrl(null)} className="mt-2 text-white/50 text-xs">关闭</button>
        </div>
      )}


      {showComments && (
        <div className="mt-3 pt-3 border-t bg-gray-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
          {loadingComments ? (
            <div className="text-center py-3">
              <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {comments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">{isOwn ? '还没有补充' : '还没有鼓励，来留一句'}</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="bg-white rounded-lg p-3 mb-2 border-l-4 border-indigo-400">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">
                          {c.name} · {formatDateTime(c.created_at).time}
                        </p>
                        <p className="text-sm text-gray-700">{c.content}</p>
                      </div>
                      {c.user_id == currentUserId && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-xs text-red-500 hover:text-red-700 ml-2"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}

              {token && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder={isOwn ? '添加补充说明...' : '留一句鼓励...'}
                    maxLength="100"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={submitting || !newComment.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    发送
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
