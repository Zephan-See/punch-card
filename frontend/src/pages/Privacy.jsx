import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-500 inline-flex items-center gap-1"><ChevronLeft size={18} /> 返回</button>
          <h1 className="text-xl font-bold inline-flex items-center gap-2"><Shield size={20} /> 隐私政策</h1>
          <div></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pt-6 pb-20">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-5 text-gray-700 text-sm leading-relaxed">
          <p className="text-xs text-gray-500">最后更新：2026 年 1 月</p>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">一、我们收集什么</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>账号信息</b>：邮箱、密码（加密存储）、用户名、个性签名、头像</li>
              <li><b>打卡内容</b>：你主动上传的文字、图片、语音、视频</li>
              <li><b>社交互动</b>：你的点赞、评论、举报记录</li>
              <li><b>基础日志</b>：登录时间、操作时间（用于排查问题）</li>
            </ul>
            <p className="mt-2 text-gray-500">我们 <b>不收集</b>：地理位置、通讯录、设备 ID、浏览历史。</p>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">二、谁能看到你的内容</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>打卡内容：默认其他登录用户可在动态流 / 打卡墙看到</li>
              <li>你可在「设置 → 隐私设置」中关闭打卡墙公开</li>
              <li>管理员可查看所有打卡，仅用于内容审核</li>
              <li>我们 <b>不会</b> 把任何用户数据出售或分享给第三方广告商</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">三、数据存储</h2>
            <p>数据托管于 Supabase（基础设施在新加坡 / 美国），通过 Row-Level Security 保证用户隔离。媒体文件存储于 Supabase Storage，HTTPS 传输。密码由 Supabase Auth 使用 bcrypt 加密，我们无法看到明文。</p>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">四、你的权利</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>查看 / 导出</b>：在「设置」页面可一键导出你所有打卡内容</li>
              <li><b>修改</b>：用户名、签名、头像随时可改</li>
              <li><b>删除</b>：联系管理员可申请删除账号及所有内容</li>
              <li><b>申诉</b>：被冻结 / 隐藏内容如有异议可通过 WhatsApp 群联系</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">五、Cookie / 本地存储</h2>
            <p>我们仅使用必要的浏览器存储（保持登录状态、通知设置偏好）。不使用任何追踪型 Cookie 或第三方分析脚本。</p>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">六、联系我们</h2>
            <p>如有任何隐私问题，请通过活动 WhatsApp 群联系管理员。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
