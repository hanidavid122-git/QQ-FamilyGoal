import React from 'react';
import { 
  Plus, Edit2, Trash2, CheckCircle, Clock, Users, 
  Target, TrendingUp, Calendar, AlertCircle, X,
  Heart, FileText, Flag, Star, Gift, Trophy, 
  History, Medal, Crown, Film, Gamepad, Utensils, 
  Car, Info, Settings, Download, Upload, Database, Eye, EyeOff, CheckCircle2, Circle, Image
} from 'lucide-react';
import { LayoutComponentId, LayoutConfig, Priority, Reward } from './types';

export const ROLES = ['爸爸', '妈妈', '姐姐', '妹妹'];
export const ALL_ROLES = [...ROLES, '管理员'];
export const PRIORITIES: Priority[] = ['高', '中', '低'];

export const DEFAULT_LAYOUT: LayoutConfig = {
  order: ['hero', 'danmaku', 'race', 'personal', 'tasks', 'rewards', 'rules'],
  hidden: []
};

export const COMPONENT_NAMES: Record<LayoutComponentId, string> = {
  hero: '家庭总积分',
  danmaku: '弹幕留言板',
  race: '成员大比拼',
  personal: '个人概览',
  tasks: '任务中心',
  rewards: '积分兑换',
  rules: '规则说明'
};

export const ICONS: Record<string, React.ElementType> = {
  Plus, Edit2, Trash2, CheckCircle, Clock, Users, 
  Target, TrendingUp, Calendar, AlertCircle, X,
  Heart, FileText, Flag, Star, Gift, Trophy, 
  History, Medal, Crown, Film, Gamepad, Utensils, 
  Car, Info, Settings, Download, Upload, Database, Eye, EyeOff, CheckCircle2, Circle, Image
};

export const DEFAULT_REWARDS: Reward[] = [
  { id: 'r1', name: '选择家庭电影', cost: 100, isActive: true, isCustom: false, iconName: 'Film', targetType: 'personal' },
  { id: 'r2', name: '免做家务一天', cost: 200, isActive: true, isCustom: false, iconName: 'Target', targetType: 'personal' },
  { id: 'r3', name: '自选家庭出游', cost: 1000, isActive: true, isCustom: false, iconName: 'Car', targetType: 'family' },
  { id: 'r4', name: '获得新玩具', cost: 150, isActive: true, isCustom: false, iconName: 'Gamepad', targetType: 'personal' },
  { id: 'r5', name: '选择周末大餐', cost: 500, isActive: true, isCustom: false, iconName: 'Utensils', targetType: 'family' },
];

export const AVATARS = [
  '👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿',
  '👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿',
  '👧🏻', '👧🏼', '👧🏽', '👧🏾', '👧🏿',
  '👦🏻', '👦🏼', '👦🏽', '👦🏾', '👦🏿',
  '👶🏻', '👶🏼', '👶🏽', '👶🏾', '👶🏿',
  '👴🏻', '👵🏻', '🧔🏻', '👱🏻‍♀️', '👱🏻',
  '🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🐮', '🐷', '🐸'
];

export const DANMAKU_EMOJIS = [
  '👍', '❤️', '😂', '😮', '👏', '🎉', '🔥', '💯', '🚀', '🌟', '💪', '🙏', '👻', '💩', '🌹'
];

export const commonEmojis = ['👍', '👏', '🔥', '❤️', '🎯', '✅', '💪', '🎉', '✨', '🚀'];

export const DANMAKU_SPEEDS = [
  { label: '慢', value: 15 },
  { label: '中', value: 10 },
  { label: '快', value: 5 }
];

export const DANMAKU_EFFECTS = [
  { label: '默认', value: 'default' },
  { label: '闪烁', value: 'blink' },
  { label: '放大', value: 'zoom' },
  { label: '旋转', value: 'rotate' },
  { label: '彩虹', value: 'rainbow' },
  { label: '波动', value: 'wave' },
  { label: '抖动', value: 'shake' },
  { label: '模糊', value: 'blur' },
  { label: '霓虹', value: 'neon' },
  { label: '弹跳', value: 'bounce' },
  { label: '脉冲', value: 'pulse' },
  { label: '幽灵', value: 'ghost' },
  { label: '翻转', value: 'flip' },
  { label: '故障', value: 'glitch' },
  { label: '火焰', value: 'fire' },
  { label: '冰霜', value: 'ice' },
  { label: '漂浮', value: 'float' },
  { label: '倾斜', value: 'skew' }
];

export const DANMAKU_DURATIONS = [
  { label: '1天', value: 24 * 60 * 60 * 1000 },
  { label: '1周', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '永久', value: -1 }
];

export const MESSAGE_COLORS = [
  '#000000', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'
];
