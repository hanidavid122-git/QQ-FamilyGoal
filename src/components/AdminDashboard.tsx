import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, MessageSquare, Target, Trophy, Activity, 
  Trash2, Search, Filter, ChevronRight, AlertCircle,
  CheckCircle2, X, Settings, BarChart3, FlaskConical,
  Plus, Edit2, Users
} from 'lucide-react';
import { Goal, Message, Reward, Profile, Transaction } from '../types';
import { SystemHealth } from './SystemHealth';
import { ROLES } from '../constants';

interface AdminDashboardProps {
  goals: Goal[];
  messages: Message[];
  rewards: Reward[];
  profiles: Profile[];
  transactions: Transaction[];
  isSupabaseConfigured: boolean;
  onDeleteGoal: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  onDeleteReward: (id: string) => void;
  onEditReward: (reward: Reward) => void;
  onAddReward: () => void;
  onClose: () => void;
}

type AdminTab = 'barrage' | 'tasks' | 'milestones' | 'health';

export function AdminDashboard({ 
  goals, messages, rewards, profiles, transactions, isSupabaseConfigured,
  onDeleteGoal, onDeleteMessage, onDeleteReward, onEditReward, onAddReward, onClose 
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('tasks');
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'tasks', label: '任务与留言', icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'barrage', label: '弹幕管理', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'milestones', label: '里程碑管理', icon: Trophy, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'health', label: '全量测试集', icon: FlaskConical, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-stone-50 w-full max-w-6xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20"
      >
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-800 tracking-tight">管理员控制台</h2>
              <p className="text-xs text-stone-400 font-medium">Family Points System Admin Panel</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-stone-100 p-6 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                    isActive 
                      ? `${tab.bg} ${tab.color} shadow-sm` 
                      : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                  <span className="text-sm font-bold">{tab.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-stone-50/50">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'tasks' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-stone-800">任务与留言板管理</h3>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input 
                          type="text" 
                          placeholder="搜索任务或留言..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm">
                        <h4 className="text-sm font-bold text-stone-500 mb-4 flex items-center gap-2">
                          <Target className="w-4 h-4" /> 活跃任务 ({goals.length})
                        </h4>
                        <div className="space-y-3">
                          {goals.filter(g => g.name.includes(searchTerm)).map(goal => (
                            <div key={goal.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 group">
                              <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${goal.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                <div>
                                  <div className="text-sm font-bold text-stone-800">{goal.name}</div>
                                  <div className="text-[10px] text-stone-400">创建者: {goal.creator} • 进度: {goal.progress}%</div>
                                </div>
                              </div>
                              <button 
                                onClick={() => onDeleteGoal(goal.id)}
                                className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'barrage' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-stone-800">弹幕管理</h3>
                      <p className="text-xs text-stone-400">管理实时滚动的家庭弹幕</p>
                    </div>
                    <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {messages.map(msg => (
                          <div key={msg.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg shadow-sm">
                                {msg.user === '爸爸' ? '👨' : msg.user === '妈妈' ? '👩' : msg.user === '哥哥' ? '👦' : '👧'}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-stone-800">{msg.user}</div>
                                <div className="text-[11px] text-stone-500 line-clamp-1">{msg.content}</div>
                              </div>
                            </div>
                            <button 
                              onClick={() => onDeleteMessage(msg.id)}
                              className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'milestones' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-stone-800">里程碑管理</h3>
                        <p className="text-xs text-stone-400">为不同家庭成员设置专属的积分奖励</p>
                      </div>
                      <button 
                        onClick={onAddReward}
                        className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> 添加新里程碑
                      </button>
                    </div>

                    {/* Family Rewards Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-indigo-500 flex items-center gap-2 px-2">
                        <Users className="w-4 h-4" /> 全家共享里程碑
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {rewards.filter(r => r.targetType === 'family').map(reward => (
                          <div key={reward.id} className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full opacity-5 bg-indigo-500" />
                            <div className="relative z-10 flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-xl">
                                  🎁
                                </div>
                                <div>
                                  <h5 className="font-bold text-stone-800 text-sm">{reward.name}</h5>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                      {reward.cost} 积分
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => onEditReward(reward)} className="p-2 text-stone-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => onDeleteReward(reward.id)} className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Personal Rewards Grouped by Role */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-orange-500 flex items-center gap-2 px-2">
                        <Trophy className="w-4 h-4" /> 个人专属里程碑
                      </h4>
                      
                      {ROLES.filter(role => role !== '管理员').map(role => {
                        const roleRewards = rewards.filter(r => r.targetType === 'personal' && r.role === role);
                        const generalRewards = role === '爸爸' ? rewards.filter(r => r.targetType === 'personal' && !r.role) : [];
                        const allRoleRewards = [...roleRewards, ...generalRewards];
                        
                        return (
                          <div key={role} className="bg-stone-100/50 rounded-[2rem] p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm shadow-sm">
                                  {role === '爸爸' ? '👨' : role === '妈妈' ? '👩' : role === '姐姐' ? '👦' : '👧'}
                                </div>
                                <span className="font-bold text-stone-700">{role} 的奖励</span>
                              </div>
                              <span className="text-[10px] font-bold text-stone-400">{allRoleRewards.length} 个项目</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {allRoleRewards.map(reward => (
                                <div key={reward.id} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm flex items-center justify-between group">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center text-lg">
                                      🎁
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-stone-800">{reward.name}</div>
                                      <div className="text-[10px] font-bold text-orange-500">{reward.cost} 积分</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEditReward(reward)} className="p-1.5 text-stone-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-md transition-all">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => onDeleteReward(reward.id)} className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {allRoleRewards.length === 0 && (
                                <div className="col-span-2 py-4 text-center text-xs text-stone-400 italic">
                                  暂无专属奖励
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'health' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-stone-800">全量测试集与健康诊断</h3>
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> 系统状态: 正常
                      </div>
                    </div>
                    <SystemHealth 
                      goals={goals} 
                      transactions={transactions} 
                      profiles={profiles} 
                      isSupabaseConfigured={isSupabaseConfigured} 
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
