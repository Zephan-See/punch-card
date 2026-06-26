import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-500 inline-flex items-center gap-1"><ChevronLeft size={18} /> 返回</button>
          <h1 className="text-xl font-bold inline-flex items-center gap-2"><FileText size={20} /> 服务条款</h1>
          <div></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pt-6 pb-20">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-5 text-gray-700 text-sm leading-relaxed">
          <p className="text-xs text-gray-500">最后更新：2026 年 1 月</p>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">一、欢迎</h2>
            <p>注册即表示你同意遵守以下条款。这是一个 100 天集体打卡活动平台，鼓励持续学习与正向交流。</p>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">二、你的承诺</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>不发布违法、暴力、色情、歧视、仇恨、骚扰内容</li>
              <li>不冒充他人身份注册</li>
              <li>不滥用举报功能（恶意举报可能被冻结）</li>
              <li>不上传不属于你或未获授权的他人作品</li>
              <li>不通过任何方式攻击 / 干扰平台正常运行</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">三、内容版权</h2>
            <p>你保留打卡内容的版权，但授权我们在平台内展示、给其他用户查看，以及在你授权下用于活动宣传（仅整体氛围展示，不会单独使用未经同意的内容）。</p>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">四、管理员权限</h2>
            <p>为保持社群健康，管理员有权对违规内容采取以下任一措施：</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><b>隐藏</b>：内容暂时不公开，仅本人和管理员可见</li>
              <li><b>删除</b>：永久销毁内容</li>
              <li><b>冻结</b>：限制账号继续发布，但保留浏览权限</li>
            </ul>
            <p className="mt-2 text-gray-500">所有管理员操作均有日志记录，可申诉。</p>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">五、免责</h2>
            <p>本平台为公益性集体打卡工具，按"现状"提供服务。我们尽力维护稳定性，但不对因服务中断、数据延迟等造成的间接损失负责。请勿将本平台作为唯一的数据备份。</p>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">六、终止</h2>
            <p>你可随时申请注销账号。严重违反本条款的，我们有权立即终止服务。</p>
          </section>

          <section>
            <h2 className="font-bold text-base text-gray-900 mb-2">七、修订</h2>
            <p>条款可能因法律或功能变化而更新。重大变更会在首页公告。继续使用即视为接受新条款。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
