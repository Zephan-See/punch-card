import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Target, Plus, Pencil, Archive, Trash2, X } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { api } from '../api';

function GoalModal({ initial, onSave, onClose }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [targetDays, setTargetDays] = useState(initial?.target_days || 100);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ title, description, target_days: Number(targetDays) || 100 });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{initial ? '编辑目标' : '新建目标'}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 p-1"><X size={18} /></button>
        </div>

        <div>
          <label className="text-xs text-gray-500">标题</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={40}
            placeholder="比如：100 天读完《论语》"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-sm"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">描述（可选）</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="为什么要做这个目标？怎么衡量完成？"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-sm resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">目标天数</label>
          <input
            type="number"
            min={1}
            max={365}
            value={targetDays}
            onChange={e => setTargetDays(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-sm"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">取消</button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}

function GoalCard({ goal, totalDays, onEdit, onArchive, onDelete }) {
  const progress = Math.min(100, Math.round((totalDays / goal.target_days) * 100));
  const done = totalDays >= goal.target_days;

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 mb-3 border ${done ? 'border-green-300 bg-green-50/30' : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
          <Target size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900">{goal.title}</p>
          {goal.description && <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${done ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 font-medium tabular-nums">
              {totalDays}/{goal.target_days}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <button onClick={() => onEdit(goal)} className="text-xs text-gray-500 hover:text-indigo-600 inline-flex items-center gap-1">
          <Pencil size={12} /> 编辑
        </button>
        {goal.active && !done && (
          <button onClick={() => onArchive(goal)} className="text-xs text-gray-500 hover:text-orange-600 inline-flex items-center gap-1">
            <Archive size={12} /> 归档
          </button>
        )}
        <button onClick={() => onDelete(goal)} className="text-xs text-gray-500 hover:text-red-600 inline-flex items-center gap-1">
          <Trash2 size={12} /> 删除
        </button>
      </div>
    </div>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // 'new' | goal object | null
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const [g, d] = await Promise.all([api.getGoals(), api.getMyTotalDays()]);
    setGoals(g);
    setTotalDays(d);
    setLoading(false);
  };

  useEffect(() => { if (user?.token) load(); }, [user]);

  const handleSave = async (patch) => {
    if (editing === 'new') {
      const res = await api.createGoal(patch);
      if (res.error) { alert(res.error); return; }
    } else {
      const res = await api.updateGoal(editing.id, patch);
      if (res.error) { alert(res.error); return; }
    }
    setEditing(null);
    load();
  };

  const handleArchive = async (g) => {
    await api.updateGoal(g.id, { active: false });
    load();
  };

  const handleDelete = async (g) => {
    if (!confirm(`删除目标"${g.title}"？`)) return;
    await api.deleteGoal(g.id);
    load();
  };

  const active = goals.filter(g => g.active);
  const archived = goals.filter(g => !g.active);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-500 inline-flex items-center gap-1"><ChevronLeft size={18} /> 返回</button>
          <h1 className="text-xl font-bold inline-flex items-center gap-2"><Target size={20} /> 我的目标</h1>
          <div></div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pt-6">
        <button
          onClick={() => setEditing('new')}
          className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-indigo-700 mb-4 inline-flex items-center justify-center gap-2"
        >
          <Plus size={18} /> 新建目标
        </button>

        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">加载中…</div>
        ) : (
          <>
            {active.length === 0 && archived.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-500 text-sm">
                还没有目标。设一个开始 100 天挑战。
              </div>
            )}

            {active.length > 0 && (
              <>
                <p className="text-xs text-gray-500 mb-2 px-1">进行中</p>
                {active.map(g => (
                  <GoalCard key={g.id} goal={g} totalDays={totalDays}
                    onEdit={setEditing} onArchive={handleArchive} onDelete={handleDelete} />
                ))}
              </>
            )}

            {archived.length > 0 && (
              <>
                <p className="text-xs text-gray-500 mb-2 mt-4 px-1">已归档</p>
                {archived.map(g => (
                  <GoalCard key={g.id} goal={g} totalDays={totalDays}
                    onEdit={setEditing} onArchive={handleArchive} onDelete={handleDelete} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {editing && (
        <GoalModal
          initial={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
