import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Plus, Edit2, Trash2, CheckCircle, Clock, Users, User,
  Target, TrendingUp, Calendar, AlertCircle, X,
  Heart, FileText, Flag, Star, Gift, Trophy, 
  History, Medal, Crown, Film, Gamepad, Utensils, 
  Car, Info, Settings, Download, Upload, Database, Eye, EyeOff, CheckCircle2, Circle, Image as ImageIcon,
  Shield, MessageSquare, ChevronUp, ChevronDown, Smile, BarChart3, LineChart as LineChartIcon, Palette
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line } from 'recharts';

import { 
  Priority, Goal, Transaction, Achievement, Reward, FilterType, 
  LayoutComponentId, LayoutConfig, Profile, Message, GoalComment,
  Activity, ActivityType
} from './types';
import { 
  ROLES, ALL_ROLES, PRIORITIES, DEFAULT_LAYOUT, COMPONENT_NAMES, 
  DEFAULT_REWARDS, ICONS, AVATARS, MESSAGE_COLORS,
  DANMAKU_EMOJIS, DANMAKU_SPEEDS, DANMAKU_EFFECTS, DANMAKU_DURATIONS,
  commonEmojis, ACHIEVEMENTS
} from './constants';
import { LoginModal } from './components/LoginModal';
import { LayoutSettingsModal } from './components/LayoutSettingsModal';
import { UserAvatar } from './components/UserAvatar';
import { SystemHealth } from './components/SystemHealth';
import { RecentActivity } from './components/RecentActivity';
import { GoalCard } from './components/GoalCard';
import { GoalModal } from './components/GoalModal';
import { DanmakuBoard } from './components/DanmakuBoard';
import { 
  DeleteConfirmModal, HistoryModal, UserSettingsModal, DataManagementModal 
} from './components/Modals';
import { RewardManagementModal, RewardEditModal } from './components/RewardModals';
import { ProfileManagementModal } from './components/ProfileManagementModal';
import { MessageBoardModal } from './components/MessageBoardModal';
import { AdminDashboard } from './components/AdminDashboard';
import { WarningLight } from './components/WarningLight';
import { TaskExpiryAlert } from './components/TaskExpiryAlert';
import { FamilyHero, PointsDynamics, FamilyGrowthChart } from './components/FamilyStats';
import { generateId, getLocalDateString, getWarningStatus, getGoalScore } from './utils/goalUtils';
import { calculateMemberStats, calculateFamilyStats } from './utils/statsUtils';

const STORAGE_KEY = 'family_goals_data';
const MESSAGES_KEY = 'family_goals_messages';
const CURRENT_USER_KEY = 'family_goals_user';
const TX_KEY = 'family_goals_transactions';
const ACH_KEY = 'family_goals_achievements';
const CHECKIN_KEY = 'family_goals_checkins';
const REWARDS_KEY = 'family_goals_rewards';

const safeSetItem = (key: string, value: any) => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  } catch (e) {
    console.error('Error saving to localStorage', e);
    if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.name === 'QuotaExceededError')) {
      console.warn('LocalStorage quota exceeded, attempting to clear cache...');
      try {
        // Clear all cache keys to make room
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('cache_')) {
            localStorage.removeItem(k);
          }
        });
        
        // Also clear legacy keys if they still exist to free up space
        const legacyKeys = [
          'family_goals_data', 
          'family_goals_transactions', 
          'family_goals_achievements', 
          'family_goals_checkins', 
          'family_goals_rewards',
          'family_goals_messages'
        ];
        legacyKeys.forEach(k => localStorage.removeItem(k));

        // Try again once after clearing
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
      } catch (retryError) {
        console.error('Failed to save even after clearing cache', retryError);
      }
    }
  }
};


