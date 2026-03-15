import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, ChevronUp, ChevronDown, Trophy, Crown 
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, 
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Transaction, Profile } from '../types';
import { ROLES } from '../constants';
import { getLocalDateString } from '../utils/goalUtils';
import { UserAvatar } from './UserAvatar';

export function LineChart({ data }: { data: number[] }) {
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

export function FamilyGrowthChart({ transactions }: { transactions: Transaction[] }) {
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

export function PointsDynamics({ 
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
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'all'>('today');

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
        task: task + other, 
        login, 
        danmaku, 
        comment, 
        taskPct: total > 0 ? ((task + other) / total) * 100 : 0,
        loginPct: total > 0 ? (login / total) * 100 : 0,
        danmakuPct: total > 0 ? (danmaku / total) * 100 : 0,
        commentPct: total > 0 ? (comment / total) * 100 : 0
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

export function FamilyHero({ familyPts, nextMilestone, nextRewardName, transactions }: { familyPts: number, nextMilestone: number, nextRewardName: string, transactions: Transaction[] }) {
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
