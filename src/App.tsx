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

type CheckIn = {
  member: string;
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

type FilterType = '全部' | '进行中' | '已完成';

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
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [rewards, setRewards] = useState<Reward[]>(DEFAULT_REWARDS);
  const [loading, setLoading] = useState(true);

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
          { data: checkInsData },
          { data: rewardsData }
        ] = await Promise.all([
          supabase.from('goals').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('achievements').select('*'),
          supabase.from('checkins').select('*'),
          supabase.from('rewards').select('*')
        ]);

        if (goalsData) {
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
        if (checkInsData) setCheckIns(checkInsData);
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
    };

    init();
  }, []);

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

    const checkInsSub = supabase.channel('checkins_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins' }, payload => {
        setCheckIns(prev => {
          if (prev.some(p => p.member === payload.new.member && p.date === payload.new.date)) return prev;
          return [...prev, payload.new as CheckIn];
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
      supabase.removeChannel(checkInsSub);
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

  const handleCheckIn = async (role: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (!checkIns.some(c => c.member === role && c.date === today)) {
      const newCheckIn = { member: role, date: today };
      const newTx = { 
        member: role, 
        amount: 1, 
        reason: '每日签到', 
        type: 'earned' 
      };
      
      await Promise.all([
        supabase.from('checkins').insert(newCheckIn),
        supabase.from('transactions').insert(newTx)
      ]);
    }
  };

  const handleAddProgress = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const newProg = Math.min(goal.progress + 10, 100);
    await supabase.from('goals').update({ progress: newProg }).eq('id', id);
  };

  const handleConfirmCompletion = async (id: string, member: string) => {
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
        newTxs.push({ member: m, amount: 10, reason: `完成目标: ${goal.name}`, type: 'earned' });
        if (isEarly) {
          newTxs.push({ member: m, amount: 3, reason: `提前完成`, type: 'earned' });
        }
        if (isTeam) {
          newTxs.push({ member: m, amount: 5, reason: `团队协作`, type: 'earned' });
        }
        
        const mCompleted = goals.filter(g => (g.assignees?.includes(m) || g.assignee === m) && g.completedAt);
        if (mCompleted.length % 3 === 2) {
          newTxs.push({ member: m, amount: 8, reason: `连续完成3个目标`, type: 'earned' });
        }
      });
      
      await supabase.from('transactions').insert(newTxs);
    }
    
    await supabase.from('goals').update(updates).eq('id', id);
  };

  const handleRedeem = async (member: string, reward: Reward) => {
    const stats = memberStats.find(m => m.role === member);
    if (stats && stats.pts >= reward.cost) {
      const newTx = { 
        member, 
        amount: reward.cost, 
        reason: `兑换奖励: ${reward.name}`, 
        type: 'redeemed' 
      };
      await supabase.from('transactions').insert(newTx);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id);
    setIsDeleteModalOpen(false);
    setGoalToDelete(null);
  };

  const handleSaveGoal = async (goalData: Omit<Goal, 'id'>) => {
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
    } else {
      await supabase.from('goals').insert(dbGoal);
    }
    
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleExport = () => {
    const data = {
      appVersion: "1.1.0",
      goals,
      txs,
      achs,
      checkIns,
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
        if (version !== '1.1.0') {
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
          setCheckIns(data.checkIns || []);
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
    if (filter === '进行中') return g.progress < 100;
    if (filter === '已完成') return g.progress >= 100;
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
              家庭目标
              <span className="text-[10px] font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full tracking-normal">v1.1.0</span>
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
            <div className="flex bg-stone-100 rounded-full p-1">
              {ROLES.map(r => {
                const checked = checkIns.some(c => c.member === r && c.date === new Date().toISOString().split('T')[0]);
                return (
                  <button 
                    key={r} 
                    onClick={() => handleCheckIn(r)} 
                    disabled={checked} 
                    title={checked ? '已签到' : '点击签到 (+1分)'}
                    className={`w-8 h-8 rounded-full text-xs font-bold transition-colors cursor-pointer ${checked ? 'bg-emerald-500 text-white' : 'bg-white text-stone-500 hover:text-orange-500 shadow-sm'}`}
                  >
                    {r[0]}
                  </button>
                );
              })}
            </div>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Rules Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            积分规则说明
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm text-stone-600">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <p className="font-bold text-stone-800 mb-1">🎯 基础奖励</p>
              <p>完成目标: <span className="text-emerald-600 font-bold">+10分</span></p>
              <p>每日签到: <span className="text-emerald-600 font-bold">+1分</span></p>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <p className="font-bold text-stone-800 mb-1">⚡ 额外加分</p>
              <p>提前完成: <span className="text-emerald-600 font-bold">+3分</span></p>
              <p>连续完成3个: <span className="text-emerald-600 font-bold">+8分</span></p>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <p className="font-bold text-stone-800 mb-1">🤝 团队协作</p>
              <p>多人共同完成目标，每人额外获得 <span className="text-emerald-600 font-bold">+5分</span></p>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <p className="font-bold text-stone-800 mb-1">🎁 积分兑换</p>
              <p>使用积分可以兑换家庭奖励，如选择电影、免做家务等。</p>
            </div>
          </div>
        </div>

        {/* Family Total Points */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-orange-100 font-medium mb-1">家庭总积分</p>
            <p className="text-4xl font-bold flex items-center gap-2"><Star className="w-8 h-8 text-yellow-300 fill-current" /> {familyPts}</p>
          </div>
          <div className="flex-grow w-full max-w-md bg-white/20 p-4 rounded-xl">
            <p className="text-sm font-medium mb-2 flex justify-between">
              <span>集体奖励进度: 周末野餐</span>
              <span>{Math.min(familyPts, 500)} / 500</span>
            </p>
            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-300 rounded-full" style={{ width: `${Math.min(100, (familyPts/500)*100)}%` }}></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Top 5 Important Goals */}
            {topGoals.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
                <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-500" />
                  最重要目标 Top 5
                </h2>
                <div className="space-y-3">
                  {topGoals.map(goal => (
                    <div key={goal.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-colors">
                      <div className="flex items-center gap-3 flex-grow min-w-0">
                        <WarningLight status={getWarningStatus(goal)} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-900 truncate">{goal.name}</p>
                          <p className="text-xs text-stone-500 flex gap-2">
                            <span>发起人: {goal.creator || '管理员'}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>责任人: {(goal.assignees || [goal.assignee]).join(', ')}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">优先级: {goal.priority}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-medium text-stone-700">进度: {goal.progress}%</p>
                          <div className="w-24 h-1.5 bg-stone-200 rounded-full mt-1">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${goal.progress}%` }} />
                          </div>
                        </div>
                        <div className="text-xs font-medium text-stone-500 w-16 text-right">
                          {goal.endDate.slice(5)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Overview & Trends */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                成员概况与趋势
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {memberStats.map(stat => (
                  <div key={stat.role} className="p-4 rounded-xl bg-stone-50 border border-stone-100 relative flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-stone-900">{stat.role}</span>
                        <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-white ${stat.badgeColor} inline-flex items-center gap-1`}>
                          <Medal className="w-3 h-3" /> {stat.badge}
                        </span>
                      </div>
                      <WarningLight status={stat.warning} />
                    </div>
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <p className="text-xs text-stone-500">当前可用积分</p>
                        <p className="text-2xl font-bold text-orange-600">{stat.pts}</p>
                      </div>
                      <button onClick={() => setHistoryModal(stat.role)} className="text-xs text-blue-500 hover:underline flex items-center gap-1 cursor-pointer">
                        <History className="w-3 h-3" /> 历史
                      </button>
                    </div>
                    <div className="h-12 border-t border-stone-200 pt-2 mb-2">
                      <p className="text-[10px] text-stone-400 mb-1">近4周积分获取趋势</p>
                      <LineChart data={stat.weekly} />
                    </div>
                    <div className="flex gap-1 overflow-x-auto pt-2 border-t border-stone-200 mt-auto">
                      {achs.filter(a => a.member === stat.role).map(a => {
                        const def = ACHIEVEMENTS.find(d => d.id === a.achId);
                        if (!def) return null;
                        const Icon = def.icon;
                        return (
                          <div key={a.id} title={def.name} className={`w-6 h-6 rounded-full bg-white border border-stone-200 flex items-center justify-center shrink-0 ${def.color}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Leaderboard */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" /> 排行榜
                </h2>
                <select 
                  value={lbTab} 
                  onChange={e => setLbTab(e.target.value as any)} 
                  className="text-xs border border-stone-200 rounded-md p-1 outline-none bg-white cursor-pointer"
                >
                  <option value="total">总分</option>
                  <option value="weekly">本周</option>
                  <option value="daily">今日</option>
                </select>
              </div>
              <div className="space-y-2">
                {leaderboard.map((m, i) => (
                  <div key={m.role} className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i===0?'bg-yellow-100 text-yellow-600':i===1?'bg-slate-200 text-slate-600':i===2?'bg-amber-100 text-amber-700':'bg-stone-200 text-stone-500'}`}>
                        {i+1}
                      </div>
                      <span className="text-sm font-bold">{m.role}</span>
                    </div>
                    <span className="font-bold text-orange-600 text-sm">{m.pts} 分</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Point Rewards */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-500" /> 积分兑换
                </h2>
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsRewardModalOpen(true)} className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 cursor-pointer">
                    <Settings className="w-4 h-4" /> 管理奖励
                  </button>
                  <select 
                    value={rewardMember} 
                    onChange={e => setRewardMember(e.target.value)} 
                    className="text-xs border border-stone-200 rounded-md p-1 outline-none bg-white cursor-pointer"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                {rewards.filter(r => r.isActive).map(r => {
                  const pts = memberStats.find(m => m.role === rewardMember)?.pts || 0;
                  const can = pts >= r.cost;
                  const Icon = r.iconName && ICONS[r.iconName] ? ICONS[r.iconName] : Gift;
                  return (
                    <div key={r.id} className={`p-3 rounded-xl border ${can ? 'border-pink-200 bg-pink-50' : 'border-stone-100 bg-stone-50'} flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${can ? 'bg-pink-100 text-pink-500' : 'bg-stone-200 text-stone-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-stone-800">{r.name}</p>
                            {r.isCustom && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">自定义</span>}
                          </div>
                          <p className="text-[10px] text-stone-500">{r.cost} 积分</p>
                        </div>
                      </div>
                      <button 
                        disabled={!can} 
                        onClick={() => handleRedeem(rewardMember, r)} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${can ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
                      >
                        兑换
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4">
          {(['全部', '进行中', '已完成'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                filter === f 
                  ? 'bg-stone-800 text-white' 
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Goals Grid */}
        {filteredGoals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-100 shadow-sm">
            <Target className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-900 mb-1">未找到目标</h3>
            <p className="text-stone-500">
              {filter === '全部' ? "开始创建一个新的家庭目标吧！" : `当前没有${filter}的目标。`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredGoals.map(goal => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal} 
                  currentUser={currentUser}
                  onAddProgress={() => handleAddProgress(goal.id)}
                  onConfirm={(member) => handleConfirmCompletion(goal.id, member)}
                  onEdit={() => { setEditingGoal(goal); setIsModalOpen(true); }}
                  onDelete={() => { setGoalToDelete(goal.id); setIsDeleteModalOpen(true); }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modals */}
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
      </AnimatePresence>
    </div>
  );
}

function DataManagementModal({ onClose, onExport, onImport }: { onClose: () => void, onExport: () => void, onImport: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
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

function GoalCard({ goal, currentUser, onAddProgress, onConfirm, onEdit, onDelete }: { goal: Goal, currentUser: string, onAddProgress: () => void, onConfirm: (member: string) => void, onEdit: () => void, onDelete: () => void }) {
  const isCompleted = goal.progress >= 100 && goal.completedAt !== undefined;
  const isPendingConfirmation = goal.progress >= 100 && !goal.completedAt;
  
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
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col ${
        isCompleted ? 'border-emerald-200' : isPendingConfirmation ? 'border-blue-200' : isOverdue ? 'border-red-200' : 'border-stone-200'
      }`}
    >
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-grow pr-2">
            <div className="flex items-center gap-2 mb-1">
              <WarningLight status={warningStatus} />
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                {goal.name}
                {isCompleted && <CheckCircle className="w-5 h-5 text-emerald-500" />}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                goal.priority === '高' ? 'bg-red-100 text-red-700' : 
                goal.priority === '中' ? 'bg-orange-100 text-orange-700' : 
                'bg-stone-100 text-stone-700'
              }`}>
                优先级: {goal.priority}
              </span>
            </div>
            <p className="text-sm text-stone-500 line-clamp-2">{goal.description}</p>
          </div>
          {canEdit && (
            <div className="flex gap-1 ml-4 shrink-0">
              <button onClick={onEdit} className="p-2 text-stone-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors cursor-pointer">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Users className="w-4 h-4 text-stone-400 shrink-0" />
            <span>发起人: {goal.creator || '管理员'} | 责任人: {assignees.join(', ')}</span>
          </div>
          {isPendingConfirmation && (
            <div className="flex flex-col gap-2 text-sm text-stone-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-blue-600 font-medium">等待全家确认 ({confirmedCount}/4):</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {ROLES.map(r => (
                  <div key={r} className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${confirmations[r] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-stone-50 border-stone-200 text-stone-600'}`}>
                    {confirmations[r] ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3 text-stone-300" />}
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
            <span>{goal.startDate} 至 {goal.endDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {isCompleted ? (
              <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> 已完成</span>
            ) : isPendingConfirmation ? (
              <span className="text-blue-600 flex items-center gap-1"><Clock className="w-4 h-4" /> 待确认 ({confirmedCount}/4)</span>
            ) : isOverdue ? (
              <span className="text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> 已逾期 {Math.abs(diffDays)} 天</span>
            ) : (
              <span className="text-orange-600 flex items-center gap-1"><Clock className="w-4 h-4" /> 剩余 {diffDays} 天</span>
            )}
          </div>
        </div>

        <div className="space-y-2 mt-auto">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-stone-700">进度</span>
            <span className={isCompleted ? 'text-emerald-600' : 'text-stone-700'}>{goal.progress}%</span>
          </div>
          <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : isPendingConfirmation ? 'bg-blue-500' : 'bg-orange-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${goal.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
      
      {!isCompleted && (
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex flex-col gap-2">
          {goal.progress < 100 && canAddProgress && (
            <button 
              onClick={onAddProgress}
              className="w-full py-2 bg-white border border-stone-200 hover:border-orange-300 hover:text-orange-600 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> 增加 10% 进度
            </button>
          )}
          {goal.progress >= 100 && !isCompleted && (
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => {
                if (confirmations[r]) return null;
                const canConfirm = isAdmin || r === currentUser;
                return (
                  <button 
                    key={r}
                    onClick={() => canConfirm && onConfirm(r)}
                    disabled={!canConfirm}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-1 ${
                      canConfirm 
                        ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' 
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> {r} 确认完成
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function GoalModal({ goal, currentUser, onClose, onSave }: { goal: Goal | null, currentUser: string, onClose: () => void, onSave: (g: Omit<Goal, 'id'>) => void }) {
  const [name, setName] = useState(goal?.name || '');
  const [description, setDescription] = useState(goal?.description || '');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(goal?.startDate || todayStr);
  const [endDate, setEndDate] = useState(goal?.endDate || nextMonthStr);
  const [progress, setProgress] = useState(goal?.progress || 0);
  const [creator, setCreator] = useState(goal?.creator || currentUser);
  const [assignees, setAssignees] = useState<string[]>(goal?.assignees || (goal?.assignee ? [goal.assignee] : [currentUser === '管理员' ? '爸爸' : currentUser]));
  const [signature, setSignature] = useState(goal?.signature || '');
  const [priority, setPriority] = useState<Priority>(goal?.priority || '中');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      startDate,
      endDate,
      progress,
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
