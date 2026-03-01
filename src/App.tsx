import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Plus, Edit2, Trash2, CheckCircle, Clock, Users, 
  Target, TrendingUp, Calendar, AlertCircle, X,
  Heart, FileText, Flag, Star, Gift, Trophy, 
  History, Medal, Crown, Film, Gamepad, Utensils, 
  Car, Info, Settings, Download, Upload, Database, Eye, EyeOff, CheckCircle2, Circle
} from 'lucide-react';

type Priority = '高' | '中' | '低';

type Goal = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  creator: string;
  assignees: string[];
  assignee?: string;
  signature: string;
  priority: Priority;
  completedAt?: string;
  confirmations?: Record<string, boolean>;
};

type Transaction = {
  id: string;
  date: string;
  member: string;
  amount: number;
  reason: string;
  type: 'earned' | 'redeemed';
};

type Achievement = {
  id: string;
  member: string;
  achId: string;
  date: string;
};

type Reward = {
  id: string;
  name: string;
  cost: number;
  description?: string;
  isActive: boolean;
  isCustom: boolean;
  iconName?: string;
};

type FilterType = '全部' | '规划中' | '进行中' | '待确认' | '已完成';

const STORAGE_KEY = 'family_goals_data';
const TX_KEY = 'family_goals_txs';
const ACH_KEY = 'family_goals_achs';
const CHECKIN_KEY = 'family_goals_checkins';
const REWARDS_KEY = 'family_goals_rewards';
const CURRENT_USER_KEY = 'family_goals_current_user';

const ROLES = ['爸爸', '妈妈', '姐姐', '妹妹'];
const ALL_ROLES = [...ROLES, '管理员'];
const PRIORITIES: Priority[] = ['高', '中', '低'];

const DEFAULT_REWARDS: Reward[] = [
  { id: 'r1', name: '选择家庭电影', cost: 100, isActive: true, isCustom: false, iconName: 'Film' },
  { id: 'r2', name: '免做家务一天', cost: 200, isActive: true, isCustom: false, iconName: 'Target' },
  { id: 'r3', name: '自选家庭出游', cost: 300, isActive: true, isCustom: false, iconName: 'Car' },
  { id: 'r4', name: '最爱晚餐点菜权', cost: 150, isActive: true, isCustom: false, iconName: 'Utensils' },
  { id: 'r5', name: '额外游戏时间', cost: 50, isActive: true, isCustom: false, iconName: 'Gamepad' }
];

const ICONS: Record<string, React.ElementType> = {
  Film, Target, Car, Utensils, Gamepad, Gift
};

const ACHIEVEMENTS = [
  { id: 'a1', name: '首个目标', desc: '完成第一个目标', bonus: 5, icon: Flag, color: 'text-blue-500' },
  { id: 'a2', name: '青铜达人', desc: '累计获得50分', badge: 'Beginner', icon: Medal, color: 'text-amber-700' },
  { id: 'a3', name: '白银达人', desc: '累计获得100分', badge: 'Contributor', icon: Medal, color: 'text-slate-400' },
  { id: 'a4', name: '黄金达人', desc: '累计获得200分', badge: 'Achiever', icon: Medal, color: 'text-yellow-500' },
  { id: 'a5', name: '高优大师', desc: '完成3个高优目标', bonus: 10, icon: Crown, color: 'text-purple-500' }
];

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
}

