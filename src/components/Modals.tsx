import React from 'react';
import { motion } from 'motion/react';
import { 
  AlertCircle, History, X, Settings, Image as ImageIcon,
  Database, TrendingUp, Download, Upload
} from 'lucide-react';
import { Transaction } from '../types';
import { AVATARS } from '../constants';

export function DeleteConfirmModal({ onClose, onConfirm }: { onClose: () => void, onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 text-center"
      >
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-stone-900 mb-2">删除目标？</h3>
        <p className="text-stone-500 mb-6">此操作无法撤销。您确定要删除这个家庭目标吗？</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer">
            取消
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm cursor-pointer">
            删除
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function HistoryModal({ member, txs, onClose }: { member: string, txs: Transaction[], onClose: () => void }) {
  const memberTxs = txs.filter(t => t.member === member).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            {member} 的积分记录
          </h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-3">
          {memberTxs.length === 0 ? (
            <p className="text-center text-stone-400 py-8">暂无记录</p>
          ) : (
            memberTxs.map(t => (
              <div key={t.id} className="flex justify-between items-center p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div>
                  <p className="text-sm font-bold text-stone-800">{t.reason}</p>
                  <p className="text-xs text-stone-500">{new Date(t.date).toLocaleString()}</p>
                </div>
                <div className={`font-bold ${t.type === 'earned' ? 'text-emerald-500' : 'text-pink-500'}`}>
                  {t.type === 'earned' ? '+' : '-'}{t.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function UserSettingsModal({ role, currentAvatar, onClose, onUpdateAvatar }: { role: string, currentAvatar?: string, onClose: () => void, onUpdateAvatar: (url: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-[2rem] shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            个人设置 - {role}
          </h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-stone-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-4xl">
              {currentAvatar && (currentAvatar.startsWith('http') || currentAvatar?.startsWith('data:image')) ? (
                <img src={currentAvatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                currentAvatar || (role === '爸爸' ? '👨🏻' : role === '妈妈' ? '👩🏻' : role === '姐姐' ? '👧🏻' : '👶🏻')
              )}
            </div>
            <p className="text-sm text-stone-500 font-medium">选择一个您喜欢的头像</p>
          </div>

          <div className="grid grid-cols-5 gap-3 max-h-60 overflow-y-auto p-2 no-scrollbar">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const result = e.target?.result as string;
                      onUpdateAvatar(result);
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="text-3xl p-2 rounded-xl transition-all hover:scale-110 hover:bg-stone-50 flex items-center justify-center text-stone-400"
            >
              <ImageIcon className="w-8 h-8" />
            </button>
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => onUpdateAvatar(a)}
                className={`text-3xl p-2 rounded-xl transition-all hover:scale-110 ${currentAvatar === a ? 'bg-indigo-50 ring-2 ring-indigo-500 ring-offset-2' : 'hover:bg-stone-50'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function DataManagementModal({ onClose, onExport, onImport, onRecover, onForceSync }: { onClose: () => void, onExport: () => void, onImport: (e: React.ChangeEvent<HTMLInputElement>) => void, onRecover: () => void, onForceSync: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-orange-500" />
          数据管理
        </h2>
        <p className="text-sm text-stone-500 mb-6">
          升级前请导出数据以防丢失。导入数据将覆盖当前所有记录。
        </p>
        
        <div className="space-y-4">
          <button onClick={onForceSync} className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 py-3 rounded-xl font-medium transition-colors cursor-pointer border border-amber-200">
            <TrendingUp className="w-5 h-5" />
            强制同步 (解决数据丢失)
          </button>

          <button onClick={onRecover} className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl font-medium transition-colors cursor-pointer border border-blue-200">
            <History className="w-5 h-5" />
            从本地缓存恢复
          </button>

          <button onClick={onExport} className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 py-3 rounded-xl font-medium transition-colors cursor-pointer">
            <Download className="w-5 h-5" />
            导出数据 (备份)
          </button>
          
          <label className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-medium transition-colors cursor-pointer">
            <Upload className="w-5 h-5" />
            导入数据 (恢复)
            <input type="file" accept=".json" className="hidden" onChange={onImport} />
          </label>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer">关闭</button>
        </div>
      </motion.div>
    </div>
  );
}