export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 font-sans text-stone-800">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Database className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">缺少数据库配置</h1>
          <p className="text-stone-600 mb-6 text-sm">
            为了实现多人实时同步，请在 AI Studio 右侧的 <strong>Secrets</strong> 面板中添加以下环境变量：
          </p>
          <div className="bg-stone-50 p-4 rounded-xl text-left font-mono text-sm text-stone-700 mb-6 space-y-3">
            <div>
              <span className="font-bold text-stone-900">VITE_SUPABASE_URL</span>
              <br />
              <span className="text-stone-500 text-xs">你的 Supabase Project URL</span>
            </div>
            <div>
              <span className="font-bold text-stone-900">VITE_SUPABASE_ANON_KEY</span>
              <br />
              <span className="text-stone-500 text-xs">你的 Supabase anon key</span>
            </div>
          </div>
          <p className="text-sm text-stone-500">
            配置完成后，请刷新页面。
          </p>
        </motion.div>
      </div>
    );
  }

  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem(CURRENT_USER_KEY);
  });
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalComments, setGoalComments] = useState<GoalComment[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [achs, setAchs] = useState<Achievement[]>([]);
  const [rewards, setRewards] = useState<Reward[]>(DEFAULT_REWARDS);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginRole, setLoginRole] = useState<string | null>(null);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [profilesTableMissing, setProfilesTableMissing] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isActivitiesExpanded, setIsActivitiesExpanded] = useState(false);
  const [isWeeklyGrowthExpanded, setIsWeeklyGrowthExpanded] = useState(false);
  const [activitiesTableMissing, setActivitiesTableMissing] = useState(false);
  const [showDanmakuBoard, setShowDanmakuBoard] = useState(() => {
    const saved = localStorage.getItem('family_goals_danmaku_expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  useEffect(() => {
    safeSetItem('family_goals_danmaku_expanded', JSON.stringify(showDanmakuBoard));
  }, [showDanmakuBoard]);

  const addActivity = async (type: ActivityType, content: string, metadata?: any, userOverride?: string) => {
    const user = userOverride || currentUser;
    if (!user) return;
    
    const newActivity: Activity = {
      id: generateId(),
      user,
      type,
      content,
      date: new Date().toISOString(),
      metadata
    };
    
    // Optimistic update
    setActivities(prev => {
      if (prev.some(a => a.id === newActivity.id)) return prev;
      return [newActivity, ...prev].slice(0, 50);
    });
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('activities').insert({
          id: newActivity.id,
          user_name: newActivity.user,
          type: newActivity.type,
          content: newActivity.content,
          date: newActivity.date,
          metadata: newActivity.metadata
        });
        if (error && error.message?.includes('relation "activities" does not exist')) {
          setActivitiesTableMissing(true);
        }
      } catch (e) {
        console.error('Failed to save activity:', e);
      }
    }
  };

  // Load initial data
  useEffect(() => {
    const migrateData = async () => {
      const isMigrated = localStorage.getItem('family_goals_migrated');
      if (isMigrated === 'true') return;

      // Use a session-based lock to prevent multiple tabs from migrating at the same time
      const migrationLock = sessionStorage.getItem('migration_in_progress');
      if (migrationLock) return;
      sessionStorage.setItem('migration_in_progress', 'true');

      console.log('Starting data migration/sync...');
      try {
        const getLocalData = (key: string, fallback: string = '[]') => {
          try {
            return JSON.parse(localStorage.getItem(key) || fallback);
          } catch (e) {
            console.error(`Error parsing local storage key: ${key}`, e);
            return JSON.parse(fallback);
          }
        };

        const localGoals = getLocalData(STORAGE_KEY);
        const localTxs = getLocalData(TX_KEY);
        const localAchs = getLocalData(ACH_KEY);
        const localCheckIns = getLocalData(CHECKIN_KEY);
        const localRewards = getLocalData(REWARDS_KEY, 'null');

        const migrationPromises = [];

        if (localGoals.length > 0) {
          const mappedGoals = localGoals.map((g: any) => ({
            id: g.id, name: g.name, description: g.description, start_date: g.startDate,
            end_date: g.endDate, progress: g.progress, creator: g.creator || '爸爸',
            assignees: g.assignees || (g.assignee ? [g.assignee] : ['爸爸']),
            assignee: g.assignee, signature: g.signature || '', priority: g.priority || '中',
            completed_at: g.completedAt, confirmations: g.confirmations || {}
          }));
          migrationPromises.push(supabase.from('goals').upsert(mappedGoals, { onConflict: 'id' }));
        }

        if (localTxs.length > 0) {
          migrationPromises.push(supabase.from('transactions').upsert(localTxs, { onConflict: 'id' }));
        }

        if (localAchs.length > 0) {
          const mappedAchs = localAchs.map((a: any) => ({
            id: a.id, member: a.member, ach_id: a.achId, date: a.date
          }));
          migrationPromises.push(supabase.from('achievements').upsert(mappedAchs, { onConflict: 'id' }));
        }

        if (localCheckIns.length > 0) {
          const mappedCheckIns = localCheckIns.map((c: any) => ({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            member: c.member, date: c.date
          }));
          migrationPromises.push(supabase.from('checkins').upsert(mappedCheckIns, { onConflict: 'id' }));
        }

        if (localRewards && localRewards.length > 0) {
          const mappedRewards = localRewards.map((r: any) => ({
            id: r.id, name: r.name, cost: r.cost, description: r.description,
            is_active: r.isActive, is_custom: r.isCustom, icon_name: r.iconName
          }));
          migrationPromises.push(supabase.from('rewards').upsert(mappedRewards, { onConflict: 'id' }));
        }

        if (migrationPromises.length > 0) {
          await Promise.all(migrationPromises);
        }
        
        // After successful migration, clear the old local data to free up space
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TX_KEY);
        localStorage.removeItem(ACH_KEY);
        localStorage.removeItem(CHECKIN_KEY);
        localStorage.removeItem(REWARDS_KEY);
        localStorage.removeItem(MESSAGES_KEY);
        
        // Insert default profiles if not exist
        const profilesRes = await supabase.from('profiles').select('role');
        if (!profilesRes.error) {
            const existingProfiles = profilesRes.data;
            const existingRoles = existingProfiles?.map(p => p.role) || [];
            const missingRoles = ROLES.filter(r => !existingRoles.includes(r));
            
            if (missingRoles.length > 0) {
                await supabase.from('profiles').insert(missingRoles.map(r => ({ role: r, pin: '1183' })));
            }
        }

        safeSetItem('family_goals_migrated', 'true');
      } catch (e) {
        console.error('Migration failed', e);
      } finally {
        sessionStorage.removeItem('migration_in_progress');
      }
    };

    const loadData = async () => {
      // SWR Strategy: Load from cache first for instant UI
      const cachedGoals = localStorage.getItem('cache_goals');
      const cachedTxs = localStorage.getItem('cache_txs');
      const cachedAchs = localStorage.getItem('cache_achs');
      const cachedRewards = localStorage.getItem('cache_rewards');
      const cachedMsgs = localStorage.getItem('cache_msgs');
      const cachedProfiles = localStorage.getItem('cache_profiles');
      const cachedGoalComments = localStorage.getItem('cache_goal_comments');

      if (cachedGoals) {
        setGoals(JSON.parse(cachedGoals));
        setLoading(false); // If we have cache, we can stop the "blocking" loading state
      } else {
        setLoading(true);
      }
      
      if (cachedTxs) setTxs(JSON.parse(cachedTxs));
      if (cachedAchs) setAchs(JSON.parse(cachedAchs));
      if (cachedRewards) setRewards(JSON.parse(cachedRewards));
      if (cachedMsgs) setMessages(JSON.parse(cachedMsgs));
      if (cachedProfiles) setProfiles(JSON.parse(cachedProfiles));
      if (cachedGoalComments) setGoalComments(JSON.parse(cachedGoalComments));

      try {
        // Fetch fresh data in background
        const goalsPromise = supabase.from('goals').select('*');
        const txsPromise = supabase.from('transactions').select('*').order('date', { ascending: false }).limit(200);
        const achsPromise = supabase.from('achievements').select('*');
        const rewardsPromise = supabase.from('rewards').select('*');
        const msgsPromise = supabase.from('messages').select('*').order('date', { ascending: false }).limit(50);
        const profilesPromise = supabase.from('profiles').select('*');
        const goalCommentsPromise = supabase.from('goal_comments').select('*').order('date', { ascending: true });

        const [goalsRes, txsRes, achsRes, rewardsRes, msgsRes, profilesRes, goalCommentsRes, activitiesRes] = await Promise.all([
            goalsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            txsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            achsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            rewardsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            msgsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            profilesPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            goalCommentsPromise.then(res => res, (e: any) => ({ data: null, error: e })),
            supabase.from('activities').select('*').order('date', { ascending: false }).limit(50).then(res => res, (e: any) => ({ data: null, error: e }))
        ]);

        if (profilesRes.error && (profilesRes.error as any).code === '42P01') {
          setProfilesTableMissing(true);
        }
        if (activitiesRes.error && (activitiesRes.error as any).code === '42P01') {
          setActivitiesTableMissing(true);
        }

        if (activitiesRes.data) {
          const freshActs = (activitiesRes.data as any[]).map(a => ({
            id: a.id, user: a.user_name, type: a.type as ActivityType, content: a.content, date: a.date, metadata: a.metadata
          }));
          setActivities(freshActs);
          
          // If no activities found and user is logged in, add a welcome activity
          if (freshActs.length === 0 && currentUser) {
            addActivity('login', '欢迎回来！系统已就绪。');
          }
        }

        if (goalsRes.data) {
          console.log('Loaded goals:', goalsRes.data);
          const freshGoals = (goalsRes.data as any[]).map((g: any) => ({
            id: g.id, name: g.name, description: g.description, startDate: g.start_date,
            endDate: g.end_date, progress: g.progress, creator: g.creator,
            assignees: g.assignees, assignee: g.assignee, signature: g.signature,
            priority: g.priority, completedAt: g.completed_at, confirmations: g.confirmations,
            type: g.type || (g.assignees?.length > 1 ? 'family' : 'personal')
          }));
          setGoals(freshGoals);
          safeSetItem('cache_goals', JSON.stringify(freshGoals));
        }

        if (txsRes.data) {
          const freshTxs = (txsRes.data as any[]).reverse();
          setTxs(freshTxs);
          safeSetItem('cache_txs', JSON.stringify(freshTxs));
        }
        
        if (achsRes.data) {
          const freshAchs = (achsRes.data as any[]).map(a => ({
            id: a.id, member: a.member, achId: a.ach_id, date: a.date
          }));
          setAchs(freshAchs);
          safeSetItem('cache_achs', JSON.stringify(freshAchs));
        }

        if (rewardsRes.data && rewardsRes.data.length > 0) {
          const freshRewards = (rewardsRes.data as any[]).map(r => ({
            id: r.id, name: r.name, cost: r.cost, description: r.description,
            isActive: r.is_active, isCustom: r.is_custom, iconName: r.icon_name,
            targetType: r.target_type || 'personal'
          }));
          setRewards(freshRewards);
          safeSetItem('cache_rewards', JSON.stringify(freshRewards));
        }

        if (msgsRes.data) {
          const sortedMsgs = (msgsRes.data as any[]).reverse();
          const freshMsgs = sortedMsgs.map(m => {
            let extra: any = {};
            try { if (m.avatar && m.avatar.startsWith('{')) extra = JSON.parse(m.avatar); } catch(e) {}
            return {
              id: m.id, user: m.user_name, content: m.content, date: m.date, likes: m.likes,
              avatar: (m.avatar && m.avatar.startsWith('data:image') && m.avatar.length > 20000) ? null : m.avatar, 
              color: m.color, font_size: m.font_size,
              speed: extra.s || extra.speed, effect: extra.e || extra.effect, duration: extra.d || extra.duration
            };
          });
          setMessages(freshMsgs);
          safeSetItem('cache_msgs', JSON.stringify(freshMsgs));
        }

        if (profilesRes.data && profilesRes.data.length > 0) {
            const freshProfiles = (profilesRes.data as any[]).map(p => ({
                role: p.role, pin: p.pin, layout_config: p.layout_config || DEFAULT_LAYOUT, avatar_url: p.avatar_url
            }));
            setProfiles(freshProfiles);
            
            // Trim large base64 avatars from cache to save space
            const profilesToCache = freshProfiles.map(p => ({
              ...p,
              avatar_url: (p.avatar_url && p.avatar_url.startsWith('data:image') && p.avatar_url.length > 20000) 
                ? null // Don't cache large base64 images (>20KB)
                : p.avatar_url
            }));
            safeSetItem('cache_profiles', JSON.stringify(profilesToCache));
        } else if (profilesRes.data && profilesRes.data.length === 0) {
            const initialProfiles = ROLES.map(role => ({ role, pin: '1183' }));
            await supabase.from('profiles').insert(initialProfiles);
            setProfiles(initialProfiles.map(p => ({ ...p, layout_config: DEFAULT_LAYOUT, avatar_url: null })));
        }

        if (goalCommentsRes.data) {
          const freshComments = (goalCommentsRes.data as any[]).map(c => ({
            id: c.id, goal_id: c.goal_id, user: c.user, content: c.content, date: c.date,
            image: c.image, replyTo: c.reply_to
          }));
          setGoalComments(freshComments);
          
          // Trim large base64 images from cache
          const commentsToCache = freshComments.map(c => ({
            ...c,
            image: (c.image && c.image.startsWith('data:image') && c.image.length > 20000)
              ? null // Don't cache large images (>20KB)
              : c.image
          }));
          safeSetItem('cache_goal_comments', JSON.stringify(commentsToCache));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    const init = async () => {
      await migrateData();
      await loadData();
    };

    init();
  }, []);

  // Data Repair Effect
  useEffect(() => {
    const runRepair = async () => {
      if (!isSupabaseConfigured) return;
      
      const lastRepair = localStorage.getItem('last_data_repair_v4');
      const now = new Date().getTime();
      
      // Run repair if not run in the last 5 minutes
      if (!lastRepair || now - parseInt(lastRepair) > 300000) {
        console.log('Starting data repair v4...');
        
        // 1. Repair Transactions
        const { data: allTxs } = await supabase.from('transactions').select('*');
        if (allTxs) {
          const seen = new Set();
          const toDelete = [];
          const sortedTxs = [...allTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          for (const tx of sortedTxs) {
            let key = '';
            if (tx.reason.startsWith('完成目标:')) {
              // Extract goal name to prevent duplicates even if reason suffix differs
              const goalNameMatch = tx.reason.match(/完成目标: ([^(\n]+)/);
              const goalName = goalNameMatch ? goalNameMatch[1].trim() : tx.reason;
              key = `goal-${tx.member}-${goalName}`;
            } else if (tx.reason.includes('登录奖励')) {
              const dateStr = new Date(tx.date).toISOString().split('T')[0];
              key = `login-${tx.member}-${dateStr}`;
            } else if (tx.reason.includes('弹幕奖励') || tx.reason.includes('留言奖励')) {
              // For danmaku/comments, we allow multiple but limit per day
              // This repair is more complex, let's skip for now unless specifically requested
              continue;
            } else {
              continue;
            }

            if (seen.has(key)) {
              toDelete.push(tx.id);
            } else {
              seen.add(key);
            }
          }
          
          if (toDelete.length > 0) {
            console.log(`Deleting ${toDelete.length} duplicate transactions...`);
            for (let i = 0; i < toDelete.length; i += 100) {
              await supabase.from('transactions').delete().in('id', toDelete.slice(i, i + 100));
            }
          }
        }

        // 2. Repair Activities
        const { data: allActs } = await supabase.from('activities').select('*');
        if (allActs) {
          const seenActs = new Set();
          const actsToDelete = [];
          const sortedActs = [...allActs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          for (const act of sortedActs) {
            let key = '';
            if (act.type === 'goal_completed') {
              const goalNameMatch = act.content.match(/完成了目标: ([^(\n]+)/);
              const goalName = goalNameMatch ? goalNameMatch[1].trim() : act.content;
              key = `act-goal-${goalName}`; // One activity per goal completion
            } else if (act.type === 'login') {
              const dateStr = new Date(act.date).toISOString().split('T')[0];
              key = `act-login-${act.user}-${dateStr}`;
            } else {
              continue;
            }

            if (seenActs.has(key)) {
              actsToDelete.push(act.id);
            } else {
              seenActs.add(key);
            }
          }
          
          if (actsToDelete.length > 0) {
            console.log(`Deleting ${actsToDelete.length} duplicate activities...`);
            for (let i = 0; i < actsToDelete.length; i += 100) {
              await supabase.from('activities').delete().in('id', actsToDelete.slice(i, i + 100));
            }
          }
        }
        
        safeSetItem('last_data_repair_v4', now.toString());
        console.log('Data repair v4 completed.');
      }
    };
    
    runRepair();
  }, [isSupabaseConfigured]);

  // Auto-complete goals if all required confirmers have confirmed (handles existing data)
  useEffect(() => {
    if (!loading && goals.length > 0) {
      const pendingAutoCompletes = goals.filter(goal => {
        if (goal.progress >= 100 && goal.completedAt) return false;
        const assignees = goal.assignees || (goal.assignee ? [goal.assignee] : []);
        const requiredConfirmers = assignees.length > 0 ? assignees : ['爸爸'];
        const confirmations = goal.confirmations || {};
        return requiredConfirmers.every(r => confirmations[r]);
      });

      if (pendingAutoCompletes.length > 0) {
        pendingAutoCompletes.forEach(goal => {
          handleConfirmCompletion(goal.id, Object.keys(goal.confirmations || {})[0] || '系统');
        });
      }
    }
  }, [goals, loading]);



  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase.channel('db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, payload => {
        if (payload.eventType === 'INSERT') {
          const g = payload.new;
          setGoals(prev => {
            if (prev.some(p => p.id === g.id)) return prev;
            return [...prev, {
              id: g.id, name: g.name, description: g.description, startDate: g.start_date,
              endDate: g.end_date, progress: g.progress, creator: g.creator,
              assignees: g.assignees, assignee: g.assignee, signature: g.signature,
              priority: g.priority, completedAt: g.completed_at, confirmations: g.confirmations,
              type: g.type || 'family'
            }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const g = payload.new;
          setGoals(prev => prev.map(p => p.id === g.id ? {
            id: g.id, name: g.name, description: g.description, startDate: g.start_date,
            endDate: g.end_date, progress: g.progress, creator: g.creator,
            assignees: g.assignees, assignee: g.assignee, signature: g.signature,
            priority: g.priority, completedAt: g.completed_at, confirmations: g.confirmations,
            type: g.type || 'family'
          } : p));
        } else if (payload.eventType === 'DELETE') {
          setGoals(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goal_comments' }, payload => {
        if (payload.eventType === 'INSERT') {
          const c = payload.new;
          setGoalComments(prev => {
            if (prev.some(p => p.id === c.id)) return prev;
            return [...prev, {
              id: c.id, goal_id: c.goal_id, user: c.user, content: c.content, date: c.date
            }];
          });
        } else if (payload.eventType === 'DELETE') {
          setGoalComments(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => {
        setTxs(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          const newList = [...prev, payload.new as Transaction];
          // Keep only last 1000 transactions in state to prevent memory issues
          return newList.length > 1000 ? newList.slice(-1000) : newList;
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'achievements' }, payload => {
        setAchs(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          return [...prev, {
            id: payload.new.id, member: payload.new.member, achId: payload.new.ach_id, date: payload.new.date
          }];
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, payload => {
        if (payload.eventType === 'INSERT') {
          const r = payload.new;
          setRewards(prev => {
            if (prev.some(p => p.id === r.id)) return prev;
            return [...prev, {
              id: r.id, name: r.name, cost: r.cost, description: r.description,
              isActive: r.is_active, isCustom: r.is_custom, iconName: r.icon_name,
              targetType: r.target_type || 'personal'
            }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const r = payload.new;
          setRewards(prev => prev.map(p => p.id === r.id ? {
            id: r.id, name: r.name, cost: r.cost, description: r.description,
            isActive: r.is_active, isCustom: r.is_custom, iconName: r.icon_name,
            targetType: r.target_type || 'personal'
          } : p));
        } else if (payload.eventType === 'DELETE') {
          setRewards(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (payload.eventType === 'INSERT') {
          const m = payload.new;
          setMessages(prev => {
            if (prev.some(p => p.id === m.id)) return prev;
            
            let extra: any = {};
            try {
              if (m.avatar && m.avatar.startsWith('{')) {
                extra = JSON.parse(m.avatar);
              }
            } catch(e) {}

            const newMsg = {
              id: m.id,
              user: m.user_name,
              content: m.content,
              date: m.date,
              likes: m.likes,
              avatar: m.avatar,
              color: m.color,
              font_size: m.font_size,
              speed: extra.s || extra.speed,
              effect: extra.e || extra.effect,
              duration: extra.d || extra.duration
            };
            const newList = [...prev, newMsg];
            // Keep only last 200 messages in state to prevent memory issues
            return newList.length > 200 ? newList.slice(-200) : newList;
          });
        } else if (payload.eventType === 'UPDATE') {
          const m = payload.new;
          setMessages(prev => prev.map(p => p.id === m.id ? {
            ...p,
            likes: m.likes,
            content: m.content,
            user: m.user_name
          } : p));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = payload.new;
            setProfiles(prev => {
                const idx = prev.findIndex(pr => pr.role === p.role);
                const newProfile = { 
                    role: p.role, 
                    pin: p.pin, 
                    layout_config: p.layout_config || DEFAULT_LAYOUT,
                    avatar_url: p.avatar_url
                };
                if (idx >= 0) {
                    const newProfiles = [...prev];
                    newProfiles[idx] = newProfile;
                    return newProfiles;
                }
                return [...prev, newProfile];
            });
            // Note: We use a ref or check state inside the setter to avoid closure issues
            // But for layout, we'll handle it in a separate useEffect watching profiles
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, payload => {
        setActivities(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          const newAct = {
            id: payload.new.id,
            user: payload.new.user_name,
            type: payload.new.type as ActivityType,
            content: payload.new.content,
            date: payload.new.date,
            metadata: payload.new.metadata
          };
          return [newAct, ...prev].slice(0, 50);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Automatic Login Points
  useEffect(() => {
    if (currentUser && txs.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const hasLoggedInToday = txs.some(t => 
        t.member === currentUser && 
        t.reason === '每日登录奖励' && 
        t.date.startsWith(today)
      );

      if (!hasLoggedInToday) {
        const awardLoginPoints = async () => {
          try {
            await supabase.from('transactions').insert({
              id: generateId(),
              member: currentUser,
              amount: 1,
              reason: '每日登录奖励',
              type: 'earned',
              date: new Date().toISOString()
            });
            showToast('每日登录奖励 +1 积分');
          } catch (e) {
            console.error('Failed to award login points:', e);
          }
        };
        awardLoginPoints();
      }
    }
  }, [currentUser, txs.length]); // Only run when user changes or txs list is first loaded

  // Sync layout when profiles change (handles real-time layout updates for current user)
  useEffect(() => {
    if (currentUser) {
      const myProfile = profiles.find(p => p.role === currentUser);
      if (myProfile && JSON.stringify(myProfile.layout_config) !== JSON.stringify(layout)) {
        setLayout(myProfile.layout_config);
      }
    }
  }, [profiles, currentUser]);

  useEffect(() => { if (currentUser) safeSetItem(CURRENT_USER_KEY, currentUser); }, [currentUser]);

  useEffect(() => {
    if (!currentUser && taskTab === 'mine') {
      setTaskTab('family');
    }
  }, [currentUser]);

  const [filter, setFilter] = useState<FilterType>('待处理');
  const [taskTab, setTaskTab] = useState<'mine' | 'family'>(currentUser ? 'mine' : 'family');
  const [lbTab, setLbTab] = useState<'total' | 'weekly' | 'daily'>('total');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<string | null>(null);
  const [rewardMember, setRewardMember] = useState(ROLES[0]);
  
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [isRewardEditModalOpen, setIsRewardEditModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  
  const [isMessageBoardOpen, setIsMessageBoardOpen] = useState(false);

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getDailyMessagePoints = (role: string) => {
    const today = new Date().toISOString().split('T')[0];
    const activeReasons = ['发送留言弹幕奖励', '任务留言奖励'];
    return txs
      .filter(t => t.member === role && (t.type === 'earned' || t.type === 'earn') && t.date.startsWith(today) && activeReasons.includes(t.reason))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const memberStats = useMemo(() => {
    return calculateMemberStats(ROLES, goals, txs);
  }, [goals, txs]);

  const familyStats = useMemo(() => {
    return calculateFamilyStats(txs);
  }, [txs]);

  const nextFamilyReward = useMemo(() => {
    const familyRewards = rewards.filter(r => r.isActive && r.targetType === 'family').sort((a, b) => a.cost - b.cost);
    const next = familyRewards.find(r => r.cost > familyStats.pts);
    return next || familyRewards[familyRewards.length - 1] || { cost: 1000, name: '神秘大奖' };
  }, [rewards, familyStats.pts]);

  const topGoals = [...goals].filter(g => g.progress < 100).sort((a, b) => getGoalScore(b) - getGoalScore(a)).slice(0, 5);

  // --- New Components moved outside ---

  useEffect(() => {
    const newAchs: Achievement[] = [], newTxs: Transaction[] = [];
    const now = new Date().toISOString();
    
    ROLES.forEach(role => {
      const stats = memberStats.find(m => m.role === role);
      if (!stats) return;
      
      const mGoals = goals.filter(g => (g.assignees?.includes(role) || g.assignee === role) && g.progress === 100);
      const mAchIds = achs.filter(a => a.member === role).map(a => a.achId);
      
      ACHIEVEMENTS.forEach(def => {
        if (mAchIds.includes(def.id)) return;
        
        let unlocked = false;
        if (def.id === 'a1' && mGoals.length >= 1) unlocked = true;
        if (def.id === 'a2' && stats.earned >= 50) unlocked = true;
        if (def.id === 'a3' && stats.earned >= 100) unlocked = true;
        if (def.id === 'a4' && stats.earned >= 200) unlocked = true;
        if (def.id === 'a5' && mGoals.filter(g => g.priority === '高').length >= 3) unlocked = true;
        
        if (unlocked) {
          const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
          newAchs.push({ id: uuid, member: role, achId: def.id, date: now });
          if (def.bonus) {
            const txUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            newTxs.push({ id: txUuid, date: now, member: role, amount: def.bonus, reason: `解锁成就: ${def.name}`, type: 'earned' });
          }
        }
      });
    });

    if (newAchs.length > 0 || newTxs.length > 0) {
      if (newAchs.length > 0) setAchs(p => [...p, ...newAchs]);
      if (newTxs.length > 0) setTxs(p => [...p, ...newTxs]);
    }
  }, [goals, memberStats]); // Removed txs and achs from dependencies to prevent infinite loop

  const handleUpdateProgress = async (id: string, progress: number) => {
    // Optimistic Update
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress } : g));
    
    try {
      const { error } = await supabase.from('goals').update({ progress }).eq('id', id);
      if (error) throw error;
      showToast('进度已更新');
    } catch (e) {
      console.error(e);
      showToast('更新失败，请重试', 'error');
      // Rollback would be here
    }
  };

  const handleAddGoalComment = async (goalId: string, content: string, image?: string, replyTo?: string) => {
    if (!currentUser) return;
    const newCommentId = generateId();
    const newCommentDate = new Date().toISOString();
    const newCommentObj: GoalComment = {
      id: newCommentId,
      goal_id: goalId,
      user: currentUser,
      content,
      date: newCommentDate,
      image,
      replyTo
    };

    // Optimistic Update
    setGoalComments(prev => [...prev, newCommentObj]);

    try {
      const { error } = await supabase.from('goal_comments').insert({
        id: newCommentId,
        goal_id: goalId,
        user: currentUser,
        content,
        date: newCommentDate,
        image,
        reply_to: replyTo
      });
      if (error) throw error;
      
      // Award 1 point, max 3 per day for active rewards (danmaku + comments)
      const currentDaily = getDailyMessagePoints(currentUser);
      const earnedPoints = currentDaily < 3;
      addActivity('danmaku', `在任务讨论中留言: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}${earnedPoints ? ' (+1 积分)' : ''}`);

      if (earnedPoints) {
        await supabase.from('transactions').insert({
          id: generateId(),
          member: currentUser,
          amount: 1,
          reason: '任务留言奖励',
          type: 'earned',
          date: new Date().toISOString()
        });
        showToast('留言成功，积分 +1');
      } else {
        showToast('留言成功 (今日留言积分已达上限)');
      }
    } catch (e) {
      console.error('Comment failed:', e);
      showToast('留言失败', 'error');
      // Rollback
      setGoalComments(prev => prev.filter(c => c.id !== newCommentId));
    }
  };

  const handleMarkAsDone = async (id: string) => {
    try {
      await supabase.from('goals').update({ progress: 99 }).eq('id', id);
      showToast('已标记为完成，等待全家确认');
    } catch (e) {
      console.error(e);
      showToast('操作失败', 'error');
    }
  };

  const handleConfirmCompletion = async (id: string, member: string) => {
    try {
      const goal = goals.find(g => g.id === id);
      if (!goal) return;
      
      const confirmations = { ...(goal.confirmations || {}), [member]: true };
      const goalAssignees = Array.from(new Set((goal.assignees || (goal.assignee ? [goal.assignee] : [])).filter(Boolean)));
      const requiredConfirmers = goalAssignees.length > 0 ? goalAssignees : ['爸爸'];
      const allConfirmed = requiredConfirmers.every(r => confirmations[r]);
      const updates: any = { confirmations };
      
      if (allConfirmed && !goal.completedAt) {
        // ATOMIC UPDATE: Only award points if we successfully set completed_at from null
        const { data: updateData, error: updateError } = await supabase
          .from('goals')
          .update({
            ...updates,
            completed_at: new Date().toISOString(),
            progress: 100
          })
          .eq('id', id)
          .is('completed_at', null)
          .select();

        if (updateError) throw updateError;

        // If updateData is empty, someone else already completed this goal
        if (updateData && updateData.length > 0) {
          const isEarly = new Date() < new Date(goal.endDate);
          const isTeam = goalAssignees.length > 1;
          
          // Calculate points based on user's request:
          // 1. Base points (10) are shared among participants.
          // 2. Early bonus (3) is shared among participants.
          // 3. Team bonus (3) is awarded to EACH person if there's more than 1 participant.
          const baseTotal = 10;
          const earlyTotal = isEarly ? 3 : 0;
          const sharedPointsPerPerson = Math.ceil((baseTotal + earlyTotal) / goalAssignees.length);
          const teamBonusPerPerson = isTeam ? 3 : 0;
          const pointsPerPerson = sharedPointsPerPerson + teamBonusPerPerson;

          const membersStr = goalAssignees.join('、');
          const breakdownStr = `基础分配: ${Math.ceil(baseTotal / goalAssignees.length)}${isEarly ? `, 提前奖励: ${Math.ceil(earlyTotal / goalAssignees.length)}` : ''}${isTeam ? `, 团队协作: ${teamBonusPerPerson}` : ''}`;
          
          addActivity('goal_completed', `团队 [${membersStr}] 完成了目标: ${goal.name} (每人获得 ${pointsPerPerson} 积分: ${breakdownStr})`, { goalId: id }, '系统');
          
          const newTxs: any[] = [];
          goalAssignees.forEach(m => {
            newTxs.push({ 
              id: generateId(), 
              member: m, 
              amount: pointsPerPerson, 
              reason: `完成目标: ${goal.name} (${breakdownStr})`, 
              type: 'earned', 
              date: new Date().toISOString() 
            });
          });
          
          if (newTxs.length > 0) {
            await supabase.from('transactions').insert(newTxs);
          }
        } else {
          showToast('目标已被他人确认完成');
        }
      } else {
        // Just update confirmations
        await supabase.from('goals').update(updates).eq('id', id);
      }
      
      showToast('确认成功');
    } catch (e) {
      console.error(e);
      showToast('确认失败，请重试', 'error');
    }
  };

  const handleRedeem = async (member: string, reward: Reward) => {
    try {
      // Check if already claimed this milestone
      const alreadyClaimed = txs.some(t => t.member === member && t.reason.includes(reward.name) && t.type === 'milestone_claimed');
      if (alreadyClaimed) {
        showToast('该奖励已领取过', 'error');
        return;
      }

      const memberPts = memberStats.find(m => m.role === member)?.pts || 0;
      const familyPts = familyStats.pts;

      if (reward.targetType === 'family') {
        if (familyPts >= reward.cost) {
          const newTx = { 
            id: generateId(),
            member: '家庭', 
            amount: 0, // Milestone rewards don't deduct points
            reason: `全家里程碑达成: ${reward.name}`, 
            type: 'milestone_claimed',
            date: new Date().toISOString()
          };
          await supabase.from('transactions').insert(newTx);
          showToast(`全家达成里程碑: ${reward.name}！`);
        } else {
          showToast(`全家总积分不足 (当前: ${familyPts}/${reward.cost})`, 'error');
        }
      } else {
        if (memberPts >= reward.cost) {
          const newTx = { 
            id: generateId(),
            member: member, 
            amount: 0, // Milestone rewards don't deduct points
            reason: `个人里程碑达成: ${reward.name}`, 
            type: 'milestone_claimed',
            date: new Date().toISOString()
          };
          await supabase.from('transactions').insert(newTx);
          showToast(`恭喜获得个人奖励: ${reward.name}！`);
        } else {
          showToast(`个人积分不足 (当前: ${memberPts}/${reward.cost})`, 'error');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('领取失败，请重试', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('goals').delete().eq('id', id);
      setIsDeleteModalOpen(false);
      setGoalToDelete(null);
      showToast('目标已删除');
    } catch (e) {
      console.error(e);
      showToast('删除失败，请重试', 'error');
    }
  };

  const handleSaveGoal = async (goalData: Omit<Goal, 'id'>) => {
    const newId = generateId();
    const uniqueAssignees = Array.from(new Set(goalData.assignees.filter(Boolean)));
    const dbGoal = {
      name: goalData.name,
      description: goalData.description,
      start_date: goalData.startDate,
      end_date: goalData.endDate,
      progress: goalData.progress,
      creator: goalData.creator,
      assignees: uniqueAssignees,
      assignee: uniqueAssignees[0] || '爸爸',
      signature: goalData.signature,
      priority: goalData.priority,
      confirmations: goalData.confirmations || {},
      type: goalData.type || (uniqueAssignees.length > 1 ? 'family' : 'personal')
    };

    const optimisticGoal: Goal = {
      ...goalData,
      assignees: uniqueAssignees,
      assignee: uniqueAssignees[0] || '爸爸',
      id: editingGoal ? editingGoal.id : newId,
      confirmations: goalData.confirmations || {}
    };

    console.log('Saving goal:', optimisticGoal);

    // Optimistic Update
    if (editingGoal) {
      setGoals(prev => prev.map(g => g.id === editingGoal.id ? optimisticGoal : g));
    } else {
      setGoals(prev => [...prev, optimisticGoal]);
      addActivity('goal_created', `创建了新目标: ${goalData.name}`, { goalId: newId });
    }

    setIsModalOpen(false);
    setEditingGoal(null);

    try {
      if (editingGoal) {
        const { error } = await supabase.from('goals').update(dbGoal).eq('id', editingGoal.id);
        if (error) {
          if (error.code === '42703' || error.message?.toLowerCase().includes('column')) {
            // Try stripping all potentially new columns
            const { type, confirmations, signature, assignees, ...dbGoalLegacy } = dbGoal as any;
            const { error: retryError } = await supabase.from('goals').update(dbGoalLegacy).eq('id', editingGoal.id);
            if (retryError) throw retryError;
            showToast('目标已更新 (部分新功能因数据库版本较低已禁用)');
          } else {
            throw error;
          }
        } else {
          showToast('目标已更新');
        }
      } else {
        const { error } = await supabase.from('goals').insert({ ...dbGoal, id: newId });
        if (error) {
          if (error.code === '42703' || error.message?.toLowerCase().includes('column')) {
            // Try stripping all potentially new columns
            const { type, confirmations, signature, assignees, ...dbGoalLegacy } = dbGoal as any;
            const { error: retryError } = await supabase.from('goals').insert({ ...dbGoalLegacy, id: newId });
            if (retryError) throw retryError;
            showToast('新目标创建成功 (部分新功能因数据库版本较低已禁用)');
          } else {
            console.error('Supabase insert error:', error);
            throw error;
          }
        } else {
          showToast('新目标创建成功');
        }
      }
    } catch (e: any) {
      console.error('Save goal failed:', e);
      showToast(`保存失败: ${e.message || '请重试'}`, 'error');
      // Rollback optimistic update
      if (!editingGoal) {
        setGoals(prev => prev.filter(g => g.id !== newId));
      }
    }
  };

  const handleRecoverFromLocal = async () => {
    if (!window.confirm('这将尝试从浏览器本地缓存读取旧版数据并同步到数据库。\n\n适用于：\n1. 刚刚配置好数据库\n2. 之前在本地使用过且数据未丢失\n\n注意：如果数据库中已有较新数据，请谨慎操作。是否继续？')) {
      return;
    }

    try {
      const localGoals = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const localTxs = JSON.parse(localStorage.getItem(TX_KEY) || '[]');
      const localAchs = JSON.parse(localStorage.getItem(ACH_KEY) || '[]');
      const localCheckIns = JSON.parse(localStorage.getItem(CHECKIN_KEY) || '[]');
      const localRewards = JSON.parse(localStorage.getItem(REWARDS_KEY) || 'null');

      let restoredCount = 0;

      if (localGoals.length > 0) {
        const mappedGoals = localGoals.map((g: any) => ({
          id: g.id, name: g.name, description: g.description, start_date: g.startDate,
          end_date: g.endDate, progress: g.progress, creator: g.creator || '爸爸',
          assignees: g.assignees || (g.assignee ? [g.assignee] : ['爸爸']),
          assignee: g.assignee, signature: g.signature || '', priority: g.priority || '中',
          completed_at: g.completedAt, confirmations: g.confirmations || {}
        }));
        const { error } = await supabase.from('goals').upsert(mappedGoals, { onConflict: 'id' });
        if (error) throw error;
        restoredCount += localGoals.length;
      }

      if (localTxs.length > 0) {
        const { error } = await supabase.from('transactions').upsert(localTxs, { onConflict: 'id' });
        if (error) throw error;
        restoredCount += localTxs.length;
      }

      if (localAchs.length > 0) {
        const mappedAchs = localAchs.map((a: any) => ({
          id: a.id, member: a.member, ach_id: a.achId, date: a.date
        }));
        const { error } = await supabase.from('achievements').upsert(mappedAchs, { onConflict: 'id' });
        if (error) throw error;
        restoredCount += localAchs.length;
      }
      
      if (localCheckIns.length > 0) {
          const mappedCheckIns = localCheckIns.map((c: any) => ({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            member: c.member, date: c.date
          }));
          const { error } = await supabase.from('checkins').upsert(mappedCheckIns, { onConflict: 'id' });
          if (error) throw error;
          restoredCount += localCheckIns.length;
      }

      if (localRewards && localRewards.length > 0) {
        const mappedRewards = localRewards.map((r: any) => ({
          id: r.id, name: r.name, cost: r.cost, description: r.description,
          is_active: r.isActive, is_custom: r.isCustom, icon_name: r.iconName,
          target_type: r.targetType || 'personal'
        }));
        const { error } = await supabase.from('rewards').upsert(mappedRewards, { onConflict: 'id' });
        if (error) throw error;
        restoredCount += localRewards.length;
      }

      if (restoredCount === 0) {
        showToast('本地缓存中没有找到数据', 'error');
      } else {
        showToast(`成功恢复 ${restoredCount} 条记录，页面即将刷新`);
        safeSetItem('family_goals_migrated', 'true');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      console.error('Recovery failed', e);
      showToast('恢复失败，请检查控制台错误', 'error');
    }
  };

  const handleExport = () => {
    const data = {
      appVersion: "2.0.0",
      goals,
      txs,
      achs,
      rewards
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-goals-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Version compatibility check
        const version = data.appVersion || '1.0.0';
        let importedGoals = data.goals || [];
        let importedRewards = data.rewards || DEFAULT_REWARDS;
        
        // Migrate from older versions
        if (version !== '2.0.0') {
          // Add confirmations object if missing
          importedGoals = importedGoals.map((g: any) => ({
            ...g,
            confirmations: g.confirmations || {},
            assignees: g.assignees || (g.assignee ? [g.assignee] : ['爸爸'])
          }));
        }

        if (window.confirm(`检测到备份文件版本: ${version}\n警告：导入数据将覆盖当前所有记录！是否继续？`)) {
          setGoals(importedGoals);
          setTxs(data.txs || []);
          setAchs(data.achs || []);
          setRewards(importedRewards);
          setIsDataModalOpen(false);
          alert('数据导入成功！');
        }
      } catch (err) {
        alert('导入失败：无效的 JSON 文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleToggleRewardActive = async (id: string) => {
    const r = rewards.find(r => r.id === id);
    if (r) {
      await supabase.from('rewards').update({ is_active: !r.isActive }).eq('id', id);
    }
  };

  const handleDeleteReward = async (id: string) => {
    await supabase.from('rewards').delete().eq('id', id);
  };

  const handleSaveReward = async (rewardData: Omit<Reward, 'id'>) => {
    const dbReward = {
      name: rewardData.name,
      cost: rewardData.cost,
      description: rewardData.description,
      is_active: rewardData.isActive,
      is_custom: rewardData.isCustom,
      icon_name: rewardData.iconName,
      target_type: rewardData.targetType,
      role: rewardData.role
    };

    if (editingReward) {
      await supabase.from('rewards').update(dbReward).eq('id', editingReward.id);
    } else {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      await supabase.from('rewards').insert({ ...dbReward, id });
    }
    
    setIsRewardEditModalOpen(false);
    setEditingReward(null);
  };

  const handleAddMessage = async (content: string, avatar?: string, color?: string, fontSize?: string, emoji?: string, speed?: number, effect?: string, duration?: number) => {
    if (!currentUser) return;

    // Aggregation logic: check for duplicate content in last 5 seconds
    const recentDuplicate = messages.find(m => 
      m.content.trim() === content.trim() && 
      (Date.now() - new Date(m.date).getTime()) < 5000
    );

    if (recentDuplicate) {
      showToast('弹幕聚合中...', 'success');
      return;
    }
    
    // Serialize extra fields into avatar since we can't alter DB schema easily
    const extraData = JSON.stringify({ s: speed, e: effect, d: duration });
    
    const newMsg = {
      id: generateId(),
      user_name: currentUser,
      content,
      date: new Date().toISOString(),
      likes: 0,
      avatar: extraData,
      color,
      font_size: fontSize || '0.9rem'
    };
    
    // Optimistic update
    setMessages(prev => [...prev, {
        id: newMsg.id,
        user: newMsg.user_name,
        content: newMsg.content,
        date: newMsg.date,
        likes: newMsg.likes,
        avatar: newMsg.avatar,
        color: newMsg.color,
        font_size: newMsg.font_size,
        speed,
        effect,
        duration
    }]);
    
    try {
        const { error } = await supabase.from('messages').insert(newMsg);
        if (error) throw error;

        // Award 1 point for sending a message, respecting daily limit
        const currentDaily = getDailyMessagePoints(currentUser);
        const earnedPoints = currentDaily < 3;
        addActivity('danmaku', `发布了弹幕: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}${earnedPoints ? ' (+1 积分)' : ''}`);

        if (earnedPoints) {
            await supabase.from('transactions').insert({
                id: generateId(),
                member: currentUser,
                amount: 1,
                type: 'earned',
                reason: '发送留言弹幕奖励',
                date: new Date().toISOString()
            });
            showToast('留言已发布，积分 +1');
        } else {
            showToast('留言已发布 (今日留言积分已达上限)');
        }
    } catch (e) {
        console.error('Message send failed:', e);
        showToast('发送失败', 'error');
        setMessages(prev => prev.filter(m => m.id !== newMsg.id));
    }
  };

  const handleLikeMessage = async (id: string) => {
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === id ? { ...m, likes: m.likes + 1 } : m));
    
    try {
        await supabase.from('messages').update({ likes: msg.likes + 1 }).eq('id', id);
    } catch (e) {
        console.error(e);
    }
  };

  const handleClearAllMessages = async () => {
    try {
      const { error } = await supabase.from('messages').delete().neq('id', '0');
      if (error) throw error;
      showToast('所有弹幕已清空');
    } catch (e) {
      console.error(e);
      showToast('清空失败', 'error');
    }
  };

  const handleDeleteMessage = async (id: string | string[]) => {
    try {
      const ids = Array.isArray(id) ? id : [id];
      const { error } = await supabase.from('messages').delete().in('id', ids);
      if (error) throw error;
      
      // Optimistic update
      setMessages(prev => prev.filter(m => !ids.includes(m.id)));
      showToast(ids.length > 1 ? `已删除 ${ids.length} 条弹幕` : '弹幕已删除');
    } catch (e) {
      console.error(e);
      showToast('删除失败', 'error');
    }
  };

  const [isBulletEnabled, setIsBulletEnabled] = useState(() => {
    const saved = localStorage.getItem('family_goals_bullet_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    safeSetItem('family_goals_bullet_enabled', JSON.stringify(isBulletEnabled));
  }, [isBulletEnabled]);

  const handleUpdateProfilePin = async (role: string, newPin: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ pin: newPin })
      .eq('role', role);
    
    if (error) {
      console.error('Error updating PIN:', error);
      showToast('更新PIN码失败', 'error');
    } else {
      setProfiles(prev => prev.map(p => p.role === role ? { ...p, pin: newPin } : p));
      showToast(`${role} 的PIN码已更新`);
    }
  };

  const handleUpdateAvatar = async (role: string, avatarUrl: string) => {
    try {
      // 尝试使用 upsert 更新或插入
      const { error } = await supabase
        .from('profiles')
        .upsert({ role, avatar_url: avatarUrl }, { onConflict: 'role' });
      
      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(error.message || '数据库写入失败');
      }
      
      // 成功后更新本地状态
      setProfiles(prev => prev.map(p => p.role === role ? { ...p, avatar_url: avatarUrl } : p));
      
      showToast('头像已更新');
      setIsSettingsModalOpen(false);
    } catch (err: any) {
      console.error('Full error object:', err);
      // 显示具体的错误原因，方便排查
      const errorMsg = err.message || '未知错误';
      showToast(`更新失败: ${errorMsg}`, 'error');
    }
  };

  const leaderboard = useMemo(() => {
    const now = new Date().getTime();
    return ROLES.map(role => {
      const mTx = txs.filter(t => t.member === role && t.type === 'earned');
      let pts = 0;
      if (lbTab === 'total') pts = mTx.reduce((s, t) => s + t.amount, 0);
      else if (lbTab === 'weekly') pts = mTx.filter(t => (now - new Date(t.date).getTime()) <= 604800000).reduce((s, t) => s + t.amount, 0);
      else if (lbTab === 'daily') pts = mTx.filter(t => t.date.startsWith(new Date().toISOString().split('T')[0])).reduce((s, t) => s + t.amount, 0);
      const st = memberStats.find(m => m.role === role);
      return { role, pts, badge: st?.badge, badgeColor: st?.badgeColor };
    }).sort((a, b) => b.pts - a.pts);
  }, [txs, lbTab, memberStats]);

  const filteredGoals = goals.filter(g => {
    if (filter === '待处理') return g.progress < 100 || !g.completedAt;
    if (filter === '已完成') return g.progress >= 100 && g.completedAt;
    return true;
  }).sort((a, b) => {
    // 1. Completed tasks at the very bottom
    const aDone = a.progress >= 100 && a.completedAt;
    const bDone = b.progress >= 100 && b.completedAt;
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;

    // 2. Current user's tasks first
    const aIsMine = currentUser ? (a.assignees?.includes(currentUser) || a.assignee === currentUser) : false;
    const bIsMine = currentUser ? (b.assignees?.includes(currentUser) || b.assignee === currentUser) : false;
    if (aIsMine && !bIsMine) return -1;
    if (!aIsMine && bIsMine) return 1;
    
    // 3. Status priority: In Progress > Planned > Pending Confirmation
    const getStatusWeight = (g: Goal) => {
      if (g.progress > 0 && g.progress < 99) return 0; // In Progress
      if (g.progress === 0) return 1; // Planned
      if (g.progress >= 99 && !g.completedAt) return 2; // Pending Confirmation
      return 3;
    };
    const weightA = getStatusWeight(a);
    const weightB = getStatusWeight(b);
    if (weightA !== weightB) return weightA - weightB;

    // 4. Then by date (newest first)
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
    if (isNaN(dateA) || isNaN(dateB)) return 0;
    return dateB - dateA;
  });

  const isAdmin = currentUser === '管理员';

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername === 'admin' && adminPassword === 'password') {
      setCurrentUser('管理员');
      setShowAdminLogin(false);
      setAdminUsername('');
      setAdminPassword('');
      setAdminError('');
    } else {
      setAdminError('用户名或密码错误');
    }
  };

  const handleLogin = async (role: string, pin: string) => {
    console.log('Attempting login for role:', role, 'with pin:', pin);
    console.log('Current profiles count:', profiles.length);
    // For admin, use hardcoded password for now
    if (role === '管理员') {
      if (pin === 'admin123') { // Simple admin password
        console.log('Admin login successful');
        setCurrentUser('管理员');
        return true;
      }
      console.log('Admin login failed');
      return false;
    }

    // For family members, check profile pin
    const profile = profiles.find(p => p.role === role);
    if (profile) {
      console.log(`Found profile for role: ${role}`);
      console.log(`Comparing PINs: DB="${profile.pin}" (len: ${profile.pin?.length}) vs Input="${pin}" (len: ${pin?.length})`);
      
      if (profile.pin?.trim() === pin.trim()) {
        console.log('Login successful');
        setCurrentUser(role);

        // Daily Login Bonus
        try {
            const today = getLocalDateString(new Date());
            const { data: checkins } = await supabase
              .from('checkins')
              .select('*')
              .eq('member', role)
              .eq('date', today);
              
            const isFirstLogin = !checkins || checkins.length === 0;
            addActivity('login', `进入了系统${isFirstLogin ? ' (+1 积分)' : ''}`, null, role);

            if (isFirstLogin) {
              // First login today
              const checkinId = generateId();
              await supabase.from('checkins').insert({ id: checkinId, member: role, date: today });
              
              const txId = generateId();
              const bonusAmount = 1;
              await supabase.from('transactions').insert({
                id: txId,
                member: role,
                amount: bonusAmount,
                reason: '每日登录奖励',
                type: 'earned',
                date: new Date().toISOString()
              });
              showToast(`每日登录奖励 +${bonusAmount} 分`, 'success');
            }
        } catch (e) {
            console.error('Error processing daily login bonus:', e);
        }

        // Load user layout
        if (profile.layout_config) {
          setLayout(profile.layout_config);
        } else {
          setLayout(DEFAULT_LAYOUT);
        }
        return true;
      }
    }
    
    // Fallback: if no profiles loaded (e.g. table missing), allow default PIN '1183'
    if (profiles.length === 0 && pin === '1183') {
      console.log('No profiles loaded, allowing default PIN 1183');
      setCurrentUser(role);
      setLayout(DEFAULT_LAYOUT);
      return true;
    }

    console.log('Login failed: No profile found or PIN mismatch');
    return false;
  };

  const handleSaveLayout = async (newLayout: LayoutConfig) => {
    setLayout(newLayout);
    if (currentUser && currentUser !== '管理员') {
      const { error } = await supabase
        .from('profiles')
        .update({ layout_config: newLayout })
        .eq('role', currentUser);
        
      if (error) {
        console.error('Error saving layout:', error);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 font-sans text-stone-800">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Users className="w-8 h-8 text-orange-500" />
            {loading && (
              <div className="absolute -top-1 -right-1 w-5 h-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin bg-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">欢迎来到家庭目标</h1>
          <p className="text-stone-500 mb-8">请选择您的角色。注意：角色选择后将无法更改。</p>
          
          {profilesTableMissing && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm flex flex-col items-start gap-3 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">数据库连接异常</p>
                  <p>无法连接到 `profiles` 表。请确保已在 Supabase 运行 SQL 脚本。如果已运行，请尝试点击下方按钮重置本地缓存。</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  localStorage.removeItem('family_goals_migrated');
                  window.location.reload();
                }}
                className="mt-2 px-4 py-2 bg-amber-200 hover:bg-amber-300 rounded-xl font-bold transition-colors text-amber-800"
              >
                重置并刷新
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => { 
                  console.log('Role clicked:', role);
                  setLoginRole(role); 
                  setIsLoginModalOpen(true); 
                }}
                className="py-4 px-4 rounded-2xl border-2 border-stone-100 hover:border-orange-500 hover:bg-orange-50 transition-all font-medium text-lg cursor-pointer"
              >
                {role}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setLoginRole('管理员'); setIsLoginModalOpen(true); }}
            className="w-full py-4 px-4 rounded-2xl border-2 border-stone-100 hover:border-blue-500 hover:bg-blue-50 transition-all font-medium text-lg text-stone-600 hover:text-blue-600 cursor-pointer flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" />
            管理员 (可管理所有项目)
          </button>
        </motion.div>

        <AnimatePresence>
          {isLoginModalOpen && (
            <LoginModal
              isOpen={isLoginModalOpen}
              initialRole={loginRole}
              profiles={profiles}
              onLogin={handleLogin}
              onClose={() => setIsLoginModalOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-stone-800 pb-20">
      <header className="bg-white shadow-sm border-b border-orange-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-red-500 fill-current" />
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm leading-none">
                DDYY@ME
              </h1>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full tracking-normal whitespace-nowrap flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                V2.4全自动化版
              </span>
            </div>
            {loading && (
              <div className="w-3 h-3 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="group relative flex items-center gap-2 bg-stone-50 hover:bg-stone-100 p-1 pr-3 rounded-full border border-stone-200 transition-all cursor-pointer"
                title="个人设置"
              >
                <UserAvatar role={currentUser} profiles={profiles} className="w-8 h-8" />
                <span className="text-sm font-bold text-stone-700">{currentUser}</span>
                <Settings className="w-3.5 h-3.5 text-stone-400 group-hover:text-indigo-500 transition-colors" />
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="text-xs font-medium text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              退出
            </button>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAdminDashboardOpen(true)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95"
                >
                  <Shield className="w-4 h-4" />
                  管理后台
                </button>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsProfileModalOpen(true)}
                    className="p-2 text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer"
                    title="成员管理"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setIsDataModalOpen(true)}
                    className="p-2 text-stone-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors cursor-pointer"
                    title="数据管理"
                  >
                    <Database className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
            <button 
              onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium text-sm transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新建目标</span>
            </button>
          </div>
        </div>
      </header>

        <main className="max-w-5xl mx-auto px-4 pb-24 space-y-8">
          
          {/* 1. Family Hero Section (Total Points) */}
          <FamilyHero familyPts={familyStats.pts} nextMilestone={nextFamilyReward.cost} nextRewardName={nextFamilyReward.name} transactions={txs} />

          {/* 2. Danmaku Board with Integrated Race Chart */}
          <DanmakuBoard 
            messages={messages} 
            onSend={handleAddMessage} 
            currentUser={currentUser} 
            profiles={profiles} 
            memberStats={memberStats} 
            isAdmin={isAdmin}
            onClearAll={handleClearAllMessages}
            onDeleteMessage={handleDeleteMessage}
            onToggleBullet={() => setIsBulletEnabled(!isBulletEnabled)}
            isBulletEnabled={isBulletEnabled}
            isExpanded={showDanmakuBoard}
            onToggle={() => setShowDanmakuBoard(!showDanmakuBoard)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RecentActivity 
              activities={activities} 
              profiles={profiles} 
              isExpanded={isActivitiesExpanded} 
              onToggle={() => setIsActivitiesExpanded(!isActivitiesExpanded)} 
              tableMissing={activitiesTableMissing}
              isAdmin={isAdmin}
            />
            <PointsDynamics 
              transactions={txs} 
              profiles={profiles} 
              isExpanded={isWeeklyGrowthExpanded}
              onToggle={() => setIsWeeklyGrowthExpanded(!isWeeklyGrowthExpanded)}
            />
          </div>

          {/* 3. Personal Dashboard (If logged in) */}
          {currentUser && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <UserAvatar role={currentUser} profiles={profiles} className="w-12 h-12 text-2xl border-2 border-white/30" />
                  <div>
                    <h3 className="font-bold text-lg">我的概览</h3>
                    <p className="text-white/80 text-xs">加油，{currentUser}！</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="text-3xl font-black">{memberStats.find(m => m.role === currentUser)?.pts || 0}</div>
                  <div className="text-xs text-white/60">当前积分</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="text-xs text-white/60 mb-1">待办任务</div>
                  <div className="font-bold text-lg">
                    {goals.filter(g => (g.assignees?.includes(currentUser) || g.assignee === currentUser) && g.progress < 100).length}
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="text-xs text-white/60 mb-1">本周获得</div>
                  <div className="font-bold text-lg">
                    {memberStats.find(m => m.role === currentUser)?.weekly.reduce((a,b)=>a+b, 0) || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Task Center */}
          <div className="bg-stone-50 rounded-[2.5rem] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                <Target className="w-7 h-7 text-orange-500" />
                任务中心
              </h2>
              <button 
                onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
                className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-stone-200 transition-all flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> 新建目标
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center p-1 bg-stone-100 rounded-2xl w-full sm:w-fit">
                <button
                  onClick={() => setTaskTab('mine')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    taskTab === 'mine' 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <User className="w-4 h-4" /> 与我相关
                </button>
                <button
                  onClick={() => setTaskTab('family')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    taskTab === 'family' 
                      ? 'bg-white text-stone-800 shadow-sm' 
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <Users className="w-4 h-4" /> 家庭全部
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {(['全部', '待处理', '已完成'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      filter === f 
                        ? 'bg-stone-900 text-white shadow-lg shadow-stone-200 scale-105' 
                        : 'bg-white text-stone-500 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Grid */}
            {(() => {
              const isAdmin = currentUser === '管理员';
              const displayGoals = taskTab === 'mine' 
                ? filteredGoals.filter(g => (isAdmin || g.assignees?.includes(currentUser || '') || g.assignee === currentUser))
                : filteredGoals.filter(g => (isAdmin || g.type === 'family' || g.assignees?.includes(currentUser || '') || g.assignee === currentUser));

              if (displayGoals.length === 0) {
                return (
                  <div className="text-center py-16 bg-white rounded-3xl border border-stone-100 border-dashed">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Target className="w-8 h-8 text-stone-300" />
                    </div>
                    <p className="text-stone-500 font-medium">暂无相关任务</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {displayGoals.map(goal => (
                      <GoalCard 
                        key={goal.id} 
                        goal={goal} 
                        currentUser={currentUser || ''}
                        profiles={profiles}
                        onUpdateProgress={(val) => handleUpdateProgress(goal.id, val)}
                        onMarkAsDone={() => handleMarkAsDone(goal.id)}
                        onConfirm={(member) => handleConfirmCompletion(goal.id, member)}
                        onEdit={() => { setEditingGoal(goal); setIsModalOpen(true); }}
                        onDelete={() => { setGoalToDelete(goal.id); setIsDeleteModalOpen(true); }}
                        comments={goalComments.filter(c => c.goal_id === goal.id)}
                        onAddComment={(content, image, replyTo) => handleAddGoalComment(goal.id, content, image, replyTo)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              );
            })()}
          </div>

          {/* 6. Rewards Section (Milestone Style) */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                  <Gift className="w-7 h-7 text-pink-500" />
                  积分里程碑
                </h2>
                <p className="text-sm text-stone-400 mt-1">达成积分目标，解锁家庭惊喜</p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => setIsRewardModalOpen(true)}
                  className="text-stone-400 hover:text-stone-600 p-2 hover:bg-stone-50 rounded-full transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="space-y-12">
              {/* Personal Milestone Tracks */}
              {isAdmin ? (
                // Admin sees everyone's tracks
                ROLES.filter(r => r !== '管理员').map(role => {
                  const mStats = memberStats.find(m => m.role === role);
                  const pts = mStats?.pts || 0;
                  const roleRewards = rewards.filter(r => r.isActive && r.targetType === 'personal' && (!r.role || r.role === role));
                  if (roleRewards.length === 0) return null;

                  return (
                    <div key={role} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                          <UserAvatar role={role} profiles={profiles} className="w-6 h-6" />
                          {role} 的里程碑
                        </h3>
                        <div className="text-sm font-bold text-emerald-500">
                          当前积分: {pts}
                        </div>
                      </div>
                      <div className="relative pt-8 pb-4 px-4 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <div className="absolute top-1/2 left-4 right-4 h-2 bg-emerald-200 -translate-y-1/2 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (pts / Math.max(...roleRewards.map(r => r.cost), 1)) * 100)}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                        <div className="relative flex justify-between items-center">
                          {roleRewards.sort((a, b) => a.cost - b.cost).map(reward => {
                            const isReached = pts >= reward.cost;
                            const isClaimed = txs.some(t => t.member === role && t.reason.includes(reward.name) && t.type === 'milestone_claimed');
                            return (
                              <div key={reward.id} className="flex flex-col items-center gap-2 relative z-10">
                                <button 
                                  onClick={() => handleRedeem(role, reward)}
                                  disabled={!isReached || isClaimed}
                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                                    isClaimed
                                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                      : isReached 
                                        ? 'bg-white text-emerald-500 hover:scale-110 cursor-pointer' 
                                        : 'bg-emerald-200 text-emerald-400 cursor-not-allowed'
                                  }`}
                                >
                                  {isClaimed ? <CheckCircle2 className="w-6 h-6" /> : (ICONS[reward.iconName || 'Gift'] ? React.createElement(ICONS[reward.iconName || 'Gift'], { className: "w-6 h-6" }) : <Gift className="w-6 h-6" />)}
                                </button>
                                <div className="text-center">
                                  <div className={`text-[10px] font-bold ${isReached ? 'text-emerald-500' : 'text-emerald-400'}`}>{reward.cost} 分</div>
                                  <div className="text-[10px] text-stone-600 font-medium max-w-[60px] truncate">{reward.name}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Members see only their own track
                currentUser && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                        <User className="w-6 h-6 text-emerald-500" />
                        我的里程碑
                      </h3>
                      <div className="text-sm font-bold text-emerald-500">
                        我的积分: {memberStats.find(m => m.role === currentUser)?.pts || 0}
                      </div>
                    </div>
                    <div className="relative pt-8 pb-4 px-4 bg-emerald-50 rounded-3xl border border-emerald-100">
                      <div className="absolute top-1/2 left-4 right-4 h-2 bg-emerald-200 -translate-y-1/2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((memberStats.find(m => m.role === currentUser)?.pts || 0) / Math.max(...rewards.filter(r => r.targetType === 'personal' && (!r.role || r.role === currentUser)).map(r => r.cost), 1)) * 100)}%` }}
                          className="h-full bg-emerald-500"
                        />
                      </div>
                      <div className="relative flex justify-between items-center">
                        {rewards.filter(r => r.isActive && r.targetType === 'personal' && (!r.role || r.role === currentUser)).sort((a, b) => a.cost - b.cost).map(reward => {
                          const pts = memberStats.find(m => m.role === currentUser)?.pts || 0;
                          const isReached = pts >= reward.cost;
                          const isClaimed = txs.some(t => t.member === currentUser && t.reason.includes(reward.name) && t.type === 'milestone_claimed');
                          return (
                            <div key={reward.id} className="flex flex-col items-center gap-2 relative z-10">
                              <button 
                                onClick={() => handleRedeem(currentUser, reward)}
                                disabled={!isReached || isClaimed}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                                  isClaimed
                                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                    : isReached 
                                      ? 'bg-white text-emerald-500 hover:scale-110 cursor-pointer' 
                                      : 'bg-emerald-200 text-emerald-400 cursor-not-allowed'
                                }`}
                              >
                                {isClaimed ? <CheckCircle2 className="w-6 h-6" /> : (ICONS[reward.iconName || 'Gift'] ? React.createElement(ICONS[reward.iconName || 'Gift'], { className: "w-6 h-6" }) : <Gift className="w-6 h-6" />)}
                              </button>
                              <div className="text-center">
                                <div className={`text-[10px] font-bold ${isReached ? 'text-emerald-500' : 'text-emerald-400'}`}>{reward.cost} 分</div>
                                <div className="text-[10px] text-stone-600 font-medium max-w-[60px] truncate">{reward.name}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Family Milestone Track */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                    <Users className="w-6 h-6 text-indigo-500" />
                    全家里程碑
                  </h3>
                  <div className="text-sm font-bold text-indigo-500">
                    全家总分: {familyStats.pts}
                  </div>
                </div>
                <div className="relative pt-8 pb-4 px-4 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <div className="absolute top-1/2 left-4 right-4 h-2 bg-indigo-200 -translate-y-1/2 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (familyStats.pts / Math.max(...rewards.filter(r => r.targetType === 'family').map(r => r.cost), 1)) * 100)}%` }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                  <div className="relative flex justify-between items-center">
                    {rewards.filter(r => r.isActive && r.targetType === 'family').sort((a, b) => a.cost - b.cost).map(reward => {
                      const isReached = familyStats.pts >= reward.cost;
                      const isClaimed = txs.some(t => t.member === '家庭' && t.reason.includes(reward.name) && t.type === 'milestone_claimed');
                      return (
                        <div key={reward.id} className="flex flex-col items-center gap-2 relative z-10">
                          <button 
                            onClick={() => handleRedeem(currentUser || '爸爸', reward)}
                            disabled={!currentUser || !isReached || isClaimed}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                              isClaimed
                                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                : isReached 
                                  ? 'bg-white text-indigo-500 hover:scale-110 cursor-pointer' 
                                  : 'bg-indigo-200 text-indigo-400 cursor-not-allowed'
                            }`}
                          >
                            {isClaimed ? <CheckCircle2 className="w-6 h-6" /> : (ICONS[reward.iconName || 'Gift'] ? React.createElement(ICONS[reward.iconName || 'Gift'], { className: "w-6 h-6" }) : <Gift className="w-6 h-6" />)}
                          </button>
                          <div className="text-center">
                            <div className={`text-[10px] font-bold ${isReached ? 'text-indigo-500' : 'text-indigo-400'}`}>{reward.cost} 分</div>
                            <div className="text-[10px] text-stone-600 font-medium max-w-[60px] truncate">{reward.name}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Rules (Light Style) */}
          <div className="py-8 text-center">
            <div className="inline-block bg-stone-100 rounded-3xl p-6 max-w-4xl mx-auto">
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-6 flex items-center justify-center gap-2">
                <Info className="w-4 h-4" />
                积分规则说明
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">每日签到</div>
                  <div className="font-bold text-stone-700">每日登录 <span className="text-emerald-500">+1</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">活跃奖励</div>
                  <div className="font-bold text-stone-700">发送留言/任务意见 <span className="text-emerald-500">+1</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">基础奖励</div>
                  <div className="font-bold text-stone-700">完成目标 <span className="text-emerald-500">10 分/任务 (平分)</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">额外加分</div>
                  <div className="font-bold text-stone-700">提前完成 <span className="text-blue-500">+3 分/任务 (平分)</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">团队协作</div>
                  <div className="font-bold text-stone-700">多人任务 <span className="text-purple-500">每人额外 +3 分</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-stone-400">积分上限</div>
                  <div className="font-bold text-red-500">留言/弹幕积分上限 <span className="text-red-600">3 分/天</span></div>
                </div>
              </div>
            </div>
          </div>

        </main>



      {/* Modals */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium ${
              toast.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <GoalModal 
            goal={editingGoal} 
            currentUser={currentUser}
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSaveGoal} 
          />
        )}
        {isDeleteModalOpen && (
          <DeleteConfirmModal
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={() => goalToDelete && handleDelete(goalToDelete)}
          />
        )}
        {historyModal && (
          <HistoryModal
            member={historyModal}
            txs={txs}
            onClose={() => setHistoryModal(null)}
          />
        )}
        {isProfileModalOpen && (
          <ProfileManagementModal
            profiles={profiles}
            onClose={() => setIsProfileModalOpen(false)}
            onUpdatePin={handleUpdateProfilePin}
          />
        )}
        {isDataModalOpen && (
          <DataManagementModal
            onClose={() => setIsDataModalOpen(false)}
            onExport={handleExport}
            onImport={handleImport}
            onRecover={handleRecoverFromLocal}
            onForceSync={() => {
              localStorage.removeItem('family_goals_migrated');
              window.location.reload();
            }}
          />
        )}
        {isSettingsModalOpen && currentUser && (
          <UserSettingsModal
            role={currentUser}
            currentAvatar={profiles.find(p => p.role === currentUser)?.avatar_url}
            onClose={() => setIsSettingsModalOpen(false)}
            onUpdateAvatar={(url) => handleUpdateAvatar(currentUser, url)}
          />
        )}
        {isRewardModalOpen && (
          <RewardManagementModal
            rewards={rewards}
            onClose={() => setIsRewardModalOpen(false)}
            onToggleActive={handleToggleRewardActive}
            onDelete={handleDeleteReward}
            onEdit={(r) => { setEditingReward(r); setIsRewardEditModalOpen(true); }}
            onAdd={() => { setEditingReward(null); setIsRewardEditModalOpen(true); }}
          />
        )}
        {isRewardEditModalOpen && (
          <RewardEditModal
            reward={editingReward}
            onClose={() => setIsRewardEditModalOpen(false)}
            onSave={(r) => {
              handleSaveReward({
                ...r,
                isActive: editingReward ? editingReward.isActive : true,
                isCustom: editingReward ? editingReward.isCustom : true
              });
            }}
          />
        )}
        {isAdminDashboardOpen && (
          <AdminDashboard 
            goals={goals}
            messages={messages}
            rewards={rewards}
            profiles={profiles}
            transactions={txs}
            isSupabaseConfigured={isSupabaseConfigured}
            onDeleteGoal={handleDelete}
            onDeleteMessage={handleDeleteMessage}
            onDeleteReward={handleDeleteReward}
            onEditReward={(r) => { setEditingReward(r); setIsRewardEditModalOpen(true); }}
            onAddReward={() => { setEditingReward(null); setIsRewardEditModalOpen(true); }}
            onClose={() => setIsAdminDashboardOpen(false)}
          />
        )}
        {isMessageBoardOpen && (
          <MessageBoardModal
            messages={messages}
            currentUser={currentUser || ''}
            profiles={profiles}
            onClose={() => setIsMessageBoardOpen(false)}
            onSend={handleAddMessage}
            onLike={handleLikeMessage}
            onDelete={handleDeleteMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}








/**
 * ### 家庭积分管理系统 (Family Points System) - 产品需求文档 (PRD)
 * 
 * #### 1. 项目背景
 * 旨在通过积分激励机制，促进家庭成员（爸爸、妈妈、哥哥、妹妹）之间的互动、任务完成和情感交流。
 * 
 * #### 2. 核心功能
 * *   **任务管理**: 创建、分配、进度跟踪、多方确认。
 * *   **积分体系**: 任务奖励、登录奖励、留言奖励、弹幕奖励。
 * *   **勋章/成就**: 自动解锁成就并获得额外积分。
 * *   **家庭留言板**: 实时弹幕、聚合显示、特效支持。
 * *   **数据可视化**: 家庭总积分趋势、成员积分动态（来源细分）。
 * *   **奖励兑换**: 个人及全家里程碑奖励。
 * 
 * #### 3. 最近更新 (v2.4.5)
 * *   **管理后台重构**:
 *     *   推出全新“管理后台” (Admin Dashboard)，集成弹幕管理、任务管理、里程碑管理及系统健康测试。
 *     *   支持对弹幕、留言及任务进行快速清理与维护。
 * *   **角色专属里程碑**:
 *     *   实现里程碑奖励的角色隔离逻辑：管理员可为不同家庭成员设置专属奖励（如“妹妹”专属书本奖励，“爸爸”专属房车奖励）。
 *     *   用户界面根据当前登录角色自动过滤并展示对应的个人里程碑进度。
 * *   **测试套件全功能覆盖**:
 *     *   功能测试（FUN）已全面覆盖 PRD 核心模块：任务生命周期、全渠道积分奖励（登录/留言/弹幕）、勋章成就系统、弹幕特效逻辑、可视化引擎精度及里程碑奖励兑换。
 *     *   性能测试（PER）包含大数据量虚拟列表渲染及高并发乐观锁冲突校验。
 * *   **系统监控增强**:
 *     *   管理员可手动触发“全量集成测试套件”，包含隔离性验证、积分引擎校验、预警算法模拟及并发冲突模拟。
 *     *   **数据库隔离**: 引入内存沙箱机制，确保所有测试操作与现网生产数据 100% 隔离，无任何副作用。
 * *   **质量保障**:
 *     *   引入 Vitest 自动化测试框架，覆盖核心工具函数（积分计算、预警逻辑）及关键 UI 组件。
 *     *   建立集成测试体系，模拟用户发送留言及查看任务卡片等核心路径。
 * *   **UI 优化**:
 *     *   “积分动态”支持“最近一周”和“全部”切换，且条形图总长度与积分量成正比。
 *     *   “最近动态”面板增加滚动条，限制最大高度，且超过 5 条即显示滚动条。
 *     *   任务剩余时间显示优化：负数显示为“延迟 X 天”。
 *     *   网页版本更新为 “V2.4全自动化版”。
 * *   **逻辑增强**:
 *     *   自动完成：当所有责任人都确认后，任务自动刷新为“已完成”状态（包含存量数据自动检查）。
 *     *   弹幕特效：多选特效时，每条弹幕随机从选中的效果中挑选一种展示。
 * *   **弹幕增强**:
 *     *   弹幕特效选择器全面中文化，提升使用体验。
 * *   **Bug 修复**:
 *     *   修复了任务讨论区回复留言可能失败的问题（优化了数据库插入逻辑）。
 * 
 * #### 4. 技术栈
 * *   Frontend: React, Tailwind CSS, Framer Motion, Recharts.
 * *   Backend: Supabase (PostgreSQL, Real-time).
 */