function getLocalDateString(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

// Helper to calculate warning status
function getWarningStatus(goal: Goal): 'red' | 'yellow' | 'green' {
  if (goal.progress >= 100) return 'green';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(goal.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(goal.endDate);
  end.setHours(0, 0, 0, 0);
  
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  const timeElapsedPercent = Math.min(100, (elapsedDays / totalDays) * 100);
  
  if (timeElapsedPercent > 100) return 'red'; // Overdue
  
  const priorityPenalty = goal.priority === '高' ? 10 : goal.priority === '中' ? 0 : -10;
  
  if (timeElapsedPercent > goal.progress + 20 - priorityPenalty) return 'red';
  if (timeElapsedPercent > goal.progress - priorityPenalty) return 'yellow';
  
  return 'green';
}

function getGoalScore(goal: Goal): number {
  let score = 0;
  if (goal.progress < 100) score += 1000;
  
  if (goal.priority === '高') score += 300;
  else if (goal.priority === '中') score += 200;
  else score += 100;

  const status = getWarningStatus(goal);
  if (status === 'red') score += 30;
  else if (status === 'yellow') score += 20;
  else score += 10;

  return score;
}

function LineChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 10);
  const points = data.map((v, i) => `${(i/3)*100},${40 - (v/max)*40}`).join(' ');
  const color = data[3] >= data[0] ? '#10b981' : '#ef4444';
  return (
    <svg width="100%" height="40" viewBox="-5 -5 110 50" className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      {data.map((v, i) => {
        const x = (i/3)*100, y = 40 - (v/max)*40;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="1.5" />
            <text x={x} y={y - 6} fontSize="8" fill="#78716c" textAnchor="middle">{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

type Message = {
  id: string;
  user: string;
  content: string;
  date: string;
  likes: number;
};

const MESSAGES_KEY = 'family_goals_messages';

function FamilyHero({ familyPts }: { familyPts: number }) {
  return (
    <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-[2rem] p-8 text-white shadow-xl mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
        <Trophy className="w-80 h-80" />
      </div>
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-white/10">
          <Crown className="w-4 h-4 text-yellow-300" />
          家庭总积分
        </div>
        <div className="text-7xl font-black tracking-tighter mb-4 drop-shadow-sm">
          {familyPts}
        </div>
        <div className="w-full max-w-md bg-black/20 h-3 rounded-full overflow-hidden backdrop-blur-sm mb-2">
          <div 
            className="h-full bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all duration-1000"
            style={{ width: `${(familyPts % 1000) / 10}%` }}
          />
        </div>
        <p className="text-sm text-white/80 font-medium">
          距离下一个家庭大奖还差 {1000 - (familyPts % 1000)} 分
        </p>
      </div>
    </div>
  );
}

function RaceChart({ memberStats }: { memberStats: any[] }) {
  const maxPoints = Math.max(...memberStats.map(s => s.earned), 100);
  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-100 mb-8 relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-500" />
          家庭成员大比拼
        </h2>
        <div className="text-xs font-medium text-stone-400 bg-stone-50 px-3 py-1 rounded-full">
          谁是第一名？
        </div>
      </div>
      
      <div className="relative h-64 w-full">
        {/* Mountain Background */}
        <div className="absolute inset-0 flex items-end opacity-20 pointer-events-none">
           <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="w-full h-full text-stone-300 fill-current">
             <path d="M0 200 L150 50 L250 120 L350 20 L400 200 Z" />
           </svg>
        </div>
        
        {/* Tracks */}
        <div className="absolute inset-0 flex justify-around items-end px-4 pb-8">
          {memberStats.map((member, index) => {
            const percent = Math.min(Math.max((member.earned / maxPoints) * 100, 10), 100);
            const isLeader = Math.max(...memberStats.map(m => m.earned)) === member.earned && member.earned > 0;
            
            return (
              <div key={member.role} className="relative h-full w-16 flex flex-col justify-end items-center group">
                {/* Bar/Line */}
                <motion.div 
                  initial={{ height: '0%' }}
                  animate={{ height: `${percent}%` }}
                  transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                  className="w-1 bg-stone-100 rounded-t-full absolute bottom-0"
                />
                
                {/* Avatar */}
                <motion.div
                  initial={{ bottom: '0%' }}
                  animate={{ bottom: `${percent}%` }}
                  transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                  className="absolute mb-2 flex flex-col items-center z-10"
                >
                  <div className={`relative w-12 h-12 rounded-full border-4 shadow-lg flex items-center justify-center text-2xl bg-white transition-transform group-hover:scale-110 ${isLeader ? 'border-yellow-400 scale-110' : 'border-white'}`}>
                    {member.role === '爸爸' ? '👨🏻' : member.role === '妈妈' ? '👩🏻' : member.role === '姐姐' ? '👧🏻' : '👶🏻'}
                    {isLeader && (
                      <div className="absolute -top-4 text-2xl animate-bounce">👑</div>
                    )}
                  </div>
                  <div className="mt-2 bg-stone-800 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md">
                    {member.earned}分
                  </div>
                </motion.div>
                
                {/* Label */}
                <div className="absolute -bottom-6 text-xs font-bold text-stone-500">
                  {member.role}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DanmakuBoard({ messages, onSend }: { messages: Message[], onSend: (content: string) => void }) {
  const [input, setInput] = useState('');
  
  return (
    <div className="mb-8">
      <div className="bg-stone-900 rounded-[2rem] p-1 shadow-lg overflow-hidden relative h-40 mb-4">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence>
            {messages.slice(-15).map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: '-150%', opacity: 1 }}
                transition={{ 
                  duration: 10 + (msg.content.length * 0.2), 
                  ease: "linear", 
                  repeat: Infinity,
                  delay: i * 0.5 
                }}
                className="absolute whitespace-nowrap flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white shadow-sm"
                style={{ 
                  top: `${(i % 5) * 18 + 10}%`,
                  fontSize: `${Math.random() > 0.8 ? '1.1rem' : '0.9rem'}`
                }}
              >
                <span className="font-bold text-yellow-400 text-xs">{msg.user}:</span>
                <span>{msg.content}</span>
                {msg.likes > 0 && <span className="text-xs text-pink-400 flex items-center">❤️ {msg.likes}</span>}
              </motion.div>
            ))}
          </AnimatePresence>
          {messages.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
              暂无弹幕，快来发送第一条！
            </div>
          )}
        </div>
      </div>
      
      <form 
        onSubmit={(e) => { 
          e.preventDefault(); 
          if(input.trim()) { 
            onSend(input); 
            setInput(''); 
          } 
        }}
        className="flex gap-2"
      >
        <div className="relative flex-grow">
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="发送弹幕留言..."
            className="w-full pl-5 pr-12 py-3 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={!input.trim()}
          className="px-6 py-3 bg-indigo-500 text-white rounded-2xl font-bold shadow-md hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Upload className="w-4 h-4 rotate-90" />
          发送
        </button>
      </form>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 font-sans text-stone-800">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Database className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">缺少数据库配置</h1>
          <p className="text-stone-600 mb-6 text-sm">
            为了实现多人实时同步，请在 AI Studio 右侧的 <strong>Secrets</strong> 面板中添加以下环境变量：
          </p>
          <div className="bg-stone-50 p-4 rounded-xl text-left font-mono text-sm text-stone-700 mb-6 space-y-3">
            <div>
              <span className="font-bold text-stone-900">VITE_SUPABASE_URL</span>
              <br />
              <span className="text-stone-500 text-xs">你的 Supabase Project URL</span>
            </div>
            <div>
              <span className="font-bold text-stone-900">VITE_SUPABASE_ANON_KEY</span>
              <br />
              <span className="text-stone-500 text-xs">你的 Supabase anon key</span>
            </div>
          </div>
          <p className="text-sm text-stone-500">
            配置完成后，请刷新页面。
          </p>
        </motion.div>
      </div>
    );
  }

  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem(CURRENT_USER_KEY);
  });
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [achs, setAchs] = useState<Achievement[]>([]);
  const [rewards, setRewards] = useState<Reward[]>(DEFAULT_REWARDS);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);

  // Load initial data
  useEffect(() => {
    const migrateData = async () => {
      const isMigrated = localStorage.getItem('family_goals_migrated');
      if (isMigrated === 'true') return;

      try {
        const localGoals = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const localTxs = JSON.parse(localStorage.getItem(TX_KEY) || '[]');
        const localAchs = JSON.parse(localStorage.getItem(ACH_KEY) || '[]');
        const localCheckIns = JSON.parse(localStorage.getItem(CHECKIN_KEY) || '[]');
        const localRewards = JSON.parse(localStorage.getItem(REWARDS_KEY) || 'null');

        if (localGoals.length > 0) {
          const mappedGoals = localGoals.map((g: any) => ({
            id: g.id, name: g.name, description: g.description, start_date: g.startDate,
            end_date: g.endDate, progress: g.progress, creator: g.creator || '爸爸',
            assignees: g.assignees || (g.assignee ? [g.assignee] : ['爸爸']),
            assignee: g.assignee, signature: g.signature || '', priority: g.priority || '中',
            completed_at: g.completedAt, confirmations: g.confirmations || {}
          }));
          await supabase.from('goals').upsert(mappedGoals);
        }

        if (localTxs.length > 0) {
          await supabase.from('transactions').upsert(localTxs);
        }

        if (localAchs.length > 0) {
          const mappedAchs = localAchs.map((a: any) => ({
            id: a.id, member: a.member, ach_id: a.achId, date: a.date
          }));
          await supabase.from('achievements').upsert(mappedAchs);
        }

        if (localCheckIns.length > 0) {
          const mappedCheckIns = localCheckIns.map((c: any) => ({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            member: c.member, date: c.date
          }));
          await supabase.from('checkins').upsert(mappedCheckIns);
        }

        if (localRewards && localRewards.length > 0) {
          const mappedRewards = localRewards.map((r: any) => ({
            id: r.id, name: r.name, cost: r.cost, description: r.description,
            is_active: r.isActive, is_custom: r.isCustom, icon_name: r.iconName
          }));
          await supabase.from('rewards').upsert(mappedRewards);
        }

        localStorage.setItem('family_goals_migrated', 'true');
      } catch (e) {
        console.error('Migration failed', e);
      }
    };

    const loadData = async () => {
      setLoading(true);
      try {
        const [
          { data: goalsData },
          { data: txsData },
          { data: achsData },
          { data: rewardsData }
        ] = await Promise.all([
          supabase.from('goals').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('achievements').select('*'),
          supabase.from('rewards').select('*')
        ]);

        if (goalsData) {
          const goalsToUpdate = goalsData.filter(g => g.progress === 100 && !g.completed_at);
          if (goalsToUpdate.length > 0) {
            await Promise.all(goalsToUpdate.map(g => supabase.from('goals').update({ progress: 99 }).eq('id', g.id)));
            goalsToUpdate.forEach(g => g.progress = 99);
          }
          setGoals(goalsData.map(g => ({
            id: g.id,
            name: g.name,
            description: g.description,
            startDate: g.start_date,
            endDate: g.end_date,
            progress: g.progress,
            creator: g.creator,
            assignees: g.assignees,
            assignee: g.assignee,
            signature: g.signature,
            priority: g.priority,
            completedAt: g.completed_at,
            confirmations: g.confirmations
          })));
        }
        if (txsData) setTxs(txsData);
        if (achsData) {
          setAchs(achsData.map(a => ({
            id: a.id,
            member: a.member,
            achId: a.ach_id,
            date: a.date
          })));
        }
        if (rewardsData && rewardsData.length > 0) {
          setRewards(rewardsData.map(r => ({
            id: r.id,
            name: r.name,
            cost: r.cost,
            description: r.description,
            isActive: r.is_active,
            isCustom: r.is_custom,
            iconName: r.icon_name
          })));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    const init = async () => {
      await migrateData();
      await loadData();
      const localMsgs = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
      setMessages(localMsgs);
    };

    init();
  }, []);

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  // Realtime subscriptions
  useEffect(() => {
    const goalsSub = supabase.channel('goals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, payload => {
        if (payload.eventType === 'INSERT') {
          const g = payload.new;
          setGoals(prev => {
            if (prev.some(p => p.id === g.id)) return prev;
            return [...prev, {
              id: g.id, name: g.name, description: g.description, startDate: g.start_date,
              endDate: g.end_date, progress: g.progress, creator: g.creator,
              assignees: g.assignees, assignee: g.assignee, signature: g.signature,
              priority: g.priority, completedAt: g.completed_at, confirmations: g.confirmations
            }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const g = payload.new;
          setGoals(prev => prev.map(p => p.id === g.id ? {
            id: g.id, name: g.name, description: g.description, startDate: g.start_date,
            endDate: g.end_date, progress: g.progress, creator: g.creator,
            assignees: g.assignees, assignee: g.assignee, signature: g.signature,
            priority: g.priority, completedAt: g.completed_at, confirmations: g.confirmations
          } : p));
        } else if (payload.eventType === 'DELETE') {
          setGoals(prev => prev.filter(p => p.id !== payload.old.id));
        }
      }).subscribe();

    const txsSub = supabase.channel('txs_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => {
        setTxs(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          return [...prev, payload.new as Transaction];
        });
      }).subscribe();

    const achsSub = supabase.channel('achs_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'achievements' }, payload => {
        setAchs(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          return [...prev, {
            id: payload.new.id, member: payload.new.member, achId: payload.new.ach_id, date: payload.new.date
          }];
        });
      }).subscribe();

    const rewardsSub = supabase.channel('rewards_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, payload => {
        if (payload.eventType === 'INSERT') {
          const r = payload.new;
          setRewards(prev => {
            if (prev.some(p => p.id === r.id)) return prev;
            return [...prev, {
              id: r.id, name: r.name, cost: r.cost, description: r.description,
              isActive: r.is_active, isCustom: r.is_custom, iconName: r.icon_name
            }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const r = payload.new;
          setRewards(prev => prev.map(p => p.id === r.id ? {
            id: r.id, name: r.name, cost: r.cost, description: r.description,
            isActive: r.is_active, isCustom: r.is_custom, iconName: r.icon_name
          } : p));
        } else if (payload.eventType === 'DELETE') {
          setRewards(prev => prev.filter(p => p.id !== payload.old.id));
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(goalsSub);
      supabase.removeChannel(txsSub);
      supabase.removeChannel(achsSub);
      supabase.removeChannel(rewardsSub);
    };
  }, []);

  useEffect(() => { if (currentUser) localStorage.setItem(CURRENT_USER_KEY, currentUser); }, [currentUser]);

  const [filter, setFilter] = useState<FilterType>('全部');
  const [lbTab, setLbTab] = useState<'total' | 'weekly' | 'daily'>('total');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<string | null>(null);
  const [rewardMember, setRewardMember] = useState(ROLES[0]);
  
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [isRewardEditModalOpen, setIsRewardEditModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  
  const [isMessageBoardOpen, setIsMessageBoardOpen] = useState(false);

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const memberStats = useMemo(() => {
    return ROLES.map(role => {
      const mGoals = goals.filter(g => {
        const assignees = g.assignees || (g.assignee ? [g.assignee] : []);
        return assignees.includes(role);
      });
      const active = mGoals.filter(g => g.progress < 100);
      const mTx = txs.filter(t => t.member === role);
      const earned = mTx.filter(t => t.type === 'earned').reduce((s, t) => s + t.amount, 0);
      const redeemed = mTx.filter(t => t.type === 'redeemed').reduce((s, t) => s + t.amount, 0);
      const pts = earned - redeemed;
      
      let badge = 'Beginner', badgeColor = 'text-stone-400';
      if (earned >= 200) { badge = 'Champion'; badgeColor = 'text-yellow-500'; }
      else if (earned >= 100) { badge = 'Achiever'; badgeColor = 'text-slate-400'; }
      else if (earned >= 50) { badge = 'Contributor'; badgeColor = 'text-blue-500'; }

      const weekly = [0,0,0,0];
      const now = new Date().getTime();
      mTx.filter(t => t.type === 'earned').forEach(t => {
        const w = Math.floor((now - new Date(t.date).getTime()) / 604800000);
        if (w >= 0 && w < 4) weekly[3 - w] += t.amount;
      });

      let warning: 'red' | 'yellow' | 'green' = 'green';
      if (active.some(g => getWarningStatus(g) === 'red')) warning = 'red';
      else if (active.some(g => getWarningStatus(g) === 'yellow')) warning = 'yellow';

      return { role, total: mGoals.length, active: active.length, completed: mGoals.length - active.length, pts, earned, badge, badgeColor, weekly, warning };
    });
  }, [goals, txs]);

  const familyPts = memberStats.reduce((s, m) => s + m.pts, 0);
  const topGoals = [...goals].filter(g => g.progress < 100).sort((a, b) => getGoalScore(b) - getGoalScore(a)).slice(0, 5);

  // --- New Components moved outside ---

  useEffect(() => {
    const newAchs: Achievement[] = [], newTxs: Transaction[] = [];
    const now = new Date().toISOString();
    
    ROLES.forEach(role => {
      const stats = memberStats.find(m => m.role === role);
      if (!stats) return;
      
      const mGoals = goals.filter(g => (g.assignees?.includes(role) || g.assignee === role) && g.progress === 100);
      const mAchIds = achs.filter(a => a.member === role).map(a => a.achId);
      
      ACHIEVEMENTS.forEach(def => {
        if (mAchIds.includes(def.id)) return;
        
        let unlocked = false;
        if (def.id === 'a1' && mGoals.length >= 1) unlocked = true;
        if (def.id === 'a2' && stats.earned >= 50) unlocked = true;
        if (def.id === 'a3' && stats.earned >= 100) unlocked = true;
        if (def.id === 'a4' && stats.earned >= 200) unlocked = true;
        if (def.id === 'a5' && mGoals.filter(g => g.priority === '高').length >= 3) unlocked = true;
        
        if (unlocked) {
          const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
          newAchs.push({ id: uuid, member: role, achId: def.id, date: now });
          if (def.bonus) {
            const txUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            newTxs.push({ id: txUuid, date: now, member: role, amount: def.bonus, reason: `解锁成就: ${def.name}`, type: 'earned' });
          }
        }
      });
    });

    if (newAchs.length > 0 || newTxs.length > 0) {
      if (newAchs.length > 0) setAchs(p => [...p, ...newAchs]);
      if (newTxs.length > 0) setTxs(p => [...p, ...newTxs]);
    }
  }, [goals, memberStats]); // Removed txs and achs from dependencies to prevent infinite loop

  const handleAddProgress = async (id: string) => {
    try {
      const goal = goals.find(g => g.id === id);
      if (!goal) return;
      const newProg = Math.min(goal.progress + 10, 99);
      await supabase.from('goals').update({ progress: newProg }).eq('id', id);
      showToast('进度已更新');
    } catch (e) {
      console.error(e);
      showToast('更新失败，请重试', 'error');
    }
  };

  const handleMarkAsDone = async (id: string) => {
    try {
      await supabase.from('goals').update({ progress: 99 }).eq('id', id);
      showToast('已标记为完成，等待全家确认');
    } catch (e) {
      console.error(e);
      showToast('操作失败', 'error');
    }
  };

  const handleConfirmCompletion = async (id: string, member: string) => {
    try {
      const goal = goals.find(g => g.id === id);
      if (!goal) return;
      
      const confirmations = { ...(goal.confirmations || {}), [member]: true };
      const allConfirmed = ROLES.every(r => confirmations[r]);
      
      const updates: any = { confirmations };
      
      if (allConfirmed && !goal.completedAt) {
        updates.completed_at = new Date().toISOString();
        updates.progress = 100;
        
        const isEarly = new Date() < new Date(goal.endDate);
        const assignees = goal.assignees || (goal.assignee ? [goal.assignee] : []);
        const isTeam = assignees.length > 1;
        
        const newTxs: any[] = [];
        assignees.forEach(m => {
          newTxs.push({ id: generateId(), member: m, amount: 10, reason: `完成目标: ${goal.name}`, type: 'earned' });
          if (isEarly) {
            newTxs.push({ id: generateId(), member: m, amount: 3, reason: `提前完成`, type: 'earned' });
          }
          if (isTeam) {
            newTxs.push({ id: generateId(), member: m, amount: 5, reason: `团队协作`, type: 'earned' });
          }
          
          const mCompleted = goals.filter(g => (g.assignees?.includes(m) || g.assignee === m) && g.completedAt);
          if (mCompleted.length % 3 === 2) {
            newTxs.push({ id: generateId(), member: m, amount: 8, reason: `连续完成3个目标`, type: 'earned' });
          }
        });
        
        await supabase.from('transactions').insert(newTxs);
      }
      
      await supabase.from('goals').update(updates).eq('id', id);
      showToast('确认成功');
    } catch (e) {
      console.error(e);
      showToast('确认失败，请重试', 'error');
    }
  };

  const handleRedeem = async (member: string, reward: Reward) => {
    try {
      const stats = memberStats.find(m => m.role === member);
      if (stats && stats.pts >= reward.cost) {
        const newTx = { 
          id: generateId(),
          member, 
          amount: reward.cost, 
          reason: `兑换奖励: ${reward.name}`, 
          type: 'redeemed' 
        };
        await supabase.from('transactions').insert(newTx);
        showToast(`成功兑换：${reward.name}`);
      } else {
        showToast('积分不足', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('兑换失败，请重试', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('goals').delete().eq('id', id);
      setIsDeleteModalOpen(false);
      setGoalToDelete(null);
      showToast('目标已删除');
    } catch (e) {
      console.error(e);
      showToast('删除失败，请重试', 'error');
    }
  };

  const handleSaveGoal = async (goalData: Omit<Goal, 'id'>) => {
    try {
      const dbGoal = {
        name: goalData.name,
        description: goalData.description,
        start_date: goalData.startDate,
        end_date: goalData.endDate,
        progress: goalData.progress,
        creator: goalData.creator,
        assignees: goalData.assignees,
        assignee: goalData.assignee,
        signature: goalData.signature,
        priority: goalData.priority,
        confirmations: goalData.confirmations || {}
      };

      if (editingGoal) {
        await supabase.from('goals').update(dbGoal).eq('id', editingGoal.id);
        showToast('目标已更新');
      } else {
        await supabase.from('goals').insert({ ...dbGoal, id: generateId() });
        showToast('新目标创建成功');
      }
      
      setIsModalOpen(false);
      setEditingGoal(null);
    } catch (e) {
      console.error(e);
      showToast('保存失败，请重试', 'error');
    }
  };

  const handleRecoverFromLocal = async () => {
    if (!window.confirm('这将尝试从浏览器本地缓存读取旧版数据并同步到数据库。\n\n适用于：\n1. 刚刚配置好数据库\n2. 之前在本地使用过且数据未丢失\n\n注意：如果数据库中已有较新数据，请谨慎操作。是否继续？')) {
      return;
    }

    try {
      const localGoals = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const localTxs = JSON.parse(localStorage.getItem(TX_KEY) || '[]');
      const localAchs = JSON.parse(localStorage.getItem(ACH_KEY) || '[]');
      const localCheckIns = JSON.parse(localStorage.getItem(CHECKIN_KEY) || '[]');
      const localRewards = JSON.parse(localStorage.getItem(REWARDS_KEY) || 'null');

      let restoredCount = 0;

      if (localGoals.length > 0) {
        const mappedGoals = localGoals.map((g: any) => ({
          id: g.id, name: g.name, description: g.description, start_date: g.startDate,
          end_date: g.endDate, progress: g.progress, creator: g.creator || '爸爸',
          assignees: g.assignees || (g.assignee ? [g.assignee] : ['爸爸']),
          assignee: g.assignee, signature: g.signature || '', priority: g.priority || '中',
          completed_at: g.completedAt, confirmations: g.confirmations || {}
        }));
        const { error } = await supabase.from('goals').upsert(mappedGoals);
        if (error) throw error;
        restoredCount += localGoals.length;
      }

      if (localTxs.length > 0) {
        const { error } = await supabase.from('transactions').upsert(localTxs);
        if (error) throw error;
        restoredCount += localTxs.length;
      }

      if (localAchs.length > 0) {
        const mappedAchs = localAchs.map((a: any) => ({
          id: a.id, member: a.member, ach_id: a.achId, date: a.date
        }));
        const { error } = await supabase.from('achievements').upsert(mappedAchs);
        if (error) throw error;
        restoredCount += localAchs.length;
      }
      
      if (localCheckIns.length > 0) {
          const mappedCheckIns = localCheckIns.map((c: any) => ({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            member: c.member, date: c.date
          }));
          const { error } = await supabase.from('checkins').upsert(mappedCheckIns);
          if (error) throw error;
          restoredCount += localCheckIns.length;
      }

      if (localRewards && localRewards.length > 0) {
        const mappedRewards = localRewards.map((r: any) => ({
          id: r.id, name: r.name, cost: r.cost, description: r.description,
          is_active: r.isActive, is_custom: r.isCustom, icon_name: r.iconName
        }));
        const { error } = await supabase.from('rewards').upsert(mappedRewards);
        if (error) throw error;
        restoredCount += localRewards.length;
      }

      if (restoredCount === 0) {
        showToast('本地缓存中没有找到数据', 'error');
      } else {
        showToast(`成功恢复 ${restoredCount} 条记录，页面即将刷新`);
        localStorage.setItem('family_goals_migrated', 'true');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      console.error('Recovery failed', e);
      showToast('恢复失败，请检查控制台错误', 'error');
    }
  };

  const handleExport = () => {
    const data = {
      appVersion: "2.0.0",
      goals,
      txs,
      achs,
      rewards
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-goals-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Version compatibility check
        const version = data.appVersion || '1.0.0';
        let importedGoals = data.goals || [];
        let importedRewards = data.rewards || DEFAULT_REWARDS;
        
        // Migrate from older versions
        if (version !== '2.0.0') {
          // Add confirmations object if missing
          importedGoals = importedGoals.map((g: any) => ({
            ...g,
            confirmations: g.confirmations || {},
            assignees: g.assignees || (g.assignee ? [g.assignee] : ['爸爸'])
          }));
        }

        if (window.confirm(`检测到备份文件版本: ${version}\n警告：导入数据将覆盖当前所有记录！是否继续？`)) {
          setGoals(importedGoals);
          setTxs(data.txs || []);
          setAchs(data.achs || []);
          setRewards(importedRewards);
          setIsDataModalOpen(false);
          alert('数据导入成功！');
        }
      } catch (err) {
        alert('导入失败：无效的 JSON 文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleToggleRewardActive = async (id: string) => {
    const r = rewards.find(r => r.id === id);
    if (r) {
      await supabase.from('rewards').update({ is_active: !r.isActive }).eq('id', id);
    }
  };

  const handleDeleteReward = async (id: string) => {
    await supabase.from('rewards').delete().eq('id', id);
  };

  const handleSaveReward = async (rewardData: Omit<Reward, 'id'>) => {
    const dbReward = {
      name: rewardData.name,
      cost: rewardData.cost,
      description: rewardData.description,
      is_active: rewardData.isActive,
      is_custom: rewardData.isCustom,
      icon_name: rewardData.iconName
    };

    if (editingReward) {
      await supabase.from('rewards').update(dbReward).eq('id', editingReward.id);
    } else {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      await supabase.from('rewards').insert({ ...dbReward, id });
    }
    
    setIsRewardEditModalOpen(false);
    setEditingReward(null);
  };

  const handleAddMessage = (content: string) => {
    if (!currentUser) return;
    const newMsg: Message = {
      id: generateId(),
      user: currentUser,
      content,
      date: new Date().toISOString(),
      likes: 0
    };
    setMessages(prev => [newMsg, ...prev]);
    showToast('留言已发布');
  };

  const handleLikeMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, likes: m.likes + 1 } : m));
  };

  const leaderboard = useMemo(() => {
    const now = new Date().getTime();
    return ROLES.map(role => {
      const mTx = txs.filter(t => t.member === role && t.type === 'earned');
      let pts = 0;
      if (lbTab === 'total') pts = mTx.reduce((s, t) => s + t.amount, 0);
      else if (lbTab === 'weekly') pts = mTx.filter(t => (now - new Date(t.date).getTime()) <= 604800000).reduce((s, t) => s + t.amount, 0);
      else if (lbTab === 'daily') pts = mTx.filter(t => t.date.startsWith(new Date().toISOString().split('T')[0])).reduce((s, t) => s + t.amount, 0);
      const st = memberStats.find(m => m.role === role);
      return { role, pts, badge: st?.badge, badgeColor: st?.badgeColor };
    }).sort((a, b) => b.pts - a.pts);
  }, [txs, lbTab, memberStats]);

  const filteredGoals = goals.filter(g => {
    if (filter === '规划中') return g.progress === 0;
    if (filter === '进行中') return g.progress > 0 && g.progress < 99;
    if (filter === '待确认') return g.progress >= 99 && !g.completedAt;
    if (filter === '已完成') return g.progress >= 100 && g.completedAt;
    return true;
  });

  const isAdmin = currentUser === '管理员';

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername === 'admin' && adminPassword === 'password') {
      setCurrentUser('管理员');
      setShowAdminLogin(false);
      setAdminUsername('');
      setAdminPassword('');
      setAdminError('');
    } else {
      setAdminError('用户名或密码错误');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  if (!currentUser) {
    if (showAdminLogin) {
      return (
        <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 font-sans text-stone-800">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold mb-6 text-center">管理员登录</h1>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">用户名</label>
                <input 
                  type="text" 
                  value={adminUsername} 
                  onChange={e => setAdminUsername(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="请输入 admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">密码</label>
                <input 
                  type="password" 
                  value={adminPassword} 
                  onChange={e => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="请输入 password"
                />
              </div>
              {adminError && <p className="text-red-500 text-sm text-center">{adminError}</p>}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAdminLogin(false); setAdminError(''); }}
                  className="flex-1 py-3 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 transition-all font-medium text-stone-600 cursor-pointer"
                >
                  返回
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-all font-medium cursor-pointer"
                >
                  登录
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 font-sans text-stone-800">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">欢迎来到家庭目标</h1>
          <p className="text-stone-500 mb-8">请选择您的角色。注意：角色选择后将无法更改。</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => setCurrentUser(role)}
                className="py-4 px-4 rounded-2xl border-2 border-stone-100 hover:border-orange-500 hover:bg-orange-50 transition-all font-medium text-lg cursor-pointer"
              >
                {role}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAdminLogin(true)}
            className="w-full py-4 px-4 rounded-2xl border-2 border-stone-100 hover:border-blue-500 hover:bg-blue-50 transition-all font-medium text-lg text-stone-600 hover:text-blue-600 cursor-pointer flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" />
            管理员 (可管理所有项目)
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-stone-800 pb-20">
      <header className="bg-white shadow-sm border-b border-orange-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-600">
            <Heart className="w-6 h-6 fill-current" />
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              多盈家庭目标
              <span className="text-[10px] font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full tracking-normal">v2.0</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-stone-600 bg-stone-100 px-3 py-1 rounded-full hidden sm:inline-block">
              当前角色: {currentUser}
            </span>
            <button 
              onClick={handleLogout}
              className="text-xs font-medium text-stone-500 hover:text-red-500 underline cursor-pointer"
            >
              退出
            </button>
            {isAdmin && (
              <button 
                onClick={() => setIsDataModalOpen(true)}
                className="p-2 text-stone-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors cursor-pointer"
                title="数据管理"
              >
                <Database className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium text-sm transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新建目标</span>
            </button>
          </div>
        </div>
      </header>

        <main className="max-w-5xl mx-auto px-4 pb-24 space-y-8">
          
          {/* 1. Family Hero Section (Total Points) */}
          <FamilyHero familyPts={familyPts} />

          {/* 2. Danmaku Board */}
          <DanmakuBoard messages={messages} onSend={handleAddMessage} />

          {/* 3. Race Chart (Mountain) */}
          <RaceChart memberStats={memberStats} />

          {/* 4. Personal Dashboard (If logged in) */}
          {currentUser && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl border-2 border-white/30">
                    {currentUser === '爸爸' ? '👨🏻' : currentUser === '妈妈' ? '👩🏻' : currentUser === '姐姐' ? '👧🏻' : '👶🏻'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">我的概览</h3>
                    <p className="text-white/80 text-xs">加油，{currentUser}！</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black">{memberStats.find(m => m.role === currentUser)?.pts || 0}</div>
                  <div className="text-xs text-white/60">当前积分</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="text-xs text-white/60 mb-1">待办任务</div>
                  <div className="font-bold text-lg">
                    {goals.filter(g => (g.assignees?.includes(currentUser) || g.assignee === currentUser) && g.progress < 100).length}
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="text-xs text-white/60 mb-1">本周获得</div>
                  <div className="font-bold text-lg">
                    {memberStats.find(m => m.role === currentUser)?.weekly.reduce((a,b)=>a+b, 0) || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Task Center */}
          <div className="bg-stone-50 rounded-[2.5rem] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                <Target className="w-7 h-7 text-orange-500" />
                任务中心
              </h2>
              <button 
                onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
                className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-stone-200 transition-all flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> 新建任务
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              {(['全部', '规划中', '进行中', '待确认', '已完成'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    filter === f 
                      ? 'bg-stone-900 text-white shadow-md' 
                      : 'bg-white text-stone-500 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Task Grid */}
            {filteredGoals.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-stone-100 border-dashed">
                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-stone-300" />
                </div>
                <p className="text-stone-500 font-medium">暂无相关任务</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredGoals.map(goal => (
                    <GoalCard 
                      key={goal.id} 
                      goal={goal} 
                      currentUser={currentUser}
                      onAddProgress={() => handleAddProgress(goal.id)}
                      onMarkAsDone={() => handleMarkAsDone(goal.id)}
                      onConfirm={(member) => handleConfirmCompletion(goal.id, member)}
                      onEdit={() => { setEditingGoal(goal); setIsModalOpen(true); }}
                      onDelete={() => { setGoalToDelete(goal.id); setIsDeleteModalOpen(true); }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* 6. Rewards Section (Moved to bottom) */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                <Gift className="w-7 h-7 text-pink-500" />
                积分兑换
              </h2>
              <button 
                onClick={() => setIsRewardModalOpen(true)}
                className="text-stone-400 hover:text-stone-600 p-2 hover:bg-stone-50 rounded-full transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.filter(r => r.isActive).map(reward => (
                <div key={reward.id} className="bg-stone-50 rounded-2xl p-5 border border-stone-100 hover:border-pink-200 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-pink-500 shadow-sm">
                      {ICONS[reward.iconName || 'Gift'] ? React.createElement(ICONS[reward.iconName || 'Gift'], { className: "w-5 h-5" }) : <Gift className="w-5 h-5" />}
                    </div>
                    <div className="bg-pink-100 text-pink-600 px-2 py-1 rounded-lg text-xs font-bold">
                      {reward.cost} 分
                    </div>
                  </div>
                  <h3 className="font-bold text-stone-900 mb-1">{reward.name}</h3>
                  <p className="text-xs text-stone-500 mb-4 h-8 line-clamp-2">{reward.description || '暂无描述'}</p>
                  <button 
                    onClick={() => handleRedeem(currentUser || '爸爸', reward)}
                    disabled={!currentUser}
                    className="w-full py-2 bg-white border border-stone-200 text-stone-600 rounded-xl text-sm font-bold hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    立即兑换
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Rules (Light Style) */}
          <div className="py-8 text-center">
            <div className="inline-block bg-stone-100 rounded-3xl p-6 max-w-4xl mx-auto">
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-6 flex items-center justify-center gap-2">
                <Info className="w-4 h-4" />
                积分规则说明
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">基础奖励</div>
                  <div className="font-bold text-stone-700">完成目标 <span className="text-emerald-500">+10</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">额外加分</div>
                  <div className="font-bold text-stone-700">提前完成 <span className="text-blue-500">+3</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">团队协作</div>
                  <div className="font-bold text-stone-700">多人完成 <span className="text-purple-500">+5/人</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">连胜奖励</div>
                  <div className="font-bold text-stone-700">三连胜 <span className="text-orange-500">+8</span></div>
                </div>
              </div>
            </div>
          </div>

        </main>



      {/* Modals */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium ${
              toast.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <GoalModal 
            goal={editingGoal} 
            currentUser={currentUser}
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSaveGoal} 
          />
        )}
        {isDeleteModalOpen && (
          <DeleteConfirmModal
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={() => goalToDelete && handleDelete(goalToDelete)}
          />
        )}
        {historyModal && (
          <HistoryModal
            member={historyModal}
            txs={txs}
            onClose={() => setHistoryModal(null)}
          />
        )}
        {isDataModalOpen && (
          <DataManagementModal
            onClose={() => setIsDataModalOpen(false)}
            onExport={handleExport}
            onImport={handleImport}
            onRecover={handleRecoverFromLocal}
          />
        )}
        {isRewardModalOpen && (
          <RewardManagementModal
            rewards={rewards}
            onClose={() => setIsRewardModalOpen(false)}
            onToggleActive={handleToggleRewardActive}
            onDelete={handleDeleteReward}
            onEdit={(r) => { setEditingReward(r); setIsRewardEditModalOpen(true); }}
            onAdd={() => { setEditingReward(null); setIsRewardEditModalOpen(true); }}
          />
        )}
        {isRewardEditModalOpen && (
          <RewardEditModal
            reward={editingReward}
            onClose={() => setIsRewardEditModalOpen(false)}
            onSave={(r) => {
              handleSaveReward({
                ...r,
                isActive: editingReward ? editingReward.isActive : true,
                isCustom: editingReward ? editingReward.isCustom : true
              });
            }}
          />
        )}
        {isMessageBoardOpen && (
          <MessageBoardModal
            messages={messages}
            currentUser={currentUser}
            onClose={() => setIsMessageBoardOpen(false)}
            onSend={handleAddMessage}
            onLike={handleLikeMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBoardModal({ messages, currentUser, onClose, onSend, onLike }: { messages: Message[], currentUser: string, onClose: () => void, onSend: (content: string) => void, onLike: (id: string) => void }) {
  const [content, setContent] = useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 bg-indigo-500 text-white flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" /> 家庭留言板
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-stone-50" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center text-stone-400 py-10">
              <p>还没有留言，快来抢沙发！</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.user === currentUser;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-stone-600">{msg.user}</span>
                    <span className="text-[10px] text-stone-400">{new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[80%] text-sm relative group ${isMe ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none'}`}>
                    {msg.content}
                    <button 
                      onClick={() => onLike(msg.id)}
                      className={`absolute -bottom-3 ${isMe ? '-left-8' : '-right-8'} bg-white border border-stone-100 shadow-sm rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 text-stone-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100`}
                    >
                      <Heart className={`w-3 h-3 ${msg.likes > 0 ? 'fill-red-500 text-red-500' : ''}`} /> {msg.likes}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 bg-white border-t border-stone-100">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (content.trim()) {
                onSend(content);
                setContent('');
              }
            }}
            className="flex gap-2"
          >
            <input 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="说点什么..."
              className="flex-grow px-4 py-2 bg-stone-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button 
              type="submit"
              disabled={!content.trim()}
              className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Upload className="w-5 h-5 rotate-90" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function DataManagementModal({ onClose, onExport, onImport, onRecover }: { onClose: () => void, onExport: () => void, onImport: (e: React.ChangeEvent<HTMLInputElement>) => void, onRecover: () => void }) {
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

function RewardManagementModal({ rewards, onClose, onToggleActive, onDelete, onEdit, onAdd }: { rewards: Reward[], onClose: () => void, onToggleActive: (id: string) => void, onDelete: (id: string) => void, onEdit: (r: Reward) => void, onAdd: () => void }) {
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

function RewardEditModal({ reward, onClose, onSave }: { reward: Reward | null, onClose: () => void, onSave: (r: Omit<Reward, 'id' | 'isActive' | 'isCustom'>) => void }) {
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
          });
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">奖励名称</label>
              <input name="name" defaultValue={reward?.name} required className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" placeholder="例如：全家看电影" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">消耗积分</label>
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

function WarningLight({ status }: { status: 'red' | 'yellow' | 'green' }) {
  const colors = {
    red: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    yellow: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]',
    green: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
  };
  
  return (
    <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
      <div className={`w-3 h-3 rounded-full ${colors[status]}`} />
    </div>
  );
}

function GoalCard({ goal, currentUser, onAddProgress, onMarkAsDone, onConfirm, onEdit, onDelete }: { goal: Goal, currentUser: string, onAddProgress: () => void, onMarkAsDone: () => void, onConfirm: (member: string) => void, onEdit: () => void, onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCompleted = goal.progress >= 100 && goal.completedAt !== undefined;
  const isPendingConfirmation = goal.progress >= 99 && !goal.completedAt;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(goal.endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isOverdue = diffDays < 0 && !isCompleted;
  const warningStatus = getWarningStatus(goal);

  const assignees = goal.assignees || (goal.assignee ? [goal.assignee] : []);
  const confirmations = goal.confirmations || {};
  const confirmedCount = ROLES.filter(r => confirmations[r]).length;

  const isAdmin = currentUser === '管理员';
  const canEdit = isAdmin || goal.creator === currentUser;
  const canAddProgress = isAdmin || assignees.includes(currentUser) || goal.creator === currentUser;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all ${
        isCompleted ? 'border-emerald-200' : isPendingConfirmation ? 'border-blue-200' : isOverdue ? 'border-red-200' : 'border-stone-200'
      }`}
    >
      <div 
        className="p-4 cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <WarningLight status={warningStatus} />
              <h3 className="text-base font-bold text-stone-900 truncate flex items-center gap-2">
                {goal.name}
                {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                goal.priority === '高' ? 'bg-red-100 text-red-700' : 
                goal.priority === '中' ? 'bg-orange-100 text-orange-700' : 
                'bg-stone-100 text-stone-700'
              }`}>
                {goal.priority}
              </span>
              <span className="text-xs text-stone-400">
                {isCompleted ? '已完成' : `剩余 ${diffDays} 天`}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="text-xs font-bold text-stone-700">{goal.progress}%</div>
            <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : isPendingConfirmation ? 'bg-blue-500' : 'bg-orange-500'}`}
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-stone-100">
              <div className="py-3 space-y-3">
                <p className="text-sm text-stone-600 bg-stone-50 p-3 rounded-xl">{goal.description || '暂无描述'}</p>
                
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Users className="w-3 h-3 shrink-0" />
                  <span>发起: {goal.creator || '管理员'} | 责任: {assignees.join(', ')}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{goal.startDate} 至 {goal.endDate}</span>
                </div>

                {isPendingConfirmation && (
                  <div className="bg-blue-50 p-3 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                      <Clock className="w-3 h-3" />
                      <span>等待确认 ({confirmedCount}/4)</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ROLES.map(r => (
                        <div key={r} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${confirmations[r] ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-blue-100 text-stone-400'}`}>
                          {confirmations[r] ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                {!isCompleted && (
                  <>
                    {goal.progress < 99 && canAddProgress && (
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onAddProgress(); }}
                          className="py-2 bg-white border border-stone-200 hover:border-orange-300 hover:text-orange-600 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> 进度+10%
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onMarkAsDone(); }}
                          className="py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" /> 确认完成
                        </button>
                      </div>
                    )}
                    {goal.progress >= 99 && !isCompleted && (
                      <div className="flex flex-wrap gap-2">
                        {ROLES.map(r => {
                          if (confirmations[r]) return null;
                          const canConfirm = isAdmin || r === currentUser;
                          return (
                            <button 
                              key={r}
                              onClick={(e) => { e.stopPropagation(); canConfirm && onConfirm(r); }}
                              disabled={!canConfirm}
                              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-1 ${
                                canConfirm 
                                  ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' 
                                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" /> {r} 确认
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                
                {canEdit && (
                  <div className="flex gap-2 pt-2 border-t border-stone-100 mt-2 justify-end">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(); }}
                      className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> 编辑
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> 删除
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GoalModal({ goal, currentUser, onClose, onSave }: { goal: Goal | null, currentUser: string, onClose: () => void, onSave: (g: Omit<Goal, 'id'>) => void }) {
  const [name, setName] = useState(goal?.name || '');
  const [description, setDescription] = useState(goal?.description || '');
  
  const todayStr = getLocalDateString(new Date());
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = getLocalDateString(nextMonth);

  const [startDate, setStartDate] = useState(goal?.startDate || todayStr);
  const [endDate, setEndDate] = useState(goal?.endDate || nextMonthStr);
  const [progress, setProgress] = useState(goal?.progress || 0);
  const [creator, setCreator] = useState(goal?.creator || currentUser);
  const [assignees, setAssignees] = useState<string[]>(goal?.assignees || (goal?.assignee ? [goal.assignee] : [currentUser === '管理员' ? '爸爸' : currentUser]));
  const [signature, setSignature] = useState(goal?.signature || '');
  const [priority, setPriority] = useState<Priority>(goal?.priority || '中');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProgress = progress === 100 && (!goal || !goal.completedAt) ? 99 : progress;
    onSave({
      name,
      description,
      startDate,
      endDate,
      progress: finalProgress,
      creator,
      assignees: assignees.length > 0 ? assignees : ['爸爸'],
      assignee: assignees[0] || '爸爸', // fallback for old data
      signature,
      priority
    });
  };

  const toggleAssignee = (role: string) => {
    if (assignees.includes(role)) {
      setAssignees(assignees.filter(r => r !== role));
    } else {
      setAssignees([...assignees, role]);
    }
  };

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
        className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <h2 className="text-xl font-bold text-stone-800">{goal ? '编辑目标' : '新建家庭目标'}</h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="goal-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">目标名称</label>
              <input 
                required type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                placeholder="例如：存钱去迪士尼"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">描述</label>
              <textarea 
                required value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                placeholder="我们想要实现什么？"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">开始日期</label>
                <input 
                  required type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">结束日期</label>
                <input 
                  required type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">优先级</label>
              <div className="flex gap-3">
                {PRIORITIES.map(p => (
                  <label key={p} className={`flex-1 flex items-center justify-center py-2 rounded-xl border cursor-pointer transition-colors ${
                    priority === p 
                      ? (p === '高' ? 'bg-red-50 border-red-200 text-red-700' : p === '中' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-blue-50 border-blue-200 text-blue-700')
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="priority" 
                      value={p} 
                      checked={priority === p} 
                      onChange={() => setPriority(p as Priority)} 
                      className="sr-only" 
                    />
                    <span className="font-medium text-sm">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">责任人 (可多选，团队目标有额外加分)</label>
              <div className="flex flex-wrap gap-3">
                {ROLES.map(r => (
                  <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                    assignees.includes(r) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-stone-200 text-stone-600'
                  }`}>
                    <input 
                      type="checkbox" 
                      checked={assignees.includes(r)} 
                      onChange={() => toggleAssignee(r)} 
                      className="w-4 h-4 text-blue-600 rounded border-stone-300 focus:ring-blue-500" 
                    />
                    <span className="font-medium text-sm">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1 flex justify-between">
                <span>当前进度</span>
                <span className="text-orange-600">{progress}%</span>
              </label>
              <input 
                type="range" min="0" max="100" step="10" value={progress} onChange={e => setProgress(parseInt(e.target.value))}
                className="w-full accent-orange-500 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl font-medium text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer">
            取消
          </button>
          <button type="submit" form="goal-form" className="px-5 py-2 rounded-xl font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm cursor-pointer">
            保存目标
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteConfirmModal({ onClose, onConfirm }: { onClose: () => void, onConfirm: () => void }) {
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

function HistoryModal({ member, txs, onClose }: { member: string, txs: Transaction[], onClose: () => void }) {
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
