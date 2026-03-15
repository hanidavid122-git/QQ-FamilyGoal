import { Goal } from '../types';

export function getWarningStatus(goal: Goal): 'red' | 'yellow' | 'green' {
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

export function getGoalScore(goal: Goal): number {
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

export function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
}

export function getLocalDateString(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
}
