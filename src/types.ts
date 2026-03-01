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
};

export type Transaction = {
  id: string;
  date: string;
  member: string;
  amount: number;
  reason: string;
  type: 'earned' | 'redeemed';
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
};

export type FilterType = '全部' | '规划中' | '进行中' | '待确认' | '已完成';

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

export type Message = {
  id: string;
  user: string;
  content: string;
  date: string;
  likes: number;
  avatar?: string;
  color?: string;
  font_size?: string;
};
