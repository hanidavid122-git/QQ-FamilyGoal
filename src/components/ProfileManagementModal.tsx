import React from 'react';
import { motion } from 'motion/react';
import { Users, X } from 'lucide-react';
import { Profile } from '../types';

export function ProfileManagementModal({ profiles, onClose, onUpdatePin }: { profiles: Profile[], onClose: () => void, onUpdatePin: (role: string, pin: string) => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> 成员管理
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-stone-500 mb-4">管理员可以为每位家庭成员配置登录 PIN 码。</p>
          {profiles.map(profile => (
            <div key={profile.role} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">
                  {profile.role === '爸爸' ? '👨🏻' : profile.role === '妈妈' ? '👩🏻' : profile.role === '姐姐' ? '👧🏻' : '👶🏻'}
                </div>
                <span className="font-bold text-stone-800">{profile.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  defaultValue={profile.pin}
                  maxLength={4}
                  onBlur={(e) => {
                    if (e.target.value.length === 4 && e.target.value !== profile.pin) {
                      onUpdatePin(profile.role, e.target.value);
                    }
                  }}
                  className="w-20 text-center font-mono font-bold py-2 rounded-lg border border-stone-200 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl font-bold transition-colors">
            完成
          </button>
        </div>
      </motion.div>
    </div>
  );
}
