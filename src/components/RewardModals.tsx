import React from 'react';
import { motion } from 'motion/react';
import { 
  Gift, X, Eye, EyeOff, Edit2, Trash2, Plus
} from 'lucide-react';
import { Reward } from '../types';
import { ROLES } from '../constants';

export function RewardManagementModal({ rewards, onClose, onToggleActive, onDelete, onEdit, onAdd }: { rewards: Reward[], onClose: () => void, onToggleActive: (id: string) => void, onDelete: (id: string) => void, onEdit: (r: Reward) => void, onAdd: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            管理奖励
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          {rewards.map(reward => (
            <div key={reward.id} className={`flex items-center justify-between p-4 rounded-xl border ${reward.isActive ? 'bg-stone-50 border-stone-200' : 'bg-stone-100 border-stone-200 opacity-60'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-stone-900">{reward.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${reward.isCustom ? 'bg-purple-100 text-purple-700' : 'bg-stone-200 text-stone-700'}`}>
                    {reward.isCustom ? '自定义' : '默认'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${reward.targetType === 'family' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'}`}>
                    {reward.targetType === 'family' ? '家庭' : '个人'}
                  </span>
                  {reward.role && (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">
                      限定: {reward.role}
                    </span>
                  )}
                  {!reward.isActive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">已停用</span>}
                </div>
                <p className="text-sm text-stone-500 mt-1">消耗: {reward.cost} 积分</p>
                {reward.description && <p className="text-xs text-stone-400 mt-1">{reward.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onToggleActive(reward.id)} className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer" title={reward.isActive ? '停用' : '启用'}>
                  {reward.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {reward.isCustom && (
                  <>
                    <button onClick={() => onEdit(reward)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(reward.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <button onClick={onAdd} className="w-full py-3 border-2 border-dashed border-stone-300 text-stone-500 rounded-xl hover:border-orange-500 hover:text-orange-500 transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer">
          <Plus className="w-5 h-5" /> 添加自定义奖励
        </button>
      </motion.div>
    </div>
  );
}

export function RewardEditModal({ reward, onClose, onSave }: { reward: Reward | null, onClose: () => void, onSave: (r: Omit<Reward, 'id' | 'isActive' | 'isCustom'>) => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold text-stone-900 mb-4">
          {reward ? '编辑奖励' : '添加自定义奖励'}
        </h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          onSave({
            name: formData.get('name') as string,
            cost: parseInt(formData.get('cost') as string, 10),
            description: formData.get('description') as string,
            targetType: formData.get('targetType') as 'personal' | 'family',
            role: formData.get('role') as string || undefined,
          });
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">奖励名称</label>
              <input name="name" defaultValue={reward?.name} required className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" placeholder="例如：全家看电影" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">奖励类型</label>
              <select name="targetType" defaultValue={reward?.targetType || 'personal'} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none">
                <option value="personal">个人奖励 (里程碑)</option>
                <option value="family">家庭奖励 (里程碑)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">适用角色 (仅个人奖励有效)</label>
              <select name="role" defaultValue={reward?.role || ''} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none">
                <option value="">所有人</option>
                {ROLES.filter(r => r !== '管理员').map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">里程碑积分</label>
              <input name="cost" type="number" min="1" defaultValue={reward?.cost || 50} required className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">描述 (可选)</label>
              <textarea name="description" defaultValue={reward?.description} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" rows={2} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer">取消</button>
            <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium cursor-pointer">保存</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
