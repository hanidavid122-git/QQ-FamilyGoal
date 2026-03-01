import React from 'react';
import { 
  Plus, Edit2, Trash2, CheckCircle, Clock, Users, 
  Target, TrendingUp, Calendar, AlertCircle, X,
  Heart, FileText, Flag, Star, Gift, Trophy, 
  History, Medal, Crown, Film, Gamepad, Utensils, 
  Car, Info, Settings, Download, Upload, Database, Eye, EyeOff, CheckCircle2, Circle
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
  Car, Info, Settings, Download, Upload, Database, Eye, EyeOff, CheckCircle2, Circle
};

export const DEFAULT_REWARDS: Reward[] = [
  { id: 'r1', name: '选择家庭电影', cost: 100, isActive: true, isCustom: false, iconName: 'Film' },
  { id: 'r2', name: '免做家务一天', cost: 200, isActive: true, isCustom: false, iconName: 'Target' },
  { id: 'r3', name: '自选家庭出游', cost: 300, isActive: true, isCustom: false, iconName: 'Car' },
  { id: 'r4', name: '获得新玩具', cost: 150, isActive: true, isCustom: false, iconName: 'Gamepad' },
  { id: 'r5', name: '选择周末大餐', cost: 250, isActive: true, isCustom: false, iconName: 'Utensils' },
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

export const MESSAGE_COLORS = [
  '#000000', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'
];
