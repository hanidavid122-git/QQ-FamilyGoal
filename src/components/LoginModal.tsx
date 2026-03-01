import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, X, Eye, EyeOff } from 'lucide-react';
import { ALL_ROLES } from '../constants';
import { Profile } from '../types';
import { UserAvatar } from './UserAvatar';

interface LoginModalProps {
  isOpen: boolean;
  initialRole?: string | null;
  profiles: Profile[];
  onLogin: (role: string, pin: string) => Promise<boolean>;
  onClose: () => void;
}

export function LoginModal({ isOpen, initialRole, profiles, onLogin, onClose }: LoginModalProps) {
  console.log('LoginModal rendered - isOpen:', isOpen, 'initialRole:', initialRole);
  const [selectedRole, setSelectedRole] = useState<string | null>(initialRole || null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPin, setShowPin] = useState(false);

  // Reset state when modal opens or initialRole changes
  React.useEffect(() => {
    console.log('LoginModal useEffect - isOpen:', isOpen, 'initialRole:', initialRole);
    if (isOpen) {
      setSelectedRole(initialRole || null);
      setPin('');
      setError('');
      setShowPin(false);
    }
  }, [isOpen, initialRole]);

  if (!isOpen) return null;

  const handlePinChange = async (newPin: string) => {
    setPin(newPin);
    setError('');
    
    // For normal roles, auto-submit on 4 digits
    if (selectedRole !== '管理员' && newPin.length === 4) {
      setLoading(true);
      try {
        const success = await onLogin(selectedRole, newPin);
        if (success) {
          onClose();
          setPin('');
          setSelectedRole(null);
        } else {
          setError('PIN码错误，请重试');
          setPin('');
        }
      } catch (err) {
        setError('登录失败，请重试');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !pin) return;
    
    // For Admin, we need manual submit because password length varies
    if (selectedRole === '管理员' || pin.length === 4) {
      setLoading(true);
      try {
        const success = await onLogin(selectedRole, pin);
        if (success) {
          onClose();
          setPin('');
          setSelectedRole(null);
        } else {
          setError(selectedRole === '管理员' ? '密码错误' : 'PIN码错误');
        }
      } catch (err) {
        setError('登录失败，请重试');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900">欢迎回家</h2>
            <p className="text-stone-500 mt-2">请选择您的角色并输入{selectedRole === '管理员' ? '密码' : 'PIN码'}</p>
          </div>

          {!selectedRole ? (
            <div className="grid grid-cols-2 gap-4">
              {ALL_ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-stone-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                >
                  <UserAvatar role={role} profiles={profiles} className="w-12 h-12 text-2xl mb-2 group-hover:bg-white" />
                  <span className="font-bold text-stone-700 group-hover:text-indigo-700">{role}</span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between bg-stone-50 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <UserAvatar role={selectedRole} profiles={profiles} className="w-10 h-10 text-xl shadow-sm" />
                  <span className="font-bold text-stone-900">{selectedRole}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => { setSelectedRole(null); setPin(''); setError(''); }}
                  className="text-sm text-stone-500 hover:text-stone-800 underline"
                >
                  切换角色
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-stone-700">输入{selectedRole === '管理员' ? '密码' : 'PIN码'}</label>
                  <button 
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPin ? '隐藏' : '显示'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    maxLength={selectedRole === '管理员' ? 20 : 4}
                    className={`w-full text-center ${selectedRole === '管理员' ? 'text-xl tracking-normal' : 'text-3xl tracking-[1em]'} font-bold py-4 rounded-xl border-2 border-stone-200 focus:border-indigo-500 focus:ring-0 outline-none transition-all`}
                    placeholder={selectedRole === '管理员' ? "请输入密码" : "••••"}
                    autoFocus
                  />
                </div>
                {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={pin.length < 4 || loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? '验证中...' : '登 录'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
