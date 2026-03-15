import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DanmakuBoard } from '../components/DanmakuBoard';
import { GoalCard } from '../components/GoalCard';
import { Goal, Profile } from '../types';

describe('Component Integration', () => {
  const mockProfiles: Profile[] = [
    { role: '爸爸', pin: '1183', avatar_url: undefined, layout_config: { order: [], hidden: [] } },
    { role: '姐姐', pin: '1183', avatar_url: undefined, layout_config: { order: [], hidden: [] } }
  ];

  describe('DanmakuBoard', () => {
    it('should call onSend when sending a message', async () => {
      const onSend = vi.fn();
      render(
        <DanmakuBoard 
          messages={[]} 
          onSend={onSend} 
          currentUser="爸爸" 
          profiles={mockProfiles}
          memberStats={[]}
          isAdmin={true}
          isBulletEnabled={true}
          isExpanded={true}
          onToggle={() => {}}
        />
      );

      const input = screen.getByPlaceholderText(/作为 爸爸 发送留言/i);
      fireEvent.change(input, { target: { value: 'Hello Family!' } });
      
      const sendButton = screen.getByText('发送');
      fireEvent.click(sendButton);

      expect(onSend).toHaveBeenCalledWith(
        'Hello Family!', 
        undefined, 
        expect.any(String), 
        expect.any(String), 
        undefined, 
        expect.any(Number), 
        expect.any(String), 
        expect.any(Number)
      );
    });
  });

  describe('GoalCard', () => {
    const mockGoal: Goal = {
      id: '1',
      name: 'Study React',
      description: 'Learn hooks and testing',
      creator: '爸爸',
      signature: '',
      assignees: ['姐姐'],
      progress: 0,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      priority: '高',
      type: 'personal',
    };

    it('should display goal information correctly', () => {
      render(
        <GoalCard 
          goal={mockGoal} 
          onEdit={() => {}} 
          onDelete={() => {}} 
          onUpdateProgress={() => {}} 
          onMarkAsDone={() => {}}
          onConfirm={() => {}}
          onAddComment={() => {}}
          comments={[]}
          profiles={mockProfiles}
          currentUser="姐姐"
        />
      );

      expect(screen.getByText('Study React')).toBeInTheDocument();
      expect(screen.getByText('👧🏻')).toBeInTheDocument();
    });
  });
});
