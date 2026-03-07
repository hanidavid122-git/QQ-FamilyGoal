import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Plus, Edit2, Trash2, CheckCircle, Clock, Users, User,
  Target, TrendingUp, Calendar, AlertCircle, X,
  Heart, FileText, Flag, Star, Gift, Trophy, 
  History, Medal, Crown, Film, Gamepad, Utensils, 
  Car, Info, Settings, Download, Upload, Database, Eye, EyeOff, CheckCircle2, Circle, Image as ImageIcon,
  Shield, MessageSquare, ChevronUp, ChevronDown, Smile, BarChart3, LineChart as LineChartIcon, Palette
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line } from 'recharts';

import { 
  Priority, Goal, Transaction, Achievement, Reward, FilterType, 
  LayoutComponentId, LayoutConfig, Profile, Message, GoalComment,
  Activity, ActivityType
} from './types';
import { 
  ROLES, ALL_ROLES, PRIORITIES, DEFAULT_LAYOUT, COMPONENT_NAMES, 
  DEFAULT_REWARDS, ICONS, AVATARS, MESSAGE_COLORS,
  DANMAKU_EMOJIS, DANMAKU_SPEEDS, DANMAKU_EFFECTS, DANMAKU_DURATIONS
} from './constants';
import { LoginModal } from './components/LoginModal';
import { LayoutSettingsModal } from './components/LayoutSettingsModal';
import { UserAvatar } from './components/UserAvatar';
import { RecentActivity } from './components/RecentActivity';

const STORAGE_KEY = 'family_goals_data';
const TX_KEY = 'family_goals_txs';
const ACH_KEY = 'family_goals_achs';
const CHECKIN_KEY = 'family_goals_checkins';
const REWARDS_KEY = 'family_goals_rewards';
const CURRENT_USER_KEY = 'family_goals_current_user';


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

function safeSetItem(key: string, value: string) {
  if (value.length > 2000000) {
    console.warn(`Value for key "${key}" is too large to cache (${Math.round(value.length / 1024)} KB)`);
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`Storage quota exceeded for key "${key}", clearing cache...`, e);
    // Clear all cache items to make room
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('cache_')) {
        localStorage.removeItem(k);
      }
    });
    // Try again once
    try {
      localStorage.setItem(key, value);
    } catch (e2) {
      console.error(`Failed to set item "${key}" even after clearing cache`, e2);
    }
  }
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

const MESSAGES_KEY = 'family_goals_messages';

