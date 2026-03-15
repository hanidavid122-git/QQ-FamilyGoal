import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateMemberStats, calculateFamilyStats } from './statsUtils';
import { Goal, Transaction } from '../types';

describe('statsUtils', () => {
  const roles = ['爸爸', '妈妈', '姐姐', '弟弟'];
  
  const mockGoals: Goal[] = [
    {
      id: 'g1',
      name: 'Goal 1',
      description: '',
      creator: '爸爸',
      signature: '',
      assignees: ['姐姐'],
      progress: 50,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      priority: '中',
      type: 'personal',
    },
    {
      id: 'g2',
      name: 'Goal 2',
      description: '',
      creator: '爸爸',
      signature: '',
      assignees: ['姐姐'],
      progress: 100,
      startDate: '2026-03-01',
      endDate: '2026-03-10',
      priority: '中',
      type: 'personal',
    }
  ];

  const mockTxs: Transaction[] = [
    { id: 't1', member: '姐姐', amount: 100, reason: 'Test', date: '2026-03-15', type: 'earned' },
    { id: 't2', member: '姐姐', amount: 30, reason: 'Test', date: '2026-03-15', type: 'redeemed' },
    { id: 't3', member: '爸爸', amount: 50, reason: 'Test', date: '2026-03-15', type: 'earned' },
    { id: 't4', member: '家庭', amount: 20, reason: 'Test', date: '2026-03-15', type: 'redeemed' }
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
  });

  describe('calculateMemberStats', () => {
    it('should calculate stats for each member correctly', () => {
      const stats = calculateMemberStats(roles, mockGoals, mockTxs);
      
      const sisterStats = stats.find(s => s.role === '姐姐');
      expect(sisterStats).toBeDefined();
      expect(sisterStats?.total).toBe(2);
      expect(sisterStats?.active).toBe(1);
      expect(sisterStats?.completed).toBe(1);
      expect(sisterStats?.earned).toBe(100);
      expect(sisterStats?.pts).toBe(70); // 100 - 30
      expect(sisterStats?.badge).toBe('Achiever'); // 100 pts
    });

    it('should calculate weekly stats correctly', () => {
      const stats = calculateMemberStats(roles, mockGoals, mockTxs);
      const sisterStats = stats.find(s => s.role === '姐姐');
      // Today is 2026-03-15. t1 is from today.
      // weekly is [w3, w2, w1, w0] where w0 is current week.
      expect(sisterStats?.weekly[3]).toBe(100);
    });
  });

  describe('calculateFamilyStats', () => {
    it('should calculate family stats correctly', () => {
      const stats = calculateFamilyStats(mockTxs);
      // totalEarned = 100 (姐姐) + 50 (爸爸) = 150
      // totalRedeemed = 20 (家庭)
      expect(stats.earned).toBe(150);
      expect(stats.redeemed).toBe(20);
      expect(stats.pts).toBe(130);
    });
  });
});
