import { describe, it, expect, vi } from 'vitest';
import { getWarningStatus, getGoalScore } from '../utils/goalUtils';
import { Goal } from '../types';

describe('goalUtils', () => {
  const baseGoal: Goal = {
    id: '1',
    name: 'Test Goal',
    description: 'Test Description',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    progress: 50,
    creator: '爸爸',
    assignees: ['爸爸'],
    signature: '',
    priority: '中',
    type: 'personal'
  };

  describe('getWarningStatus', () => {
    it('should return green when progress is 100%', () => {
      const goal = { ...baseGoal, progress: 100 };
      expect(getWarningStatus(goal)).toBe('green');
    });

    it('should return red when overdue', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-01'));
      
      const goal = { ...baseGoal, endDate: '2026-03-31', progress: 50 };
      expect(getWarningStatus(goal)).toBe('red');
      
      vi.useRealTimers();
    });

    it('should return yellow when slightly behind', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-16'));
      
      const goal = { ...baseGoal, progress: 45, priority: '中' as const };
      expect(getWarningStatus(goal)).toBe('yellow');
      
      vi.useRealTimers();
    });
  });

  describe('getGoalScore', () => {
    it('should calculate score correctly based on priority', () => {
      const highGoal = { ...baseGoal, priority: '高' as const };
      const midGoal = { ...baseGoal, priority: '中' as const };
      const lowGoal = { ...baseGoal, priority: '低' as const };
      
      expect(getGoalScore(highGoal)).toBeGreaterThan(getGoalScore(midGoal));
      expect(getGoalScore(midGoal)).toBeGreaterThan(getGoalScore(lowGoal));
    });
  });
});