function FamilyGrowthChart({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    let cumulativeTotal = 0;

    const startDate = last7Days[0];
    const initialTxs = transactions.filter(t => t.date < startDate);
    const initialEarned = initialTxs
      .filter(t => t.type === 'earned' || t.type === 'earn')
      .reduce((sum, t) => sum + t.amount, 0);
    const initialRedeemed = initialTxs
      .filter(t => t.type === 'redeemed' || t.type === 'redeem')
      .reduce((sum, t) => sum + t.amount, 0);
    
    cumulativeTotal = initialEarned - initialRedeemed;

    return last7Days.map(date => {
      const dayTxs = transactions.filter(t => t.date.startsWith(date));
      const dayEarned = dayTxs
        .filter(t => t.type === 'earned' || t.type === 'earn')
        .reduce((sum, t) => sum + t.amount, 0);
      const dayRedeemed = dayTxs
        .filter(t => t.type === 'redeemed' || t.type === 'redeem')
        .reduce((sum, t) => sum + t.amount, 0);

      cumulativeTotal += (dayEarned - dayRedeemed);

      return {
        date: date.split('-').slice(1).join('/'),
        total: Math.max(0, cumulativeTotal)
      };
    });
  }, [transactions]);

  const lastPoint = data[data.length - 1];
  
  // Calculate task contribution percentage for the legend
  const taskContribution = useMemo(() => {
    const earnedTxs = transactions.filter(t => t.type === 'earned' || t.type === 'earn');
    const totalEarned = earnedTxs.reduce((sum, t) => sum + t.amount, 0);
    const taskEarned = earnedTxs
      .filter(t => t.reason.includes('目标') || t.reason.includes('完成'))
      .reduce((sum, t) => sum + t.amount, 0);
    return totalEarned > 0 ? Math.round((taskEarned / totalEarned) * 100) : 0;
  }, [transactions]);

  return (
    <div className="w-full mt-4">
      <div className="flex items-center justify-center gap-6 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-yellow-400 rounded-full" />
          <span className="text-[10px] text-white/90 font-black">任务贡献 ({taskContribution}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-white/40 rounded-full" />
          <span className="text-[10px] text-white/70 font-bold">其他来源 ({100 - taskContribution}%)</span>
        </div>
      </div>
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data}>
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}
              interval="preserveStartEnd"
              padding={{ left: 10, right: 10 }}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontSize: '11px' }}
              labelStyle={{ fontWeight: 'black', color: '#1c1917', marginBottom: '4px' }}
              itemStyle={{ padding: '2px 0' }}
              formatter={(value: any) => [
                <span className="font-bold">{value} pts</span>, 
                <span className="text-stone-500">家庭总积分</span>
              ]}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#fbbf24" 
              strokeWidth={4}
              dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={true}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PointsDynamics({ 
  transactions, 
  profiles, 
  isExpanded, 
  onToggle 
}: { 
  transactions: Transaction[], 
  profiles: Profile[], 
  isExpanded: boolean, 
  onToggle: () => void 
}) {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'all'>('week');

  const data = useMemo(() => {
    const roles = ROLES.filter(r => r !== '管理员');
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    return roles.map(role => {
      const roleTxs = transactions.filter(t => {
        const isRole = t.member === role;
        const isEarned = t.type === 'earned' || t.type === 'earn';
        let isInRange = false;
        if (timeRange === 'all') isInRange = true;
        else if (timeRange === 'week') isInRange = t.date >= oneWeekAgo;
        else if (timeRange === 'today') isInRange = t.date.startsWith(todayStr);
        return isRole && isEarned && isInRange;
      });

      const total = roleTxs.reduce((sum, t) => sum + t.amount, 0);
      
      const task = roleTxs.filter(t => t.reason.includes('目标') || t.reason.includes('完成')).reduce((sum, t) => sum + t.amount, 0);
      const login = roleTxs.filter(t => t.reason.includes('登录')).reduce((sum, t) => sum + t.amount, 0);
      const danmaku = roleTxs.filter(t => t.reason.includes('弹幕')).reduce((sum, t) => sum + t.amount, 0);
      const comment = roleTxs.filter(t => t.reason.includes('留言') && !t.reason.includes('弹幕')).reduce((sum, t) => sum + t.amount, 0);
      const other = total - task - login - danmaku - comment;

      return { 
        role, 
        total, 
        task, 
        login, 
        danmaku, 
        comment, 
        other,
        taskPct: total > 0 ? (task / total) * 100 : 0,
        loginPct: total > 0 ? (login / total) * 100 : 0,
        danmakuPct: total > 0 ? (danmaku / total) * 100 : 0,
        commentPct: total > 0 ? (comment / total) * 100 : 0,
        otherPct: total > 0 ? (other / total) * 100 : 0
      };
    }).sort((a, b) => b.total - a.total);
  }, [transactions, timeRange]);

  const maxTotal = useMemo(() => Math.max(...data.map(d => d.total), 1), [data]);
  const leader = data[0];

  const getRangeLabel = () => {
    if (timeRange === 'today') return '今日';
    if (timeRange === 'week') return '本周';
    return '累计';
  };

  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-stone-100 overflow-hidden transition-all duration-300 shadow-sm">
      <div 
        onClick={onToggle}
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/80 transition-colors"
      >
        <div className="flex items-center gap-2 text-stone-500">
          <BarChart3 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">积分动态</span>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && leader && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-500">
              <UserAvatar role={leader.role} profiles={profiles} className="w-5 h-5 text-[10px]" />
              <span className="text-xs text-stone-600 font-bold">
                {leader.role} {getRangeLabel()}领先 <span className="text-orange-500">+{leader.total}</span>
              </span>
            </div>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
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
            <div className="px-6 pb-6 space-y-6 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex bg-stone-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setTimeRange('today')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${timeRange === 'today' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    今日
                  </button>
                  <button 
                    onClick={() => setTimeRange('week')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${timeRange === 'week' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    最近一周
                  </button>
                  <button 
                    onClick={() => setTimeRange('all')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${timeRange === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    全部
                  </button>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-stone-900" />
                    <span className="text-[10px] font-bold text-stone-500">任务</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                    <span className="text-[10px] font-bold text-stone-500">登录</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-400" />
                    <span className="text-[10px] font-bold text-stone-500">弹幕</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-orange-400" />
                    <span className="text-[10px] font-bold text-stone-500">留言</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-stone-200" />
                    <span className="text-[10px] font-bold text-stone-500">其他</span>
                  </div>
                </div>
              </div>

              {data.map((item, idx) => (
                <div key={item.role} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-xs font-bold text-stone-400">0{idx + 1}</div>
                    <UserAvatar role={item.role} profiles={profiles} className="w-8 h-8" />
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-stone-700">{item.role}</span>
                        <span className="text-xs font-black text-orange-500">+{item.total} pts</span>
                      </div>
                      <div className="h-3 bg-stone-100 rounded-full overflow-hidden flex" style={{ width: `${(item.total / maxTotal) * 100}%`, minWidth: '4px' }}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.taskPct}%` }}
                          className="h-full bg-stone-900"
                          title={`任务: ${item.task}pts`}
                        />
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.loginPct}%` }}
                          className="h-full bg-emerald-400"
                          title={`登录: ${item.login}pts`}
                        />
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.danmakuPct}%` }}
                          className="h-full bg-blue-400"
                          title={`弹幕: ${item.danmaku}pts`}
                        />
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.commentPct}%` }}
                          className="h-full bg-orange-400"
                          title={`留言: ${item.comment}pts`}
                        />
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.otherPct}%` }}
                          className="h-full bg-stone-200"
                          title={`其他: ${item.other}pts`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FamilyHero({ familyPts, nextMilestone, nextRewardName, transactions }: { familyPts: number, nextMilestone: number, nextRewardName: string, transactions: Transaction[] }) {
  const progress = Math.min(100, (familyPts / nextMilestone) * 100);
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
        <div className="text-7xl font-black tracking-tighter mb-2 drop-shadow-sm">
          {familyPts}
        </div>
        
        <FamilyGrowthChart transactions={transactions} />

        <div className="w-full max-w-md bg-black/20 h-3 rounded-full overflow-hidden backdrop-blur-sm mb-2 mt-4">
          <div 
            className="h-full bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-white/80 font-medium">
          {familyPts >= nextMilestone 
            ? `已达成里程碑！快去兑换 ${nextRewardName}` 
            : `距离下一个家庭大奖 [${nextRewardName}] 还差 ${nextMilestone - familyPts} 分`}
        </p>
      </div>
    </div>
  );
}



const DANMAKU_EFFECT_LABELS: Record<string, string> = {
  default: '无',
  blink: '闪烁',
  ghost: '幽灵',
  zoom: '缩放',
  pulse: '脉冲',
  bounce: '弹跳',
  rotate: '旋转',
  shake: '抖动',
  flip: '翻转',
  wave: '波浪',
  float: '漂浮',
  skew: '倾斜',
  blur: '模糊',
  neon: '霓虹',
  fire: '火焰',
  ice: '寒冰',
  rainbow: '彩虹',
  glitch: '故障'
};

function DanmakuItem({ msg, profiles, isLeader, isAdmin, onDeleteMessage, i, laneIndex, top }: { msg: Message, profiles: Profile[], isLeader: boolean, isAdmin: boolean, onDeleteMessage?: (id: string | string[]) => void, i: number, laneIndex: number, top: number }) {
  const [loopCount, setLoopCount] = useState(0);
  const effects = useMemo(() => (msg.effect || 'default').split(','), [msg.effect]);
  const randomEffect = useMemo(() => effects[Math.floor(Math.random() * effects.length)] || 'default', [msg.id, loopCount, effects]);

  const offset = useMemo(() => (msg.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6) - 3, [msg.id]);
  const baseSpeed = msg.speed || 10;
  const speedVariation = useMemo(() => (msg.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 4) - 2, [msg.id]);
  const finalSpeed = Math.max(5, baseSpeed + speedVariation);
  
  const createdDate = new Date(msg.date).getTime();
  const duration = msg.duration || (24 * 60 * 60 * 1000);
  const remainingMs = Math.max(0, createdDate + duration - Date.now());
  const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
  const oneHourMs = 60 * 60 * 1000;
  let timeOpacity = 1;
  if (duration !== -1 && remainingMs <= oneHourMs) {
    timeOpacity = Math.max(0.1, remainingMs / oneHourMs);
  }

  return (
    <motion.div
      key={`${msg.id}-${loopCount}`}
      initial={{ left: '100%', x: 0, opacity: 0 }}
      animate={{ 
        x: '-150vw', 
        opacity: (randomEffect === 'blink' ? [timeOpacity, timeOpacity * 0.5, timeOpacity] : (randomEffect === 'ghost' ? [timeOpacity, timeOpacity * 0.2, timeOpacity] : timeOpacity)),
        scale: randomEffect === 'zoom' ? [1, 1.2, 1] : (randomEffect === 'pulse' ? [1, 1.1, 1] : (randomEffect === 'bounce' ? [1, 1.1, 1] : 1)),
        rotate: randomEffect === 'rotate' ? [0, 360] : (randomEffect === 'shake' ? [0, 2, -2, 0] : (randomEffect === 'flip' ? [0, 180, 360] : 0)),
        y: randomEffect === 'wave' ? [0, -10, 10, 0] : (randomEffect === 'float' ? [0, -5, 0] : 0),
        skewX: randomEffect === 'skew' ? [0, 10, -10, 0] : 0,
        filter: randomEffect === 'blur' ? ['blur(0px)', 'blur(2px)', 'blur(0px)'] : (randomEffect === 'neon' ? [`drop-shadow(0 0 2px ${msg.color || '#fff'})`, `drop-shadow(0 0 8px ${msg.color || '#fff'})`, `drop-shadow(0 0 2px ${msg.color || '#fff'})`] : (randomEffect === 'fire' ? ['drop-shadow(0 0 2px #ff4500)', 'drop-shadow(0 0 10px #ff8c00)', 'drop-shadow(0 0 2px #ff4500)'] : (randomEffect === 'ice' ? ['drop-shadow(0 0 2px #00ffff)', 'drop-shadow(0 0 10px #f0ffff)', 'drop-shadow(0 0 2px #00ffff)'] : 'none'))),
        color: randomEffect === 'rainbow' ? ['#ff0000', '#00ff00', '#0000ff', '#ff0000'] : (msg.color || '#000000')
      }}
      transition={{ 
        x: { duration: finalSpeed, ease: "linear", delay: loopCount === 0 ? i * 0.8 : 0 },
        opacity: { duration: (randomEffect === 'blink' || randomEffect === 'ghost') ? 0.8 : 0.5, repeat: Infinity },
        scale: { duration: 1, repeat: Infinity },
        rotate: { duration: randomEffect === 'rotate' ? 2 : 0.5, repeat: Infinity },
        y: { duration: 2, repeat: Infinity },
        skewX: { duration: 1, repeat: Infinity },
        filter: { duration: 1.5, repeat: Infinity },
        color: { duration: 3, repeat: Infinity }
      }}
      onAnimationComplete={() => setLoopCount(prev => prev + 1)}
      className={`absolute whitespace-nowrap flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-stone-200 shadow-sm ${randomEffect === 'glitch' ? 'animate-pulse' : ''}`}
      style={{ 
        top: `${top + offset}%`,
        fontSize: msg.font_size || '0.9rem',
      }}
    >
      <div className="relative">
        <UserAvatar role={msg.user} profiles={profiles} className="w-6 h-6 border-none shadow-none bg-transparent" />
        {isLeader && (
          <div className="absolute -top-2 -right-1 text-[10px]">👑</div>
        )}
      </div>
      <span className="font-bold text-stone-600 text-xs">{msg.user}:</span>
      <span style={{ color: msg.color }}>{msg.content}</span>
      <div className="flex items-center gap-1 ml-1">
        {msg.likes > 0 && <span className="text-[10px] text-pink-400">❤️{msg.likes}</span>}
        <span className="text-[9px] bg-stone-200 text-stone-500 px-1 rounded leading-tight">
          {remainingHours > 24 ? `${Math.ceil(remainingHours/24)}d` : `${remainingHours}h`}
        </span>
        {isAdmin && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteMessage?.(msg.id); }}
            className="text-stone-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function DanmakuBoard({ 
  messages, 
  onSend, 
  currentUser, 
  profiles, 
  memberStats, 
  isAdmin, 
  onClearAll, 
  onDeleteMessage, 
  onToggleBullet, 
  isBulletEnabled, 
  isExpanded,
  onToggle,
  showControls = true 
}: { 
  messages: Message[], 
  onSend: (content: string, avatar?: string, color?: string, fontSize?: string, emoji?: string, speed?: number, effect?: string, duration?: number) => void, 
  currentUser: string | null, 
  profiles: Profile[], 
  memberStats: any[], 
  isAdmin: boolean, 
  onClearAll?: () => void, 
  onDeleteMessage?: (id: string | string[]) => void, 
  onToggleBullet?: () => void, 
  isBulletEnabled: boolean, 
  isExpanded: boolean,
  onToggle: () => void,
  showControls?: boolean 
}) {
  const [input, setInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(MESSAGE_COLORS[0]);
  const [selectedFontSize, setSelectedFontSize] = useState('0.9rem');
  const [selectedSpeed, setSelectedSpeed] = useState(10);
  const [selectedEffect, setSelectedEffect] = useState<string[]>(['default']);
  const [selectedDuration, setSelectedDuration] = useState(24 * 60 * 60 * 1000);
  const [showPicker, setShowPicker] = useState(false);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [deleteRole, setDeleteRole] = useState('');
  const [deleteDate, setDeleteDate] = useState('');

  // Stats
  const totalMessages = messages.length;
  const activeMessages = messages.filter(msg => {
    if (!msg.duration || msg.duration === -1) return true;
    return (new Date(msg.date).getTime() + msg.duration) > Date.now();
  }).length;

  // Danmaku Aggregation Logic (24h window)
  const aggregatedMessages = useMemo(() => {
    const result: Message[] = [];
    const sorted = [...messages].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const msg of sorted) {
      const date = new Date(msg.date).getTime();
      const isDuplicate = result.some(m => 
        m.content.trim() === msg.content.trim() && 
        Math.abs(new Date(m.date).getTime() - date) < 24 * 60 * 60 * 1000
      );
      
      if (!isDuplicate) {
        result.push(msg);
      }
    }
    return result;
  }, [messages]);

  // Find the leader based on current points
  const sortedStats = [...memberStats].sort((a, b) => b.pts - a.pts);
  const maxPoints = Math.max(...sortedStats.map(s => s.pts), 100);

  // Lane system to prevent overlapping
  const LANES_COUNT = 8;
  const getLaneTop = (index: number) => {
    const laneHeight = 80 / LANES_COUNT;
    return 10 + (index % LANES_COUNT) * laneHeight;
  };
  
  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-stone-100 overflow-hidden transition-all duration-300 shadow-sm">
      <div 
        onClick={onToggle}
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/80 transition-colors"
      >
        <div className="flex items-center gap-2 text-stone-500">
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">家庭留言板</span>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-medium text-stone-400">
                历史: <span className="text-stone-600 font-bold">{totalMessages}</span>
              </div>
              <div className="text-[10px] font-medium text-stone-400">
                活跃: <span className="text-orange-500 font-bold">{activeMessages}</span>
              </div>
            </div>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
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
            <div className="px-6 pb-6 pt-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-[10px] font-medium text-stone-400">
                    历史弹幕: <span className="text-stone-600 font-bold">{totalMessages}</span>
                  </div>
                  <div className="text-[10px] font-medium text-stone-400">
                    活跃弹幕: <span className="text-orange-500 font-bold">{activeMessages}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleBullet?.(); }}
                    className={`p-2 rounded-xl transition-all shadow-sm border ${isBulletEnabled ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-stone-400 border-stone-200'}`}
                    title={isBulletEnabled ? '隐藏弹幕' : '显示弹幕'}
                  >
                    {isBulletEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowAdminTools(!showAdminTools); }}
                        className={`p-2 rounded-xl transition-all ${showAdminTools ? 'bg-indigo-50 text-indigo-600' : 'bg-stone-100 text-stone-400'}`}
                        title="管理工具"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(window.confirm('确定清空所有弹幕吗？')) onClearAll?.(); }}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                        title="清空弹幕"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="text-[10px] font-bold text-stone-400 bg-stone-50 px-3 py-1 rounded-full border border-stone-100">
                    实时同步中
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isAdmin && showAdminTools && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                        <Shield className="w-3 h-3" />
                        管理员批量删除工具
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex gap-2">
                          <select 
                            value={deleteRole}
                            onChange={e => setDeleteRole(e.target.value)}
                            className="flex-grow px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs outline-none"
                          >
                            <option value="">按角色选择...</option>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button 
                            onClick={() => {
                              if(!deleteRole) return;
                              const ids = messages.filter(m => m.user === deleteRole).map(m => m.id);
                              if(ids.length > 0 && window.confirm(`确定删除 ${deleteRole} 的所有 ${ids.length} 条弹幕吗？`)) {
                                onDeleteMessage?.(ids);
                                setDeleteRole('');
                              }
                            }}
                            className="px-3 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                            disabled={!deleteRole}
                          >
                            删除该角色
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="date"
                            value={deleteDate}
                            onChange={e => setDeleteDate(e.target.value)}
                            className="flex-grow px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs outline-none"
                          />
                          <button 
                            onClick={() => {
                              if(!deleteDate) return;
                              const ids = messages.filter(m => m.date.startsWith(deleteDate)).map(m => m.id);
                              if(ids.length > 0 && window.confirm(`确定删除 ${deleteDate} 当天的所有 ${ids.length} 条弹幕吗？`)) {
                                onDeleteMessage?.(ids);
                                setDeleteDate('');
                              } else if(ids.length === 0) {
                                alert('该日期没有弹幕');
                              }
                            }}
                            className="px-3 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                            disabled={!deleteDate}
                          >
                            删除该日期
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-stone-50 rounded-[2rem] p-1 shadow-inner overflow-hidden relative h-64 mb-6 border border-stone-100">
                <div className="absolute inset-0" style={{ 
                  backgroundImage: 'url("https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1000&auto=format&fit=crop")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.05
                }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent"></div>
                
                <div className="absolute inset-0 flex items-end pointer-events-none px-8 pb-12">
                  <div className="flex justify-around items-end w-full h-full">
                    {sortedStats.map((member, index) => {
                      // Ensure visibility and leave room for avatar (max 55% height to avoid cutoff)
                      const percent = Math.min(Math.max((member.pts / (maxPoints || 1)) * 55, 15), 55);
                      const isLeader = index === 0 && member.pts > 0;
                      
                      return (
                        <div key={member.role} className="relative h-full w-16 flex flex-col justify-end items-center">
                          <motion.div 
                            initial={{ height: '0%' }}
                            animate={{ height: `${percent}%` }}
                            transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                            className={`w-2 rounded-t-full absolute bottom-0 ${isLeader ? 'bg-orange-400' : 'bg-stone-200'}`}
                          />
                          <motion.div
                            initial={{ bottom: '0%' }}
                            animate={{ bottom: `${percent}%` }}
                            transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                            className="absolute mb-2 flex flex-col items-center"
                          >
                            <div className="relative">
                              <UserAvatar 
                                role={member.role} 
                                profiles={profiles} 
                                className={`w-10 h-10 text-sm border-2 shadow-md ${isLeader ? 'border-orange-400' : 'border-white'}`} 
                              />
                              {isLeader && (
                                <div className="absolute -top-3 -right-1 text-lg">👑</div>
                              )}
                            </div>
                            <div className={`mt-1.5 text-xs font-black px-2 py-0.5 rounded-full shadow-sm ${isLeader ? 'bg-orange-500 text-white' : 'bg-stone-700 text-white'}`}>
                              {member.pts}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="absolute inset-0 overflow-hidden">
                  <AnimatePresence>
                    {isBulletEnabled && aggregatedMessages.filter(msg => {
                      if (!msg.duration || msg.duration === -1) return true;
                      return (new Date(msg.date).getTime() + msg.duration) > Date.now();
                    }).slice(-20).map((msg, i) => {
                      const laneIndex = i % LANES_COUNT;
                      const top = getLaneTop(laneIndex);
                      const isLeader = sortedStats[0] && sortedStats[0].role === msg.user && sortedStats[0].pts > 0;

                      return (
                        <DanmakuItem 
                          key={msg.id}
                          msg={msg}
                          profiles={profiles}
                          isLeader={isLeader}
                          isAdmin={isAdmin}
                          onDeleteMessage={onDeleteMessage}
                          i={i}
                          laneIndex={laneIndex}
                          top={top}
                        />
                      );
                    })}
                  </AnimatePresence>
                  {messages.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm">
                      暂无弹幕，快来发送第一条！
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && input.trim() && (onSend(input, undefined, selectedColor, selectedFontSize, undefined, selectedSpeed, selectedEffect.join(','), selectedDuration), setInput(''))}
                    placeholder={currentUser ? `作为 ${currentUser} 发送留言...` : "请先登录"}
                    disabled={!currentUser}
                    className="w-full pl-4 pr-12 py-3 bg-stone-50 border border-stone-100 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-inner"
                  />
                  <button 
                    onClick={() => setShowPicker(!showPicker)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-orange-500 transition-colors"
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => {
                    if (input.trim()) {
                      onSend(input, undefined, selectedColor, selectedFontSize, undefined, selectedSpeed, selectedEffect.join(','), selectedDuration);
                      setInput('');
                    }
                  }}
                  disabled={!currentUser || !input.trim()}
                  className="px-6 py-3 bg-stone-900 text-white rounded-2xl text-sm font-bold hover:bg-stone-800 transition-all disabled:opacity-50 shadow-md active:scale-95"
                >
                  发送
                </button>
              </div>

              <AnimatePresence>
                {showPicker && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4"
                  >
                    <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {MESSAGE_COLORS.map(color => (
                          <button 
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-stone-900 scale-110' : 'border-white'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">字体大小</label>
                          <div className="flex gap-1">
                            {['0.7rem', '0.9rem', '1.2rem'].map(size => (
                              <button 
                                key={size}
                                onClick={() => setSelectedFontSize(size)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedFontSize === size ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}
                              >
                                {size === '0.7rem' ? '小' : size === '0.9rem' ? '中' : '大'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">移动速度</label>
                          <div className="flex gap-1">
                            {[15, 10, 6].map(speed => (
                              <button 
                                key={speed}
                                onClick={() => setSelectedSpeed(speed)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedSpeed === speed ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}
                              >
                                {speed === 15 ? '慢' : speed === 10 ? '中' : '快'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">显示时长</label>
                          <div className="flex gap-1">
                            {[10000, 3600000, 24 * 3600000, -1].map(dur => (
                              <button 
                                key={dur}
                                onClick={() => setSelectedDuration(dur)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedDuration === dur ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}
                              >
                                {dur === 10000 ? '10秒' : dur === 3600000 ? '1小时' : dur === -1 ? '永久' : '1天'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5 w-full">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">弹幕特效 (可多选)</label>
                          <div className="flex flex-wrap gap-1">
                            {['default', 'blink', 'ghost', 'zoom', 'pulse', 'bounce', 'rotate', 'shake', 'flip', 'wave', 'float', 'skew', 'blur', 'neon', 'fire', 'ice', 'rainbow', 'glitch'].map(eff => (
                              <button 
                                key={eff}
                                onClick={() => {
                                  if (eff === 'default') {
                                    setSelectedEffect(['default']);
                                  } else {
                                    const newEffs = selectedEffect.includes(eff) 
                                      ? selectedEffect.filter(e => e !== eff) 
                                      : [...selectedEffect.filter(e => e !== 'default'), eff];
                                    setSelectedEffect(newEffs.length === 0 ? ['default'] : newEffs);
                                  }
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedEffect.includes(eff) ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-stone-500 border-stone-200'}`}
                              >
                                {DANMAKU_EFFECT_LABELS[eff] || eff}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [goalComments, setGoalComments] = useState<GoalComment[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [achs, setAchs] = useState<Achievement[]>([]);
  const [rewards, setRewards] = useState<Reward[]>(DEFAULT_REWARDS);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginRole, setLoginRole] = useState<string | null>(null);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [profilesTableMissing, setProfilesTableMissing] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isActivitiesExpanded, setIsActivitiesExpanded] = useState(false);
  const [isWeeklyGrowthExpanded, setIsWeeklyGrowthExpanded] = useState(false);
  const [activitiesTableMissing, setActivitiesTableMissing] = useState(false);
  const [showDanmakuBoard, setShowDanmakuBoard] = useState(true);

  const addActivity = async (type: ActivityType, content: string, metadata?: any, userOverride?: string) => {
    const user = userOverride || currentUser;
    if (!user) return;
    
    const newActivity: Activity = {
      id: generateId(),
      user,
      type,
      content,
      date: new Date().toISOString(),
      metadata
    };
    
    // Optimistic update
    setActivities(prev => {
      if (prev.some(a => a.id === newActivity.id)) return prev;
      return [newActivity, ...prev].slice(0, 50);
    });
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('activities').insert({
          id: newActivity.id,
          user_name: newActivity.user,
          type: newActivity.type,
          content: newActivity.content,
          date: newActivity.date,
          metadata: newActivity.metadata
        });
        if (error && error.message?.includes('relation "activities" does not exist')) {
          setActivitiesTableMissing(true);
        }
      } catch (e) {
        console.error('Failed to save activity:', e);
      }
    }
  };

  // Load initial data
  useEffect(() => {
    const migrateData = async () => {
      const isMigrated = localStorage.getItem('family_goals_migrated');
      if (isMigrated === 'true') return;

      // Use a session-based lock to prevent multiple tabs from migrating at the same time
      const migrationLock = sessionStorage.getItem('migration_in_progress');
      if (migrationLock) return;
      sessionStorage.setItem('migration_in_progress', 'true');

      console.log('Starting data migration/sync...');
      try {
        const getLocalData = (key: string, fallback: string = '[]') => {
          try {
            return JSON.parse(localStorage.getItem(key) || fallback);
          } catch (e) {
            console.error(`Error parsing local storage key: ${key}`, e);
            return JSON.parse(fallback);
          }
        };

        const localGoals = getLocalData(STORAGE_KEY);
        const localTxs = getLocalData(TX_KEY);
        const localAchs = getLocalData(ACH_KEY);
        const localCheckIns = getLocalData(CHECKIN_KEY);
        const localRewards = getLocalData(REWARDS_KEY, 'null');

        const migrationPromises = [];

        if (localGoals.length > 0) {
          const mappedGoals = localGoals.map((g: any) => ({
            id: g.id, name: g.name, description: g.description, start_date: g.startDate,
            end_date: g.endDate, progress: g.progress, creator: g.creator || '爸爸',
            assignees: g.assignees || (g.assignee ? [g.assignee] : ['爸爸']),
            assignee: g.assignee, signature: g.signature || '', priority: g.priority || '中',
            completed_at: g.completedAt, confirmations: g.confirmations || {}
          }));
          migrationPromises.push(supabase.from('goals').upsert(mappedGoals, { onConflict: 'id' }));
        }

        if (localTxs.length > 0) {
          migrationPromises.push(supabase.from('transactions').upsert(localTxs, { onConflict: 'id' }));
        }

        if (localAchs.length > 0) {
          const mappedAchs = localAchs.map((a: any) => ({
            id: a.id, member: a.member, ach_id: a.achId, date: a.date
          }));
          migrationPromises.push(supabase.from('achievements').upsert(mappedAchs, { onConflict: 'id' }));
        }

        if (localCheckIns.length > 0) {
          const mappedCheckIns = localCheckIns.map((c: any) => ({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            member: c.member, date: c.date
          }));
          migrationPromises.push(supabase.from('checkins').upsert(mappedCheckIns, { onConflict: 'id' }));
        }

        if (localRewards && localRewards.length > 0) {
          const mappedRewards = localRewards.map((r: any) => ({
            id: r.id, name: r.name, cost: r.cost, description: r.description,
            is_active: r.isActive, is_custom: r.isCustom, icon_name: r.iconName
          }));
          migrationPromises.push(supabase.from('rewards').upsert(mappedRewards, { onConflict: 'id' }));
        }

        if (migrationPromises.length > 0) {
          await Promise.all(migrationPromises);
        }
        
        // Insert default profiles if not exist
        const profilesRes = await supabase.from('profiles').select('role');
        if (!profilesRes.error) {
            const existingProfiles = profilesRes.data;
            const existingRoles = existingProfiles?.map(p => p.role) || [];
            const missingRoles = ROLES.filter(r => !existingRoles.includes(r));
            
            if (missingRoles.length > 0) {
                await supabase.from('profiles').insert(missingRoles.map(r => ({ role: r, pin: '1183' })));
            }
        }

        safeSetItem('family_goals_migrated', 'true');
      } catch (e) {
        console.error('Migration failed', e);
      } finally {
        sessionStorage.removeItem('migration_in_progress');
      }
    };

    const loadData = async () => {
      // SWR Strategy: Load from cache first for instant UI
      const cachedGoals = localStorage.getItem('cache_goals');
      const cachedTxs = localStorage.getItem('cache_txs');
      const cachedAchs = localStorage.getItem('cache_achs');
      const cachedRewards = localStorage.getItem('cache_rewards');
      const cachedMsgs = localStorage.getItem('cache_msgs');
      const cachedProfiles = localStorage.getItem('cache_profiles');
      const cachedGoalComments = localStorage.getItem('cache_goal_comments');

      if (cachedGoals) {
        setGoals(JSON.parse(cachedGoals));
        setLoading(false); // If we have cache, we can stop the "blocking" loading state
      } else {
        setLoading(true);
      }
      
      if (cachedTxs) setTxs(JSON.parse(cachedTxs));
      if (cachedAchs) setAchs(JSON.parse(cachedAchs));
      if (cachedRewards) setRewards(JSON.parse(cachedRewards));
      if (cachedMsgs) setMessages(JSON.parse(cachedMsgs));
      if (cachedProfiles) setProfiles(JSON.parse(cachedProfiles));
      if (cachedGoalComments) setGoalComments(JSON.parse(cachedGoalComments));

      try {
        // Fetch fresh data in background
        const goalsPromise = supabase.from('goals').select('*');
        const txsPromise = supabase.from('transactions').select('*').order('date', { ascending: false }).limit(200);
        const achsPromise = supabase.from('achievements').select('*');
        const rewardsPromise = supabase.from('rewards').select('*');
        const msgsPromise = supabase.from('messages').select('*').order('date', { ascending: false }).limit(50);
        const profilesPromise = supabase.from('profiles').select('*');
        const goalCommentsPromise = supabase.from('goal_comments').select('*').order('date', { ascending: true });

        const [goalsRes, txsRes, achsRes, rewardsRes, msgsRes, profilesRes, goalCommentsRes, activitiesRes] = await Promise.all([
            goalsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            txsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            achsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            rewardsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            msgsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            profilesPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            goalCommentsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            supabase.from('activities').select('*').order('date', { ascending: false }).limit(50).then(res => res, (e: any) => ({ data: null, error: e }))
        ]);

        if (profilesRes.error && (profilesRes.error as any).code === '42P01') {
          setProfilesTableMissing(true);
        }
        if (activitiesRes.error && (activitiesRes.error as any).code === '42P01') {
          setActivitiesTableMissing(true);
        }

        if (activitiesRes.data) {
          const freshActs = (activitiesRes.data as any[]).map(a => ({
            id: a.id, user: a.user_name, type: a.type as ActivityType, content: a.content, date: a.date, metadata: a.metadata
          }));
          setActivities(freshActs);
          
          // If no activities found and user is logged in, add a welcome activity
          if (freshActs.length === 0 && currentUser) {
            addActivity('login', '欢迎回来！系统已就绪。');
          }
        }

        if (goalsRes.data) {
          console.log('Loaded goals:', goalsRes.data);
          const freshGoals = (goalsRes.data as any[]).map((g: any) => ({
            id: g.id, name: g.name, description: g.description, startDate: g.start_date,
            endDate: g.end_date, progress: g.progress, creator: g.creator,
            assignees: g.assignees, assignee: g.assignee, signature: g.signature,
            priority: g.priority, completedAt: g.completed_at, confirmations: g.confirmations,
            type: g.type || 'family'
          }));
          setGoals(freshGoals);
          safeSetItem('cache_goals', JSON.stringify(freshGoals));
        }

        if (txsRes.data) {
          const freshTxs = (txsRes.data as any[]).reverse();
          setTxs(freshTxs);
          safeSetItem('cache_txs', JSON.stringify(freshTxs));
        }
        
        if (achsRes.data) {
          const freshAchs = (achsRes.data as any[]).map(a => ({
            id: a.id, member: a.member, achId: a.ach_id, date: a.date
          }));
          setAchs(freshAchs);
          safeSetItem('cache_achs', JSON.stringify(freshAchs));
        }

        if (rewardsRes.data && rewardsRes.data.length > 0) {
          const freshRewards = (rewardsRes.data as any[]).map(r => ({
            id: r.id, name: r.name, cost: r.cost, description: r.description,
            isActive: r.is_active, isCustom: r.is_custom, iconName: r.icon_name,
            targetType: r.target_type || 'personal'
          }));
          setRewards(freshRewards);
          safeSetItem('cache_rewards', JSON.stringify(freshRewards));
        }

        if (msgsRes.data) {
          const sortedMsgs = (msgsRes.data as any[]).reverse();
          const freshMsgs = sortedMsgs.map(m => {
            let extra: any = {};
            try { if (m.avatar && m.avatar.startsWith('{')) extra = JSON.parse(m.avatar); } catch(e) {}
            return {
              id: m.id, user: m.user_name, content: m.content, date: m.date, likes: m.likes,
              avatar: m.avatar, color: m.color, font_size: m.font_size,
              speed: extra.s || extra.speed, effect: extra.e || extra.effect, duration: extra.d || extra.duration
            };
          });
          setMessages(freshMsgs);
          safeSetItem('cache_msgs', JSON.stringify(freshMsgs));
        }

        if (profilesRes.data && profilesRes.data.length > 0) {
            const freshProfiles = (profilesRes.data as any[]).map(p => ({
                role: p.role, pin: p.pin, layout_config: p.layout_config || DEFAULT_LAYOUT, avatar_url: p.avatar_url
            }));
            setProfiles(freshProfiles);
            safeSetItem('cache_profiles', JSON.stringify(freshProfiles));
        } else if (profilesRes.data && profilesRes.data.length === 0) {
            const initialProfiles = ROLES.map(role => ({ role, pin: '1183' }));
            await supabase.from('profiles').insert(initialProfiles);
            setProfiles(initialProfiles.map(p => ({ ...p, layout_config: DEFAULT_LAYOUT, avatar_url: null })));
        }

        if (goalCommentsRes.data) {
          const freshComments = (goalCommentsRes.data as any[]).map(c => ({
            id: c.id, goal_id: c.goal_id, user: c.user, content: c.content, date: c.date
          }));
          setGoalComments(freshComments);
          safeSetItem('cache_goal_comments', JSON.stringify(freshComments));
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

  // Data Repair Effect
  useEffect(() => {
    const runRepair = async () => {
      if (!isSupabaseConfigured) return;
      
      const lastRepair = localStorage.getItem('last_data_repair_v4');
      const now = new Date().getTime();
      
      // Run repair if not run in the last 5 minutes
      if (!lastRepair || now - parseInt(lastRepair) > 300000) {
        console.log('Starting data repair v4...');
        
        // 1. Repair Transactions
        const { data: allTxs } = await supabase.from('transactions').select('*');
        if (allTxs) {
          const seen = new Set();
          const toDelete = [];
          const sortedTxs = [...allTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          for (const tx of sortedTxs) {
            let key = '';
            if (tx.reason.startsWith('完成目标:')) {
              // Extract goal name to prevent duplicates even if reason suffix differs
              const goalNameMatch = tx.reason.match(/完成目标: ([^(\n]+)/);
              const goalName = goalNameMatch ? goalNameMatch[1].trim() : tx.reason;
              key = `goal-${tx.member}-${goalName}`;
            } else if (tx.reason.includes('登录奖励')) {
              const dateStr = new Date(tx.date).toISOString().split('T')[0];
              key = `login-${tx.member}-${dateStr}`;
            } else if (tx.reason.includes('弹幕奖励') || tx.reason.includes('留言奖励')) {
              // For danmaku/comments, we allow multiple but limit per day
              // This repair is more complex, let's skip for now unless specifically requested
              continue;
            } else {
              continue;
            }

            if (seen.has(key)) {
              toDelete.push(tx.id);
            } else {
              seen.add(key);
            }
          }
          
          if (toDelete.length > 0) {
            console.log(`Deleting ${toDelete.length} duplicate transactions...`);
            for (let i = 0; i < toDelete.length; i += 100) {
              await supabase.from('transactions').delete().in('id', toDelete.slice(i, i + 100));
            }
          }
        }

        // 2. Repair Activities
        const { data: allActs } = await supabase.from('activities').select('*');
        if (allActs) {
          const seenActs = new Set();
          const actsToDelete = [];
          const sortedActs = [...allActs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          for (const act of sortedActs) {
            let key = '';
            if (act.type === 'goal_completed') {
              const goalNameMatch = act.content.match(/完成了目标: ([^(\n]+)/);
              const goalName = goalNameMatch ? goalNameMatch[1].trim() : act.content;
              key = `act-goal-${goalName}`; // One activity per goal completion
            } else if (act.type === 'login') {
              const dateStr = new Date(act.date).toISOString().split('T')[0];
              key = `act-login-${act.user}-${dateStr}`;
            } else {
              continue;
            }

            if (seenActs.has(key)) {
              actsToDelete.push(act.id);
            } else {
              seenActs.add(key);
            }
          }
          
          if (actsToDelete.length > 0) {
            console.log(`Deleting ${actsToDelete.length} duplicate activities...`);
            for (let i = 0; i < actsToDelete.length; i += 100) {
              await supabase.from('activities').delete().in('id', actsToDelete.slice(i, i + 100));
            }
          }
        }
        
        localStorage.setItem('last_data_repair_v4', now.toString());
        console.log('Data repair v4 completed.');
      }
    };
    
    runRepair();
  }, [isSupabaseConfigured]);

  // Auto-complete goals if all required confirmers have confirmed (handles existing data)
  useEffect(() => {
    if (!loading && goals.length > 0) {
      const pendingAutoCompletes = goals.filter(goal => {
        if (goal.progress >= 100 && goal.completedAt) return false;
        const assignees = goal.assignees || (goal.assignee ? [goal.assignee] : []);
        const requiredConfirmers = assignees.length > 0 ? assignees : ['爸爸'];
        const confirmations = goal.confirmations || {};
        return requiredConfirmers.every(r => confirmations[r]);
      });

      if (pendingAutoCompletes.length > 0) {
        pendingAutoCompletes.forEach(goal => {
          handleConfirmCompletion(goal.id, Object.keys(goal.confirmations || {})[0] || '系统');
        });
      }
    }
  }, [goals, loading]);



  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase.channel('db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, payload => {
        if (payload.eventType === 'INSERT') {
          const g = payload.new;
          setGoals(prev => {
            if (prev.some(p => p.id === g.id)) return prev;
            return [...prev, {
              id: g.id, name: g.name, description: g.description, startDate: g.start_date,
              endDate: g.end_date, progress: g.progress, creator: g.creator,
              assignees: g.assignees, assignee: g.assignee, signature: g.signature,
              priority: g.priority, completedAt: g.completed_at, confirmations: g.confirmations,
              type: g.type || 'family'
            }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const g = payload.new;
          setGoals(prev => prev.map(p => p.id === g.id ? {
            id: g.id, name: g.name, description: g.description, startDate: g.start_date,
            endDate: g.end_date, progress: g.progress, creator: g.creator,
            assignees: g.assignees, assignee: g.assignee, signature: g.signature,
            priority: g.priority, completedAt: g.completed_at, confirmations: g.confirmations,
            type: g.type || 'family'
          } : p));
        } else if (payload.eventType === 'DELETE') {
          setGoals(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goal_comments' }, payload => {
        if (payload.eventType === 'INSERT') {
          const c = payload.new;
          setGoalComments(prev => {
            if (prev.some(p => p.id === c.id)) return prev;
            return [...prev, {
              id: c.id, goal_id: c.goal_id, user: c.user, content: c.content, date: c.date
            }];
          });
        } else if (payload.eventType === 'DELETE') {
          setGoalComments(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => {
        setTxs(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          const newList = [...prev, payload.new as Transaction];
          // Keep only last 1000 transactions in state to prevent memory issues
          return newList.length > 1000 ? newList.slice(-1000) : newList;
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'achievements' }, payload => {
        setAchs(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          return [...prev, {
            id: payload.new.id, member: payload.new.member, achId: payload.new.ach_id, date: payload.new.date
          }];
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, payload => {
        if (payload.eventType === 'INSERT') {
          const r = payload.new;
          setRewards(prev => {
            if (prev.some(p => p.id === r.id)) return prev;
            return [...prev, {
              id: r.id, name: r.name, cost: r.cost, description: r.description,
              isActive: r.is_active, isCustom: r.is_custom, iconName: r.icon_name,
              targetType: r.target_type || 'personal'
            }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const r = payload.new;
          setRewards(prev => prev.map(p => p.id === r.id ? {
            id: r.id, name: r.name, cost: r.cost, description: r.description,
            isActive: r.is_active, isCustom: r.is_custom, iconName: r.icon_name,
            targetType: r.target_type || 'personal'
          } : p));
        } else if (payload.eventType === 'DELETE') {
          setRewards(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (payload.eventType === 'INSERT') {
          const m = payload.new;
          setMessages(prev => {
            if (prev.some(p => p.id === m.id)) return prev;
            
            let extra: any = {};
            try {
              if (m.avatar && m.avatar.startsWith('{')) {
                extra = JSON.parse(m.avatar);
              }
            } catch(e) {}

            const newMsg = {
              id: m.id,
              user: m.user_name,
              content: m.content,
              date: m.date,
              likes: m.likes,
              avatar: m.avatar,
              color: m.color,
              font_size: m.font_size,
              speed: extra.s || extra.speed,
              effect: extra.e || extra.effect,
              duration: extra.d || extra.duration
            };
            const newList = [...prev, newMsg];
            // Keep only last 200 messages in state to prevent memory issues
            return newList.length > 200 ? newList.slice(-200) : newList;
          });
        } else if (payload.eventType === 'UPDATE') {
          const m = payload.new;
          setMessages(prev => prev.map(p => p.id === m.id ? {
            ...p,
            likes: m.likes,
            content: m.content,
            user: m.user_name
          } : p));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = payload.new;
            setProfiles(prev => {
                const idx = prev.findIndex(pr => pr.role === p.role);
                const newProfile = { 
                    role: p.role, 
                    pin: p.pin, 
                    layout_config: p.layout_config || DEFAULT_LAYOUT,
                    avatar_url: p.avatar_url
                };
                if (idx >= 0) {
                    const newProfiles = [...prev];
                    newProfiles[idx] = newProfile;
                    return newProfiles;
                }
                return [...prev, newProfile];
            });
            // Note: We use a ref or check state inside the setter to avoid closure issues
            // But for layout, we'll handle it in a separate useEffect watching profiles
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, payload => {
        setActivities(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          const newAct = {
            id: payload.new.id,
            user: payload.new.user_name,
            type: payload.new.type as ActivityType,
            content: payload.new.content,
            date: payload.new.date,
            metadata: payload.new.metadata
          };
          return [newAct, ...prev].slice(0, 50);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Automatic Login Points
  useEffect(() => {
    if (currentUser && txs.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const hasLoggedInToday = txs.some(t => 
        t.member === currentUser && 
        t.reason === '每日登录奖励' && 
        t.date.startsWith(today)
      );

      if (!hasLoggedInToday) {
        const awardLoginPoints = async () => {
          try {
            await supabase.from('transactions').insert({
              id: generateId(),
              member: currentUser,
              amount: 1,
              reason: '每日登录奖励',
              type: 'earned',
              date: new Date().toISOString()
            });
            showToast('每日登录奖励 +1 积分');
          } catch (e) {
            console.error('Failed to award login points:', e);
          }
        };
        awardLoginPoints();
      }
    }
  }, [currentUser, txs.length]); // Only run when user changes or txs list is first loaded

  // Sync layout when profiles change (handles real-time layout updates for current user)
  useEffect(() => {
    if (currentUser) {
      const myProfile = profiles.find(p => p.role === currentUser);
      if (myProfile && JSON.stringify(myProfile.layout_config) !== JSON.stringify(layout)) {
        setLayout(myProfile.layout_config);
      }
    }
  }, [profiles, currentUser]);

  useEffect(() => { if (currentUser) safeSetItem(CURRENT_USER_KEY, currentUser); }, [currentUser]);

  useEffect(() => {
    if (!currentUser && taskTab === 'mine') {
      setTaskTab('family');
    }
  }, [currentUser]);

  const [filter, setFilter] = useState<FilterType>('待处理');
  const [taskTab, setTaskTab] = useState<'mine' | 'family'>(currentUser ? 'mine' : 'family');
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

  const getDailyMessagePoints = (role: string) => {
    const today = new Date().toISOString().split('T')[0];
    return txs
      .filter(t => t.member === role && (t.type === 'earned' || t.type === 'earn') && t.date.startsWith(today) && t.reason === '发送留言弹幕奖励')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const memberStats = useMemo(() => {
    return ROLES.map(role => {
      const mGoals = goals.filter(g => {
        const assignees = g.assignees || (g.assignee ? [g.assignee] : []);
        return assignees.includes(role);
      });
      const active = mGoals.filter(g => g.progress < 100);
      const mTx = txs.filter(t => t.member === role);
      const earned = mTx.filter(t => t.type === 'earned' || t.type === 'earn').reduce((s, t) => s + t.amount, 0);
      const redeemed = mTx.filter(t => t.type === 'redeemed' || t.type === 'redeem').reduce((s, t) => s + t.amount, 0);
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

  const familyStats = useMemo(() => {
    const totalEarned = txs.filter(t => t.type === 'earned' || t.type === 'earn').reduce((sum, t) => sum + t.amount, 0);
    const totalRedeemed = txs.filter(t => t.member === '家庭' && (t.type === 'redeemed' || t.type === 'redeem')).reduce((sum, t) => sum + t.amount, 0);
    return { earned: totalEarned, redeemed: totalRedeemed, pts: totalEarned - totalRedeemed };
  }, [txs]);

  const nextFamilyReward = useMemo(() => {
    const familyRewards = rewards.filter(r => r.isActive && r.targetType === 'family').sort((a, b) => a.cost - b.cost);
    const next = familyRewards.find(r => r.cost > familyStats.pts);
    return next || familyRewards[familyRewards.length - 1] || { cost: 1000, name: '神秘大奖' };
  }, [rewards, familyStats.pts]);

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

  const handleUpdateProgress = async (id: string, progress: number) => {
    // Optimistic Update
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress } : g));
    
    try {
      const { error } = await supabase.from('goals').update({ progress }).eq('id', id);
      if (error) throw error;
      showToast('进度已更新');
    } catch (e) {
      console.error(e);
      showToast('更新失败，请重试', 'error');
      // Rollback would be here
    }
  };

  const handleAddGoalComment = async (goalId: string, content: string, image?: string, replyTo?: string) => {
    if (!currentUser) return;
    const newCommentId = generateId();
    const newCommentDate = new Date().toISOString();
    const newCommentObj: GoalComment = {
      id: newCommentId,
      goal_id: goalId,
      user: currentUser,
      content,
      date: newCommentDate,
      image,
      replyTo
    };

    // Optimistic Update
    setGoalComments(prev => [...prev, newCommentObj]);

    try {
      const { error } = await supabase.from('goal_comments').insert({
        id: newCommentId,
        goal_id: goalId,
        user: currentUser,
        content,
        date: newCommentDate
      });
      if (error) throw error;
      
      // Award 1 point, max 10 per day for comments
      const today = new Date().toISOString().split('T')[0];
      const dailyPoints = txs
        .filter(t => t.member === currentUser && t.reason === '任务留言奖励' && t.date.startsWith(today))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const earnedPoints = dailyPoints < 10;
      addActivity('danmaku', `在任务讨论中留言: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}${earnedPoints ? ' (+1 积分)' : ''}`);

      if (earnedPoints) {
        await supabase.from('transactions').insert({
          id: generateId(),
          member: currentUser,
          amount: 1,
          reason: '任务留言奖励',
          type: 'earned',
          date: new Date().toISOString()
        });
        showToast('留言成功，积分 +1');
      } else {
        showToast('留言成功 (今日留言积分已达上限)');
      }
    } catch (e) {
      console.error('Comment failed:', e);
      showToast('留言失败', 'error');
      // Rollback
      setGoalComments(prev => prev.filter(c => c.id !== newCommentId));
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
      const goalAssignees = Array.from(new Set((goal.assignees || (goal.assignee ? [goal.assignee] : [])).filter(Boolean)));
      const requiredConfirmers = goalAssignees.length > 0 ? goalAssignees : ['爸爸'];
      const allConfirmed = requiredConfirmers.every(r => confirmations[r]);
      const updates: any = { confirmations };
      
      if (allConfirmed && !goal.completedAt) {
        // ATOMIC UPDATE: Only award points if we successfully set completed_at from null
        const { data: updateData, error: updateError } = await supabase
          .from('goals')
          .update({
            ...updates,
            completed_at: new Date().toISOString(),
            progress: 100
          })
          .eq('id', id)
          .is('completed_at', null)
          .select();

        if (updateError) throw updateError;

        // If updateData is empty, someone else already completed this goal
        if (updateData && updateData.length > 0) {
          const isEarly = new Date() < new Date(goal.endDate);
          const isTeam = goalAssignees.length > 1;
          
          // Calculate points based on new rules
          const basePoints = 10;
          const earlyPoints = isEarly ? 3 : 0;
          const teamBonus = isTeam ? 5 : 0;
          const totalPointsForTask = basePoints + earlyPoints + teamBonus;
          const pointsPerPerson = isTeam ? Math.ceil(totalPointsForTask / goalAssignees.length) : totalPointsForTask;

          const membersStr = goalAssignees.join('、');
          addActivity('goal_completed', `团队 [${membersStr}] 完成了目标: ${goal.name} (每人获得 ${pointsPerPerson} 积分)`, { goalId: id }, '系统');
          
          const newTxs: any[] = [];
          goalAssignees.forEach(m => {
            newTxs.push({ 
              id: generateId(), 
              member: m, 
              amount: pointsPerPerson, 
              reason: `完成目标: ${goal.name}${isEarly ? ' (含提前奖励)' : ''}${isTeam ? ' (团队分配)' : ''}`, 
              type: 'earned', 
              date: new Date().toISOString() 
            });
          });
          
          if (newTxs.length > 0) {
            await supabase.from('transactions').insert(newTxs);
          }
        } else {
          showToast('目标已被他人确认完成');
        }
      } else {
        // Just update confirmations
        await supabase.from('goals').update(updates).eq('id', id);
      }
      
      showToast('确认成功');
    } catch (e) {
      console.error(e);
      showToast('确认失败，请重试', 'error');
    }
  };

  const handleRedeem = async (member: string, reward: Reward) => {
    try {
      // Check if already claimed this milestone
      const alreadyClaimed = txs.some(t => t.member === member && t.reason.includes(reward.name) && t.type === 'milestone_claimed');
      if (alreadyClaimed) {
        showToast('该奖励已领取过', 'error');
        return;
      }

      const memberPts = memberStats.find(m => m.role === member)?.pts || 0;
      const familyPts = familyStats.pts;

      if (reward.targetType === 'family') {
        if (familyPts >= reward.cost) {
          const newTx = { 
            id: generateId(),
            member: '家庭', 
            amount: 0, // Milestone rewards don't deduct points
            reason: `全家里程碑达成: ${reward.name}`, 
            type: 'milestone_claimed',
            date: new Date().toISOString()
          };
          await supabase.from('transactions').insert(newTx);
          showToast(`全家达成里程碑: ${reward.name}！`);
        } else {
          showToast(`全家总积分不足 (当前: ${familyPts}/${reward.cost})`, 'error');
        }
      } else {
        if (memberPts >= reward.cost) {
          const newTx = { 
            id: generateId(),
            member: member, 
            amount: 0, // Milestone rewards don't deduct points
            reason: `个人里程碑达成: ${reward.name}`, 
            type: 'milestone_claimed',
            date: new Date().toISOString()
          };
          await supabase.from('transactions').insert(newTx);
          showToast(`恭喜获得个人奖励: ${reward.name}！`);
        } else {
          showToast(`个人积分不足 (当前: ${memberPts}/${reward.cost})`, 'error');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('领取失败，请重试', 'error');
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
    const newId = generateId();
    const uniqueAssignees = Array.from(new Set(goalData.assignees.filter(Boolean)));
    const dbGoal = {
      name: goalData.name,
      description: goalData.description,
      start_date: goalData.startDate,
      end_date: goalData.endDate,
      progress: goalData.progress,
      creator: goalData.creator,
      assignees: uniqueAssignees,
      assignee: uniqueAssignees[0] || '爸爸',
      signature: goalData.signature,
      priority: goalData.priority,
      confirmations: goalData.confirmations || {},
      type: goalData.type || (uniqueAssignees.length > 1 ? 'family' : 'personal')
    };

    const optimisticGoal: Goal = {
      ...goalData,
      assignees: uniqueAssignees,
      assignee: uniqueAssignees[0] || '爸爸',
      id: editingGoal ? editingGoal.id : newId,
      confirmations: goalData.confirmations || {}
    };

    console.log('Saving goal:', optimisticGoal);

    // Optimistic Update
    if (editingGoal) {
      setGoals(prev => prev.map(g => g.id === editingGoal.id ? optimisticGoal : g));
    } else {
      setGoals(prev => [...prev, optimisticGoal]);
      addActivity('goal_created', `创建了新目标: ${goalData.name}`, { goalId: newId });
    }

    setIsModalOpen(false);
    setEditingGoal(null);

    try {
      if (editingGoal) {
        const { error } = await supabase.from('goals').update(dbGoal).eq('id', editingGoal.id);
        if (error) {
          if (error.message?.includes("'type' column")) {
            const { type, ...dbGoalNoType } = dbGoal as any;
            const { error: retryError } = await supabase.from('goals').update(dbGoalNoType).eq('id', editingGoal.id);
            if (retryError) throw retryError;
            showToast('目标已更新 (数据库缺少 type 字段，已忽略)');
          } else {
            throw error;
          }
        } else {
          showToast('目标已更新');
        }
      } else {
        const { error } = await supabase.from('goals').insert({ ...dbGoal, id: newId });
        if (error) {
          if (error.message?.includes("'type' column")) {
            const { type, ...dbGoalNoType } = dbGoal as any;
            const { error: retryError } = await supabase.from('goals').insert({ ...dbGoalNoType, id: newId });
            if (retryError) throw retryError;
            showToast('新目标创建成功 (数据库缺少 type 字段，已忽略)');
          } else {
            console.error('Supabase insert error:', error);
            throw error;
          }
        } else {
          showToast('新目标创建成功');
        }
      }
    } catch (e: any) {
      console.error('Save goal failed:', e);
      showToast(`保存失败: ${e.message || '请重试'}`, 'error');
      // Rollback optimistic update
      if (!editingGoal) {
        setGoals(prev => prev.filter(g => g.id !== newId));
      }
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
        const { error } = await supabase.from('goals').upsert(mappedGoals, { onConflict: 'id' });
        if (error) throw error;
        restoredCount += localGoals.length;
      }

      if (localTxs.length > 0) {
        const { error } = await supabase.from('transactions').upsert(localTxs, { onConflict: 'id' });
        if (error) throw error;
        restoredCount += localTxs.length;
      }

      if (localAchs.length > 0) {
        const mappedAchs = localAchs.map((a: any) => ({
          id: a.id, member: a.member, ach_id: a.achId, date: a.date
        }));
        const { error } = await supabase.from('achievements').upsert(mappedAchs, { onConflict: 'id' });
        if (error) throw error;
        restoredCount += localAchs.length;
      }
      
      if (localCheckIns.length > 0) {
          const mappedCheckIns = localCheckIns.map((c: any) => ({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            member: c.member, date: c.date
          }));
          const { error } = await supabase.from('checkins').upsert(mappedCheckIns, { onConflict: 'id' });
          if (error) throw error;
          restoredCount += localCheckIns.length;
      }

      if (localRewards && localRewards.length > 0) {
        const mappedRewards = localRewards.map((r: any) => ({
          id: r.id, name: r.name, cost: r.cost, description: r.description,
          is_active: r.isActive, is_custom: r.isCustom, icon_name: r.iconName,
          target_type: r.targetType || 'personal'
        }));
        const { error } = await supabase.from('rewards').upsert(mappedRewards, { onConflict: 'id' });
        if (error) throw error;
        restoredCount += localRewards.length;
      }

      if (restoredCount === 0) {
        showToast('本地缓存中没有找到数据', 'error');
      } else {
        showToast(`成功恢复 ${restoredCount} 条记录，页面即将刷新`);
        safeSetItem('family_goals_migrated', 'true');
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
      icon_name: rewardData.iconName,
      target_type: rewardData.targetType,
      role: rewardData.role
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

  const handleAddMessage = async (content: string, avatar?: string, color?: string, fontSize?: string, emoji?: string, speed?: number, effect?: string, duration?: number) => {
    if (!currentUser) return;

    // Aggregation logic: check for duplicate content in last 5 seconds
    const recentDuplicate = messages.find(m => 
      m.content.trim() === content.trim() && 
      (Date.now() - new Date(m.date).getTime()) < 5000
    );

    if (recentDuplicate) {
      showToast('弹幕聚合中...', 'success');
      return;
    }
    
    // Serialize extra fields into avatar since we can't alter DB schema easily
    const extraData = JSON.stringify({ s: speed, e: effect, d: duration });
    
    const newMsg = {
      id: generateId(),
      user_name: currentUser,
      content,
      date: new Date().toISOString(),
      likes: 0,
      avatar: extraData,
      color,
      font_size: fontSize || '0.9rem'
    };
    
    // Optimistic update
    setMessages(prev => [...prev, {
        id: newMsg.id,
        user: newMsg.user_name,
        content: newMsg.content,
        date: newMsg.date,
        likes: newMsg.likes,
        avatar: newMsg.avatar,
        color: newMsg.color,
        font_size: newMsg.font_size,
        speed,
        effect,
        duration
    }]);
    
    try {
        const { error } = await supabase.from('messages').insert(newMsg);
        if (error) throw error;

        // Award 1 point for sending a message, respecting daily limit
        const currentDaily = getDailyMessagePoints(currentUser);
        const earnedPoints = currentDaily < 10;
        addActivity('danmaku', `发布了弹幕: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}${earnedPoints ? ' (+1 积分)' : ''}`);

        if (earnedPoints) {
            await supabase.from('transactions').insert({
                id: generateId(),
                member: currentUser,
                amount: 1,
                type: 'earned',
                reason: '发送留言弹幕奖励',
                date: new Date().toISOString()
            });
            showToast('留言已发布，积分 +1');
        } else {
            showToast('留言已发布 (今日留言积分已达上限)');
        }
    } catch (e) {
        console.error('Message send failed:', e);
        showToast('发送失败', 'error');
        setMessages(prev => prev.filter(m => m.id !== newMsg.id));
    }
  };

  const handleLikeMessage = async (id: string) => {
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === id ? { ...m, likes: m.likes + 1 } : m));
    
    try {
        await supabase.from('messages').update({ likes: msg.likes + 1 }).eq('id', id);
    } catch (e) {
        console.error(e);
    }
  };

  const handleClearAllMessages = async () => {
    try {
      const { error } = await supabase.from('messages').delete().neq('id', '0');
      if (error) throw error;
      showToast('所有弹幕已清空');
    } catch (e) {
      console.error(e);
      showToast('清空失败', 'error');
    }
  };

  const handleDeleteMessage = async (id: string | string[]) => {
    try {
      const ids = Array.isArray(id) ? id : [id];
      const { error } = await supabase.from('messages').delete().in('id', ids);
      if (error) throw error;
      
      // Optimistic update
      setMessages(prev => prev.filter(m => !ids.includes(m.id)));
      showToast(ids.length > 1 ? `已删除 ${ids.length} 条弹幕` : '弹幕已删除');
    } catch (e) {
      console.error(e);
      showToast('删除失败', 'error');
    }
  };

  const [isBulletEnabled, setIsBulletEnabled] = useState(true);

  const handleUpdateProfilePin = async (role: string, newPin: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ pin: newPin })
      .eq('role', role);
    
    if (error) {
      console.error('Error updating PIN:', error);
      showToast('更新PIN码失败', 'error');
    } else {
      setProfiles(prev => prev.map(p => p.role === role ? { ...p, pin: newPin } : p));
      showToast(`${role} 的PIN码已更新`);
    }
  };

  const handleUpdateAvatar = async (role: string, avatarUrl: string) => {
    try {
      // 尝试使用 upsert 更新或插入
      const { error } = await supabase
        .from('profiles')
        .upsert({ role, avatar_url: avatarUrl }, { onConflict: 'role' });
      
      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(error.message || '数据库写入失败');
      }
      
      // 成功后更新本地状态
      setProfiles(prev => prev.map(p => p.role === role ? { ...p, avatar_url: avatarUrl } : p));
      
      showToast('头像已更新');
      setIsSettingsModalOpen(false);
    } catch (err: any) {
      console.error('Full error object:', err);
      // 显示具体的错误原因，方便排查
      const errorMsg = err.message || '未知错误';
      showToast(`更新失败: ${errorMsg}`, 'error');
    }
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
    if (filter === '待处理') return g.progress < 100 || !g.completedAt;
    if (filter === '已完成') return g.progress >= 100 && g.completedAt;
    return true;
  }).sort((a, b) => {
    // 1. Completed tasks at the very bottom
    const aDone = a.progress >= 100 && a.completedAt;
    const bDone = b.progress >= 100 && b.completedAt;
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;

    // 2. Current user's tasks first
    const aIsMine = currentUser ? (a.assignees?.includes(currentUser) || a.assignee === currentUser) : false;
    const bIsMine = currentUser ? (b.assignees?.includes(currentUser) || b.assignee === currentUser) : false;
    if (aIsMine && !bIsMine) return -1;
    if (!aIsMine && bIsMine) return 1;
    
    // 3. Status priority: In Progress > Planned > Pending Confirmation
    const getStatusWeight = (g: Goal) => {
      if (g.progress > 0 && g.progress < 99) return 0; // In Progress
      if (g.progress === 0) return 1; // Planned
      if (g.progress >= 99 && !g.completedAt) return 2; // Pending Confirmation
      return 3;
    };
    const weightA = getStatusWeight(a);
    const weightB = getStatusWeight(b);
    if (weightA !== weightB) return weightA - weightB;

    // 4. Then by date (newest first)
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
    if (isNaN(dateA) || isNaN(dateB)) return 0;
    return dateB - dateA;
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

  const handleLogin = async (role: string, pin: string) => {
    console.log('Attempting login for role:', role, 'with pin:', pin);
    console.log('Current profiles count:', profiles.length);
    // For admin, use hardcoded password for now
    if (role === '管理员') {
      if (pin === 'admin123') { // Simple admin password
        console.log('Admin login successful');
        setCurrentUser('管理员');
        return true;
      }
      console.log('Admin login failed');
      return false;
    }

    // For family members, check profile pin
    const profile = profiles.find(p => p.role === role);
    if (profile) {
      console.log(`Found profile for role: ${role}`);
      console.log(`Comparing PINs: DB="${profile.pin}" (len: ${profile.pin?.length}) vs Input="${pin}" (len: ${pin?.length})`);
      
      if (profile.pin?.trim() === pin.trim()) {
        console.log('Login successful');
        setCurrentUser(role);

        // Daily Login Bonus
        try {
            const today = getLocalDateString(new Date());
            const { data: checkins } = await supabase
              .from('checkins')
              .select('*')
              .eq('member', role)
              .eq('date', today);
              
            const isFirstLogin = !checkins || checkins.length === 0;
            addActivity('login', `进入了系统${isFirstLogin ? ' (+1 积分)' : ''}`, null, role);

            if (isFirstLogin) {
              // First login today
              const checkinId = generateId();
              await supabase.from('checkins').insert({ id: checkinId, member: role, date: today });
              
              const txId = generateId();
              const bonusAmount = 1;
              await supabase.from('transactions').insert({
                id: txId,
                member: role,
                amount: bonusAmount,
                reason: '每日登录奖励',
                type: 'earned',
                date: new Date().toISOString()
              });
              showToast(`每日登录奖励 +${bonusAmount} 分`, 'success');
            }
        } catch (e) {
            console.error('Error processing daily login bonus:', e);
        }

        // Load user layout
        if (profile.layout_config) {
          setLayout(profile.layout_config);
        } else {
          setLayout(DEFAULT_LAYOUT);
        }
        return true;
      }
    }
    
    // Fallback: if no profiles loaded (e.g. table missing), allow default PIN '1183'
    if (profiles.length === 0 && pin === '1183') {
      console.log('No profiles loaded, allowing default PIN 1183');
      setCurrentUser(role);
      setLayout(DEFAULT_LAYOUT);
      return true;
    }

    console.log('Login failed: No profile found or PIN mismatch');
    return false;
  };

  const handleSaveLayout = async (newLayout: LayoutConfig) => {
    setLayout(newLayout);
    if (currentUser && currentUser !== '管理员') {
      const { error } = await supabase
        .from('profiles')
        .update({ layout_config: newLayout })
        .eq('role', currentUser);
        
      if (error) {
        console.error('Error saving layout:', error);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 font-sans text-stone-800">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Users className="w-8 h-8 text-orange-500" />
            {loading && (
              <div className="absolute -top-1 -right-1 w-5 h-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin bg-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">欢迎来到家庭目标</h1>
          <p className="text-stone-500 mb-8">请选择您的角色。注意：角色选择后将无法更改。</p>
          
          {profilesTableMissing && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm flex flex-col items-start gap-3 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">数据库连接异常</p>
                  <p>无法连接到 `profiles` 表。请确保已在 Supabase 运行 SQL 脚本。如果已运行，请尝试点击下方按钮重置本地缓存。</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  localStorage.removeItem('family_goals_migrated');
                  window.location.reload();
                }}
                className="mt-2 px-4 py-2 bg-amber-200 hover:bg-amber-300 rounded-xl font-bold transition-colors text-amber-800"
              >
                重置并刷新
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => { 
                  console.log('Role clicked:', role);
                  setLoginRole(role); 
                  setIsLoginModalOpen(true); 
                }}
                className="py-4 px-4 rounded-2xl border-2 border-stone-100 hover:border-orange-500 hover:bg-orange-50 transition-all font-medium text-lg cursor-pointer"
              >
                {role}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setLoginRole('管理员'); setIsLoginModalOpen(true); }}
            className="w-full py-4 px-4 rounded-2xl border-2 border-stone-100 hover:border-blue-500 hover:bg-blue-50 transition-all font-medium text-lg text-stone-600 hover:text-blue-600 cursor-pointer flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" />
            管理员 (可管理所有项目)
          </button>
        </motion.div>

        <AnimatePresence>
          {isLoginModalOpen && (
            <LoginModal
              isOpen={isLoginModalOpen}
              initialRole={loginRole}
              profiles={profiles}
              onLogin={handleLogin}
              onClose={() => setIsLoginModalOpen(false)}
            />
          )}
        </AnimatePresence>
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
              <span className="text-[10px] font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full tracking-normal">v2.3 好看版</span>
              {loading && (
                <div className="w-3 h-3 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin ml-1" />
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="group relative flex items-center gap-2 bg-stone-50 hover:bg-stone-100 p-1 pr-3 rounded-full border border-stone-200 transition-all cursor-pointer"
                title="个人设置"
              >
                <UserAvatar role={currentUser} profiles={profiles} className="w-8 h-8" />
                <span className="text-sm font-bold text-stone-700">{currentUser}</span>
                <Settings className="w-3.5 h-3.5 text-stone-400 group-hover:text-indigo-500 transition-colors" />
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="text-xs font-medium text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              退出
            </button>
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="p-2 text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer"
                  title="成员管理"
                >
                  <Users className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsDataModalOpen(true)}
                  className="p-2 text-stone-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors cursor-pointer"
                  title="数据管理"
                >
                  <Database className="w-5 h-5" />
                </button>
              </div>
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
          <FamilyHero familyPts={familyStats.pts} nextMilestone={nextFamilyReward.cost} nextRewardName={nextFamilyReward.name} transactions={txs} />

          {/* 2. Danmaku Board with Integrated Race Chart */}
          <DanmakuBoard 
            messages={messages} 
            onSend={handleAddMessage} 
            currentUser={currentUser} 
            profiles={profiles} 
            memberStats={memberStats} 
            isAdmin={isAdmin}
            onClearAll={handleClearAllMessages}
            onDeleteMessage={handleDeleteMessage}
            onToggleBullet={() => setIsBulletEnabled(!isBulletEnabled)}
            isBulletEnabled={isBulletEnabled}
            isExpanded={showDanmakuBoard}
            onToggle={() => setShowDanmakuBoard(!showDanmakuBoard)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RecentActivity 
              activities={activities} 
              profiles={profiles} 
              isExpanded={isActivitiesExpanded} 
              onToggle={() => setIsActivitiesExpanded(!isActivitiesExpanded)} 
              tableMissing={activitiesTableMissing}
              isAdmin={isAdmin}
            />
            <PointsDynamics 
              transactions={txs} 
              profiles={profiles} 
              isExpanded={isWeeklyGrowthExpanded}
              onToggle={() => setIsWeeklyGrowthExpanded(!isWeeklyGrowthExpanded)}
            />
          </div>

          {/* 3. Personal Dashboard (If logged in) */}
          {currentUser && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <UserAvatar role={currentUser} profiles={profiles} className="w-12 h-12 text-2xl border-2 border-white/30" />
                  <div>
                    <h3 className="font-bold text-lg">我的概览</h3>
                    <p className="text-white/80 text-xs">加油，{currentUser}！</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
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
                <Plus className="w-4 h-4" /> 新建目标
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center p-1 bg-stone-100 rounded-2xl w-full sm:w-fit">
                <button
                  onClick={() => setTaskTab('mine')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    taskTab === 'mine' 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <User className="w-4 h-4" /> 与我相关
                </button>
                <button
                  onClick={() => setTaskTab('family')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    taskTab === 'family' 
                      ? 'bg-white text-stone-800 shadow-sm' 
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <Users className="w-4 h-4" /> 家庭全部
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {(['全部', '待处理', '已完成'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      filter === f 
                        ? 'bg-stone-900 text-white shadow-lg shadow-stone-200 scale-105' 
                        : 'bg-white text-stone-500 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Grid */}
            {(() => {
              const displayGoals = taskTab === 'mine' 
                ? filteredGoals.filter(g => (g.assignees?.includes(currentUser || '') || g.assignee === currentUser))
                : filteredGoals;

              if (displayGoals.length === 0) {
                return (
                  <div className="text-center py-16 bg-white rounded-3xl border border-stone-100 border-dashed">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Target className="w-8 h-8 text-stone-300" />
                    </div>
                    <p className="text-stone-500 font-medium">暂无相关任务</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {displayGoals.map(goal => (
                      <GoalCard 
                        key={goal.id} 
                        goal={goal} 
                        currentUser={currentUser || ''}
                        profiles={profiles}
                        onUpdateProgress={(val) => handleUpdateProgress(goal.id, val)}
                        onMarkAsDone={() => handleMarkAsDone(goal.id)}
                        onConfirm={(member) => handleConfirmCompletion(goal.id, member)}
                        onEdit={() => { setEditingGoal(goal); setIsModalOpen(true); }}
                        onDelete={() => { setGoalToDelete(goal.id); setIsDeleteModalOpen(true); }}
                        comments={goalComments.filter(c => c.goal_id === goal.id)}
                        onAddComment={(content, image, replyTo) => handleAddGoalComment(goal.id, content, image, replyTo)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              );
            })()}
          </div>

          {/* 6. Rewards Section (Milestone Style) */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                  <Gift className="w-7 h-7 text-pink-500" />
                  积分里程碑
                </h2>
                <p className="text-sm text-stone-400 mt-1">达成积分目标，解锁家庭惊喜</p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => setIsRewardModalOpen(true)}
                  className="text-stone-400 hover:text-stone-600 p-2 hover:bg-stone-50 rounded-full transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="space-y-12">
              {/* Personal Milestone Tracks */}
              {isAdmin ? (
                // Admin sees everyone's tracks
                ROLES.filter(r => r !== '管理员').map(role => {
                  const mStats = memberStats.find(m => m.role === role);
                  const pts = mStats?.pts || 0;
                  const roleRewards = rewards.filter(r => r.isActive && r.targetType === 'personal' && (!r.role || r.role === role));
                  if (roleRewards.length === 0) return null;

                  return (
                    <div key={role} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                          <UserAvatar role={role} profiles={profiles} className="w-6 h-6" />
                          {role} 的里程碑
                        </h3>
                        <div className="text-sm font-bold text-emerald-500">
                          当前积分: {pts}
                        </div>
                      </div>
                      <div className="relative pt-8 pb-4 px-4 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <div className="absolute top-1/2 left-4 right-4 h-2 bg-emerald-200 -translate-y-1/2 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (pts / Math.max(...roleRewards.map(r => r.cost), 1)) * 100)}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                        <div className="relative flex justify-between items-center">
                          {roleRewards.sort((a, b) => a.cost - b.cost).map(reward => {
                            const isReached = pts >= reward.cost;
                            const isClaimed = txs.some(t => t.member === role && t.reason.includes(reward.name) && t.type === 'milestone_claimed');
                            return (
                              <div key={reward.id} className="flex flex-col items-center gap-2 relative z-10">
                                <button 
                                  onClick={() => handleRedeem(role, reward)}
                                  disabled={!isReached || isClaimed}
                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                                    isClaimed
                                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                      : isReached 
                                        ? 'bg-white text-emerald-500 hover:scale-110 cursor-pointer' 
                                        : 'bg-emerald-200 text-emerald-400 cursor-not-allowed'
                                  }`}
                                >
                                  {isClaimed ? <CheckCircle2 className="w-6 h-6" /> : (ICONS[reward.iconName || 'Gift'] ? React.createElement(ICONS[reward.iconName || 'Gift'], { className: "w-6 h-6" }) : <Gift className="w-6 h-6" />)}
                                </button>
                                <div className="text-center">
                                  <div className={`text-[10px] font-bold ${isReached ? 'text-emerald-500' : 'text-emerald-400'}`}>{reward.cost} 分</div>
                                  <div className="text-[10px] text-stone-600 font-medium max-w-[60px] truncate">{reward.name}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Members see only their own track
                currentUser && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                        <User className="w-6 h-6 text-emerald-500" />
                        我的里程碑
                      </h3>
                      <div className="text-sm font-bold text-emerald-500">
                        我的积分: {memberStats.find(m => m.role === currentUser)?.pts || 0}
                      </div>
                    </div>
                    <div className="relative pt-8 pb-4 px-4 bg-emerald-50 rounded-3xl border border-emerald-100">
                      <div className="absolute top-1/2 left-4 right-4 h-2 bg-emerald-200 -translate-y-1/2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((memberStats.find(m => m.role === currentUser)?.pts || 0) / Math.max(...rewards.filter(r => r.targetType === 'personal' && (!r.role || r.role === currentUser)).map(r => r.cost), 1)) * 100)}%` }}
                          className="h-full bg-emerald-500"
                        />
                      </div>
                      <div className="relative flex justify-between items-center">
                        {rewards.filter(r => r.isActive && r.targetType === 'personal' && (!r.role || r.role === currentUser)).sort((a, b) => a.cost - b.cost).map(reward => {
                          const pts = memberStats.find(m => m.role === currentUser)?.pts || 0;
                          const isReached = pts >= reward.cost;
                          const isClaimed = txs.some(t => t.member === currentUser && t.reason.includes(reward.name) && t.type === 'milestone_claimed');
                          return (
                            <div key={reward.id} className="flex flex-col items-center gap-2 relative z-10">
                              <button 
                                onClick={() => handleRedeem(currentUser, reward)}
                                disabled={!isReached || isClaimed}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                                  isClaimed
                                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                    : isReached 
                                      ? 'bg-white text-emerald-500 hover:scale-110 cursor-pointer' 
                                      : 'bg-emerald-200 text-emerald-400 cursor-not-allowed'
                                }`}
                              >
                                {isClaimed ? <CheckCircle2 className="w-6 h-6" /> : (ICONS[reward.iconName || 'Gift'] ? React.createElement(ICONS[reward.iconName || 'Gift'], { className: "w-6 h-6" }) : <Gift className="w-6 h-6" />)}
                              </button>
                              <div className="text-center">
                                <div className={`text-[10px] font-bold ${isReached ? 'text-emerald-500' : 'text-emerald-400'}`}>{reward.cost} 分</div>
                                <div className="text-[10px] text-stone-600 font-medium max-w-[60px] truncate">{reward.name}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Family Milestone Track */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                    <Users className="w-6 h-6 text-indigo-500" />
                    全家里程碑
                  </h3>
                  <div className="text-sm font-bold text-indigo-500">
                    全家总分: {familyStats.pts}
                  </div>
                </div>
                <div className="relative pt-8 pb-4 px-4 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <div className="absolute top-1/2 left-4 right-4 h-2 bg-indigo-200 -translate-y-1/2 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (familyStats.pts / Math.max(...rewards.filter(r => r.targetType === 'family').map(r => r.cost), 1)) * 100)}%` }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                  <div className="relative flex justify-between items-center">
                    {rewards.filter(r => r.isActive && r.targetType === 'family').sort((a, b) => a.cost - b.cost).map(reward => {
                      const isReached = familyStats.pts >= reward.cost;
                      const isClaimed = txs.some(t => t.member === '家庭' && t.reason.includes(reward.name) && t.type === 'milestone_claimed');
                      return (
                        <div key={reward.id} className="flex flex-col items-center gap-2 relative z-10">
                          <button 
                            onClick={() => handleRedeem(currentUser || '爸爸', reward)}
                            disabled={!currentUser || !isReached || isClaimed}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                              isClaimed
                                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                : isReached 
                                  ? 'bg-white text-indigo-500 hover:scale-110 cursor-pointer' 
                                  : 'bg-indigo-200 text-indigo-400 cursor-not-allowed'
                            }`}
                          >
                            {isClaimed ? <CheckCircle2 className="w-6 h-6" /> : (ICONS[reward.iconName || 'Gift'] ? React.createElement(ICONS[reward.iconName || 'Gift'], { className: "w-6 h-6" }) : <Gift className="w-6 h-6" />)}
                          </button>
                          <div className="text-center">
                            <div className={`text-[10px] font-bold ${isReached ? 'text-indigo-500' : 'text-indigo-400'}`}>{reward.cost} 分</div>
                            <div className="text-[10px] text-stone-600 font-medium max-w-[60px] truncate">{reward.name}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
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
                  <div className="text-xs text-stone-400">每日签到</div>
                  <div className="font-bold text-stone-700">每日登录 <span className="text-emerald-500">+1</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">活跃奖励</div>
                  <div className="font-bold text-stone-700">发送留言/任务意见 <span className="text-emerald-500">+1</span></div>
                </div>
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
                  <div className="font-bold text-stone-700">多人任务 <span className="text-purple-500">总分/人数 (向上取整)</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">积分上限</div>
                  <div className="font-bold text-red-500">留言/弹幕积分上限 <span className="text-red-600">10 分/天</span></div>
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
        {isProfileModalOpen && (
          <ProfileManagementModal
            profiles={profiles}
            onClose={() => setIsProfileModalOpen(false)}
            onUpdatePin={handleUpdateProfilePin}
          />
        )}
        {isDataModalOpen && (
          <DataManagementModal
            onClose={() => setIsDataModalOpen(false)}
            onExport={handleExport}
            onImport={handleImport}
            onRecover={handleRecoverFromLocal}
            onForceSync={() => {
              localStorage.removeItem('family_goals_migrated');
              window.location.reload();
            }}
          />
        )}
        {isSettingsModalOpen && currentUser && (
          <UserSettingsModal
            role={currentUser}
            currentAvatar={profiles.find(p => p.role === currentUser)?.avatar_url}
            onClose={() => setIsSettingsModalOpen(false)}
            onUpdateAvatar={(url) => handleUpdateAvatar(currentUser, url)}
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
            currentUser={currentUser || ''}
            profiles={profiles}
            onClose={() => setIsMessageBoardOpen(false)}
            onSend={handleAddMessage}
            onLike={handleLikeMessage}
            onDelete={handleDeleteMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBoardModal({ messages, currentUser, profiles, onClose, onSend, onLike, onDelete }: { messages: Message[], currentUser: string, profiles: Profile[], onClose: () => void, onSend: (content: string) => void, onLike: (id: string) => void, onDelete?: (id: string) => void }) {
  const [content, setContent] = useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isAdmin = currentUser === '管理员';

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
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <UserAvatar role={msg.user} profiles={profiles} className="w-6 h-6" />
                    <span className="text-xs font-bold text-stone-600">{msg.user}</span>
                    <span className="text-[10px] text-stone-400">{new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[80%] text-sm relative group ${isMe ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none'}`}>
                    {msg.content}
                    <div className={`absolute -bottom-3 ${isMe ? '-left-12' : '-right-12'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <button 
                        onClick={() => onLike(msg.id)}
                        className="bg-white border border-stone-100 shadow-sm rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 text-stone-500 hover:text-red-500 transition-colors"
                      >
                        <Heart className={`w-3 h-3 ${msg.likes > 0 ? 'fill-red-500 text-red-500' : ''}`} /> {msg.likes}
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => onDelete?.(msg.id)}
                          className="bg-white border border-stone-100 shadow-sm rounded-full p-1 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
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

function ProfileManagementModal({ profiles, onClose, onUpdatePin }: { profiles: Profile[], onClose: () => void, onUpdatePin: (role: string, pin: string) => void }) {
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

function DataManagementModal({ onClose, onExport, onImport, onRecover, onForceSync }: { onClose: () => void, onExport: () => void, onImport: (e: React.ChangeEvent<HTMLInputElement>) => void, onRecover: () => void, onForceSync: () => void }) {
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
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${reward.targetType === 'family' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'}`}>
                    {reward.targetType === 'family' ? '家庭' : '个人'}
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

function GoalCard({ goal, currentUser, profiles, onUpdateProgress, onMarkAsDone, onConfirm, onEdit, onDelete, comments, onAddComment }: { goal: Goal, currentUser: string, profiles: Profile[], onUpdateProgress: (val: number) => void, onMarkAsDone: () => void, onConfirm: (member: string) => void, onEdit: () => void, onDelete: () => void, comments: GoalComment[], onAddComment: (content: string, image?: string, replyTo?: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | undefined>(undefined);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const sortedComments = [...comments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const displayedComments = showAllComments ? sortedComments : sortedComments.slice(0, 3);
  const [localProgress, setLocalProgress] = useState(goal.progress);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalProgress(goal.progress);
  }, [goal.progress]);

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
  
  // Requirement: Assignee is the Confirmer
  const requiredConfirmers = assignees.length > 0 ? assignees : ['爸爸'];
  const confirmedCount = requiredConfirmers.filter(r => confirmations[r]).length;
  const totalRequired = requiredConfirmers.length;

  const isAdmin = currentUser === '管理员';
  const canEdit = isAdmin || goal.creator === currentUser;
  const canAddProgress = isAdmin || assignees.includes(currentUser) || goal.creator === currentUser;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCommentImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const commonEmojis = ['👍', '👏', '🔥', '❤️', '🎯', '✅', '💪', '🎉', '✨', '🚀'];

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all ${
        isCompleted ? 'border-emerald-200 bg-stone-50/50 grayscale-[0.2]' : isPendingConfirmation ? 'border-blue-200' : isOverdue ? 'border-red-200' : 'border-stone-200'
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
                {isCompleted ? '已完成' : diffDays < 0 ? `延迟 ${Math.abs(diffDays)} 天` : `剩余 ${diffDays} 天`}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex -space-x-1.5 mb-1">
              {assignees.map((a, i) => (
                <UserAvatar key={a} role={a} profiles={profiles} className="w-5 h-5 border-1 border-white" />
              ))}
            </div>
            <div className="text-[10px] font-bold text-stone-700">{goal.progress}%</div>
            <div className="w-16 h-1 bg-stone-100 rounded-full overflow-hidden">
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
                  <UserAvatar role={goal.creator || '管理员'} profiles={profiles} className="w-5 h-5" />
                  <span>发起: {goal.creator || '管理员'}</span>
                  <span className="mx-1">|</span>
                  <div className="flex -space-x-1">
                    {assignees.map(a => (
                      <UserAvatar key={a} role={a} profiles={profiles} className="w-5 h-5 border-1 border-white" />
                    ))}
                  </div>
                  <span>责任: {assignees.join(', ')}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{goal.startDate} 至 {goal.endDate}</span>
                </div>

                {isPendingConfirmation && (
                  <div className="bg-blue-50 p-3 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                      <Clock className="w-3 h-3" />
                      <span>等待责任人确认 ({confirmedCount}/{totalRequired})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {requiredConfirmers.map(r => (
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
                      <div className="space-y-4">
                        <div className="space-y-2 py-2">
                          <div className="flex justify-between text-xs font-medium text-stone-500">
                            <span>调整进度</span>
                            <span>{localProgress}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="99" 
                            value={localProgress} 
                            onChange={(e) => setLocalProgress(parseInt(e.target.value))}
                            onMouseUp={() => onUpdateProgress(localProgress)}
                            onTouchEnd={() => onUpdateProgress(localProgress)}
                            className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                          />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onMarkAsDone(); }}
                          className="w-full py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" /> 确认完成
                        </button>
                      </div>
                    )}
                    {goal.progress >= 99 && !isCompleted && (
                      <div className="flex flex-wrap gap-2">
                        {requiredConfirmers.map(r => {
                          if (confirmations[r]) return null;
                          const canConfirm = isAdmin || r === currentUser;
                          return (
                            <button 
                              key={r}
                              onClick={(e) => { e.stopPropagation(); canConfirm && onConfirm(r); }}
                              disabled={!canConfirm}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-1 min-h-[48px] ${
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
                  </>
                )}
                
                {/* Comments Section */}
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-stone-400 uppercase flex items-center gap-2">
                      <FileText className="w-3 h-3" /> 任务讨论
                    </h4>
                    {sortedComments.length > 3 && (
                      <button 
                        onClick={() => setShowAllComments(!showAllComments)}
                        className="text-[10px] font-bold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        {showAllComments ? '收起' : `查看全部 ${sortedComments.length} 条`}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto mb-3 pr-1">
                    {sortedComments.length === 0 ? (
                      <p className="text-[10px] text-stone-400 text-center py-2">暂无留言</p>
                    ) : (
                      displayedComments.map(c => (
                        <div key={c.id} className="flex gap-2">
                          <UserAvatar role={c.user} profiles={profiles} className="w-5 h-5 shrink-0" />
                          <div className="flex-grow">
                            <div className="flex justify-between items-center mb-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-stone-600">{c.user}</span>
                                {c.replyTo && (
                                  <span className="text-[8px] text-stone-400 bg-stone-100 px-1 rounded">回复了</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-stone-400">{new Date(c.date).toLocaleString()}</span>
                                <button 
                                  onClick={() => {
                                    setCommentInput(`@${c.user} `);
                                    setReplyToId(c.id);
                                  }}
                                  className="text-[8px] font-bold text-orange-500 hover:text-orange-600"
                                >
                                  回复
                                </button>
                              </div>
                            </div>
                            {c.replyTo && (
                              <div className="mb-1 pl-2 border-l-2 border-stone-200">
                                {(() => {
                                  const repliedComment = comments.find(rc => rc.id === c.replyTo);
                                  return repliedComment ? (
                                    <p className="text-[9px] text-stone-400 italic truncate">
                                      "{repliedComment.content}"
                                    </p>
                                  ) : (
                                    <p className="text-[9px] text-stone-300 italic">原留言已删除</p>
                                  );
                                })()}
                              </div>
                            )}
                            <p className="text-xs text-stone-700 bg-stone-50 p-2 rounded-lg">
                              {c.content}
                              {c.image && (
                                <img 
                                  src={c.image} 
                                  alt="Comment attachment" 
                                  className="mt-2 rounded-lg max-w-full h-auto border border-stone-100 shadow-sm"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    {commentImage && (
                      <div className="relative inline-block">
                        <img src={commentImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-stone-200" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => setCommentImage(null)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex flex-wrap gap-2 p-2 bg-stone-50 rounded-xl border border-stone-100"
                        >
                          {commonEmojis.map(emoji => (
                            <button 
                              key={emoji}
                              onClick={() => {
                                setCommentInput(prev => prev + emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {replyToId && (
                      <div className="flex items-center justify-between bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-orange-600 font-bold">回复:</span>
                          <span className="text-[10px] text-stone-500 truncate max-w-[200px]">
                            {comments.find(c => c.id === replyToId)?.content || '加载中...'}
                          </span>
                        </div>
                        <button 
                          onClick={() => setReplyToId(undefined)}
                          className="text-stone-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <input 
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          placeholder="写下你的评论或建议..."
                          className="w-full pl-3 pr-20 py-2 bg-stone-50 border border-stone-100 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                          <button 
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-1.5 text-stone-400 hover:text-orange-500 transition-colors cursor-pointer"
                          >
                            <Smile className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 text-stone-400 hover:text-orange-500 transition-colors cursor-pointer"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (commentInput.trim() || commentImage) {
                            onAddComment(commentInput, commentImage || undefined, replyToId);
                            setCommentInput('');
                            setCommentImage(null);
                            setReplyToId(undefined);
                          }
                        }}
                        disabled={!currentUser}
                        className="px-4 py-2 bg-stone-800 text-white rounded-xl text-xs font-bold hover:bg-stone-900 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        发送
                      </button>
                    </div>
                  </div>
                </div>

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

function TaskExpiryAlert({ goals, onClose }: { goals: Goal[], onClose: () => void }) {
  const expiringGoals = goals.filter(g => {
    if (g.progress >= 100) return false;
    const today = new Date();
    const start = new Date(g.startDate);
    const end = new Date(g.endDate);
    const total = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    if (total <= 0) return false;
    const ratio = elapsed / total;
    return ratio >= 0.8 && ratio < 1.1; // 80% consumed but not too far overdue
  });

  if (expiringGoals.length === 0) return null;

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-red-500 text-white overflow-hidden relative"
    >
      <div className="flex items-center h-10">
        <div className="flex-shrink-0 px-4 bg-red-600 h-full flex items-center gap-2 z-10">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-bold whitespace-nowrap">紧急提醒</span>
        </div>
        <div className="flex-grow overflow-hidden relative h-full flex items-center">
          <div className="whitespace-nowrap animate-marquee flex items-center gap-8">
            {expiringGoals.map(g => (
              <span key={g.id} className="text-sm font-medium">
                任务「{g.name}」时间已消耗超过 80%，请抓紧时间完成！
              </span>
            ))}
            {/* Duplicate for seamless loop */}
            {expiringGoals.map(g => (
              <span key={`${g.id}-dup`} className="text-sm font-medium">
                任务「{g.name}」时间已消耗超过 80%，请抓紧时间完成！
              </span>
            ))}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="flex-shrink-0 px-4 hover:bg-red-600 h-full flex items-center transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}

function GoalModal({ goal, currentUser, onClose, onSave }: { goal: Goal | null, currentUser: string, onClose: () => void, onSave: (g: Omit<Goal, 'id'>) => void }) {
  const [name, setName] = useState(goal?.name || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [type, setType] = useState<'personal' | 'family'>(goal?.type || 'personal');
  
  const todayStr = getLocalDateString(new Date());
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = getLocalDateString(nextWeek);

  const [startDate, setStartDate] = useState(goal?.startDate || todayStr);
  const [endDate, setEndDate] = useState(goal?.endDate || nextWeekStr);
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
      priority,
      type
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
          <h2 className="text-xl font-bold text-stone-800">{goal ? '编辑目标' : '新建目标'}</h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="goal-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">目标类型</label>
              <div className="flex gap-3">
                {(['personal', 'family'] as const).map(t => (
                  <label key={t} className={`flex-1 flex items-center justify-center py-2 rounded-xl border cursor-pointer transition-colors ${
                    type === t 
                      ? 'bg-orange-50 border-orange-200 text-orange-700'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="goalType" 
                      value={t} 
                      checked={type === t} 
                      onChange={() => setType(t)} 
                      className="sr-only" 
                    />
                    <span className="font-medium text-sm">{t === 'personal' ? '个人目标' : '家庭目标'}</span>
                  </label>
                ))}
              </div>
            </div>

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
              <label className="block text-sm font-medium text-stone-700 mb-2">快捷选择时长</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1天', days: 1 },
                  { label: '3天', days: 3 },
                  { label: '1周', days: 7 },
                  { label: '半个月', days: 15 },
                  { label: '1个月', days: 30 }
                ].map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      const start = new Date(startDate);
                      const end = new Date(start);
                      end.setDate(start.getDate() + opt.days);
                      setEndDate(getLocalDateString(end));
                    }}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    {opt.label}
                  </button>
                ))}
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
              <label className="block text-sm font-medium text-stone-700 mb-2">责任人 (即确认人，可多选)</label>
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
              <p className="mt-2 text-[10px] text-stone-400 italic">注：责任人负责执行任务，并在完成后负责最终确认。团队目标有额外加分。</p>
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

function UserSettingsModal({ role, currentAvatar, onClose, onUpdateAvatar }: { role: string, currentAvatar?: string, onClose: () => void, onUpdateAvatar: (url: string) => void }) {
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

/**
 * ### 家庭积分管理系统 (Family Points System) - 产品需求文档 (PRD)
 * 
 * #### 1. 项目背景
 * 旨在通过积分激励机制，促进家庭成员（爸爸、妈妈、哥哥、妹妹）之间的互动、任务完成和情感交流。
 * 
 * #### 2. 核心功能
 * *   **任务管理**: 创建、分配、进度跟踪、多方确认。
 * *   **积分体系**: 任务奖励、登录奖励、留言奖励、弹幕奖励。
 * *   **勋章/成就**: 自动解锁成就并获得额外积分。
 * *   **家庭留言板**: 实时弹幕、聚合显示、特效支持。
 * *   **数据可视化**: 家庭总积分趋势、成员积分动态（来源细分）。
 * *   **奖励兑换**: 个人及全家里程碑奖励。
 * 
 * #### 3. 最近更新 (v2.3.0)
 * *   **UI 优化**:
 *     *   “积分动态”支持“最近一周”和“全部”切换，且条形图总长度与积分量成正比。
 *     *   “最近动态”面板增加滚动条，限制最大高度，且超过 5 条即显示滚动条。
 *     *   任务剩余时间显示优化：负数显示为“延迟 X 天”。
 *     *   网页版本更新为 “v2.3 好看版”。
 * *   **逻辑增强**:
 *     *   自动完成：当所有责任人都确认后，任务自动刷新为“已完成”状态（包含存量数据自动检查）。
 *     *   弹幕特效：多选特效时，每条弹幕随机从选中的效果中挑选一种展示。
 * *   **弹幕增强**:
 *     *   弹幕特效选择器全面中文化，提升使用体验。
 * *   **Bug 修复**:
 *     *   修复了任务讨论区回复留言可能失败的问题（优化了数据库插入逻辑）。
 * 
 * #### 4. 技术栈
 * *   Frontend: React, Tailwind CSS, Framer Motion, Recharts.
 * *   Backend: Supabase (PostgreSQL, Real-time).
 */
