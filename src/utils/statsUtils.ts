import { Goal, Transaction, Profile, Reward } from '../types';
import { getWarningStatus } from './goalUtils';

export interface MemberStat {
  role: string;
  total: number;
  active: number;
  completed: number;
  pts: number;
  earned: number;
  badge: string;
  badgeColor: string;
  weekly: number[];
  warning: 'red' | 'yellow' | 'green';
}

export interface FamilyStat {
  earned: number;
  redeemed: number;
  pts: number;
}

export function calculateMemberStats(roles: string[], goals: Goal[], txs: Transaction[]): MemberStat[] {
  return roles.map(role => {
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

    const weekly = [0, 0, 0, 0];
    const now = new Date().getTime();
    mTx.filter(t => t.type === 'earned' || t.type === 'earn').forEach(t => {
      const w = Math.floor((now - new Date(t.date).getTime()) / 604800000);
      if (w >= 0 && w < 4) weekly[3 - w] += t.amount;
    });

    let warning: 'red' | 'yellow' | 'green' = 'green';
    if (active.some(g => getWarningStatus(g) === 'red')) warning = 'red';
    else if (active.some(g => getWarningStatus(g) === 'yellow')) warning = 'yellow';

    return { role, total: mGoals.length, active: active.length, completed: mGoals.length - active.length, pts, earned, badge, badgeColor, weekly, warning };
  });
}

export function calculateFamilyStats(txs: Transaction[]): FamilyStat {
  const totalEarned = txs.filter(t => t.type === 'earned' || t.type === 'earn').reduce((sum, t) => sum + t.amount, 0);
  const totalRedeemed = txs.filter(t => t.member === '家庭' && (t.type === 'redeemed' || t.type === 'redeem')).reduce((sum, t) => sum + t.amount, 0);
  return { earned: totalEarned, redeemed: totalRedeemed, pts: totalEarned - totalRedeemed };
}
