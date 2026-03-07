export type Priority = '高' | '中' | '低';

export type Goal = {
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
  type: 'personal' | 'family';
};

export type Transaction = {
  id: string;
  date: string;
  member: string;
  amount: number;
  reason: string;
  type: 'earned' | 'redeemed' | 'earn' | 'redeem' | 'milestone_claimed';
};

export type Achievement = {
  id: string;
  member: string;
  achId: string;
  date: string;
};

export type Reward = {
  id: string;
  name: string;
  cost: number;
  description?: string;
  isActive: boolean;
  isCustom: boolean;
  iconName?: string;
  targetType: 'personal' | 'family';
  role?: string; // Optional: specify which role this reward belongs to
};

export type FilterType = '全部' | '待处理' | '已完成';

export type ActivityType = 'login' | 'danmaku' | 'goal_created' | 'goal_completed';

export type Activity = {
  id: string;
  user: string;
  type: ActivityType;
  content: string;
  date: string;
  metadata?: any;
};

export type LayoutComponentId = 'hero' | 'danmaku' | 'race' | 'personal' | 'tasks' | 'rewards' | 'rules';

export type LayoutConfig = {
  order: LayoutComponentId[];
  hidden: LayoutComponentId[];
};

export type Profile = {
  role: string;
  pin: string;
  layout_config: LayoutConfig;
  avatar_url?: string;
};

export type GoalComment = {
  id: string;
  goal_id: string;
  user: string;
  content: string;
  date: string;
  image?: string;
  replyTo?: string; // ID of the comment being replied to
};

export type Message = {
  id: string;
  user: string;
  content: string;
  date: string;
  likes: number;
  avatar?: string;
  color?: string;
  font_size?: string;
  emoji?: string;
  speed?: number;
  effect?: string;
  duration?: number;
};
