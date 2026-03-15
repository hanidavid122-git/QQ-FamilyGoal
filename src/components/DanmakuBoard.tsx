import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, ChevronUp, ChevronDown, Eye, EyeOff, 
  Settings, Trash2, Shield, Palette 
} from 'lucide-react';
import { Message, Profile } from '../types';
import { ROLES, MESSAGE_COLORS, commonEmojis } from '../constants';
import { UserAvatar } from './UserAvatar';

const DANMAKU_EFFECT_LABELS: Record<string, string> = {
  default: '默认',
  blink: '闪烁',
  ghost: '幽灵',
  zoom: '放大',
  pulse: '脉冲',
  bounce: '弹跳',
  rotate: '旋转',
  shake: '抖动',
  flip: '翻转',
  wave: '波动',
  float: '漂浮',
  skew: '倾斜',
  blur: '模糊',
  neon: '霓虹',
  fire: '火焰',
  ice: '冰霜',
  rainbow: '彩虹',
  glitch: '故障'
};

function DanmakuItem({ msg, profiles, isLeader, isAdmin, onDeleteMessage, top, i }: { msg: Message, profiles: Profile[], isLeader: boolean, isAdmin: boolean, onDeleteMessage?: (id: string | string[]) => void, i: number, laneIndex: number, top: number }) {
  const [iteration, setIteration] = useState(0);
  const effects = useMemo(() => (msg.effect || 'default').split(','), [msg.effect]);
  // 每次从屏幕显示的时候都选择其中的一种弹幕特效 (Cycle through effects each time it appears)
  const currentEffect = useMemo(() => effects[(iteration + i) % effects.length] || 'default', [iteration, i, effects]);

  const offset = useMemo(() => (msg.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6) - 3, [msg.id]);
  const baseSpeed = msg.speed || 10;
  const speedVariation = useMemo(() => (msg.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 4) - 2, [msg.id]);
  const finalSpeed = Math.max(5, baseSpeed + speedVariation);
  
  const createdDate = new Date(msg.date).getTime();
  const duration = msg.duration || (24 * 60 * 60 * 1000);
  const remainingMs = Math.max(0, createdDate + duration - Date.now());
  const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
  const oneHourMs = 60 * 60 * 1000;
  let timeOpacity = 1;
  if (duration !== -1 && remainingMs <= oneHourMs) {
    timeOpacity = Math.max(0.1, remainingMs / oneHourMs);
  }

  const initialDelay = useMemo(() => (msg.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 15) * 0.5, [msg.id]);

  // Use useEffect to cycle the iteration when the animation finishes its journey
  React.useEffect(() => {
    const totalTime = (finalSpeed + (iteration === 0 ? initialDelay : 0)) * 1000;
    const timer = setTimeout(() => {
      setIteration(prev => prev + 1);
    }, totalTime);
    return () => clearTimeout(timer);
  }, [iteration, finalSpeed, initialDelay]);

  return (
    <motion.div
      key={`${msg.id}-${iteration}`}
      initial={{ x: '100vw', opacity: 0 }}
      animate={{ 
        x: '-100%', 
        opacity: (currentEffect === 'blink' ? [timeOpacity, timeOpacity * 0.5, timeOpacity] : (currentEffect === 'ghost' ? [timeOpacity, timeOpacity * 0.2, timeOpacity] : timeOpacity)),
        scale: currentEffect === 'zoom' ? [1, 1.2, 1] : (currentEffect === 'pulse' ? [1, 1.1, 1] : (currentEffect === 'bounce' ? [1, 1.1, 1] : 1)),
        rotate: currentEffect === 'rotate' ? [0, 360] : (currentEffect === 'shake' ? [0, 2, -2, 0] : (currentEffect === 'flip' ? [0, 180, 360] : 0)),
        y: currentEffect === 'wave' ? [0, -10, 10, 0] : (currentEffect === 'float' ? [0, -5, 0] : 0),
        skewX: currentEffect === 'skew' ? [0, 10, -10, 0] : 0,
        filter: currentEffect === 'blur' ? ['blur(0px)', 'blur(2px)', 'blur(0px)'] : (currentEffect === 'neon' ? [`drop-shadow(0 0 2px ${msg.color || '#fff'})`, `drop-shadow(0 0 8px ${msg.color || '#fff'})`, `drop-shadow(0 0 2px ${msg.color || '#fff'})`] : (currentEffect === 'fire' ? ['drop-shadow(0 0 2px #ff4500)', 'drop-shadow(0 0 10px #ff8c00)', 'drop-shadow(0 0 2px #ff4500)'] : (currentEffect === 'ice' ? ['drop-shadow(0 0 2px #00ffff)', 'drop-shadow(0 0 10px #f0ffff)', 'drop-shadow(0 0 2px #00ffff)'] : 'none'))),
        color: currentEffect === 'rainbow' ? ['#ff0000', '#00ff00', '#0000ff', '#ff0000'] : (msg.color || '#000000')
      }}
      transition={{ 
        x: { 
          duration: finalSpeed, 
          ease: "linear", 
          delay: iteration === 0 ? initialDelay : 0
        },
        opacity: { duration: (currentEffect === 'blink' || currentEffect === 'ghost') ? 0.8 : 0.5, repeat: Infinity },
        scale: { duration: 1, repeat: Infinity },
        rotate: { duration: currentEffect === 'rotate' ? 2 : 0.5, repeat: Infinity },
        y: { duration: 2, repeat: Infinity },
        skewX: { duration: 1, repeat: Infinity },
        filter: { duration: 1.5, repeat: Infinity },
        color: { duration: 3, repeat: Infinity }
      }}
      className={`absolute whitespace-nowrap flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-stone-200 shadow-sm ${currentEffect === 'glitch' ? 'animate-pulse' : ''}`}
      style={{ 
        left: 0,
        top: `${top + offset}%`,
        fontSize: msg.font_size || '0.9rem',
      }}
    >
      <div className="relative">
        <UserAvatar role={msg.user} profiles={profiles} className="w-6 h-6 border-none shadow-none bg-transparent" />
        {isLeader && (
          <div className="absolute -top-2 -right-1 text-[10px]">👑</div>
        )}
      </div>
      <span className="font-bold text-stone-600 text-xs">{msg.user}:</span>
      <span style={{ color: msg.color }}>{msg.content}</span>
      <div className="flex items-center gap-1 ml-1">
        {msg.likes > 0 && <span className="text-[10px] text-pink-400">❤️{msg.likes}</span>}
        <span className="text-[9px] bg-stone-200 text-stone-500 px-1 rounded leading-tight">
          {remainingHours > 24 ? `${Math.ceil(remainingHours/24)}d` : `${remainingHours}h`}
        </span>
        {isAdmin && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteMessage?.(msg.id); }}
            className="text-stone-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

interface DanmakuBoardProps {
  messages: Message[];
  onSend: (content: string, avatar?: string, color?: string, fontSize?: string, emoji?: string, speed?: number, effect?: string, duration?: number) => void;
  currentUser: string | null;
  profiles: Profile[];
  memberStats: any[];
  isAdmin: boolean;
  onClearAll?: () => void;
  onDeleteMessage?: (id: string | string[]) => void;
  onToggleBullet?: () => void;
  isBulletEnabled: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export function DanmakuBoard({ 
  messages, 
  onSend, 
  currentUser, 
  profiles, 
  memberStats, 
  isAdmin, 
  onClearAll, 
  onDeleteMessage, 
  onToggleBullet, 
  isBulletEnabled, 
  isExpanded,
  onToggle
}: DanmakuBoardProps) {
  const [input, setInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(MESSAGE_COLORS[0]);
  const [selectedFontSize, setSelectedFontSize] = useState('0.9rem');
  const [selectedSpeed, setSelectedSpeed] = useState(10);
  const [selectedEffect, setSelectedEffect] = useState<string[]>(['default']);
  const [selectedDuration, setSelectedDuration] = useState(24 * 60 * 60 * 1000);
  const [showPicker, setShowPicker] = useState(false);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [deleteRole, setDeleteRole] = useState('');
  const [deleteDate, setDeleteDate] = useState('');

  // Stats
  const totalMessages = messages.length;
  const activeMessages = messages.filter(msg => {
    if (!msg.duration || msg.duration === -1) return true;
    return (new Date(msg.date).getTime() + msg.duration) > Date.now();
  }).length;

  // Danmaku Aggregation Logic (24h window)
  const aggregatedMessages = useMemo(() => {
    const result: Message[] = [];
    const sorted = [...messages].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const msg of sorted) {
      const date = new Date(msg.date).getTime();
      const isDuplicate = result.some(m => 
        m.content.trim() === msg.content.trim() && 
        Math.abs(new Date(m.date).getTime() - date) < 24 * 60 * 60 * 1000
      );
      
      if (!isDuplicate) {
        result.push(msg);
      }
    }
    return result;
  }, [messages]);

  // Find the leader based on current points
  const sortedStats = [...memberStats].sort((a, b) => b.pts - a.pts);
  const maxPoints = Math.max(...sortedStats.map(s => s.pts), 100);

  // Lane system to prevent overlapping
  const LANES_COUNT = 8;
  const getLaneTop = (index: number) => {
    const laneHeight = 80 / LANES_COUNT;
    return 10 + (index % LANES_COUNT) * laneHeight;
  };
  
  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-stone-100 overflow-hidden transition-all duration-300 shadow-sm">
      <div 
        onClick={onToggle}
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/80 transition-colors"
      >
        <div className="flex items-center gap-2 text-stone-500">
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">家庭留言板</span>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-medium text-stone-400">
                历史: <span className="text-stone-600 font-bold">{totalMessages}</span>
              </div>
              <div className="text-[10px] font-medium text-stone-400">
                活跃: <span className="text-orange-500 font-bold">{activeMessages}</span>
              </div>
            </div>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-[10px] font-medium text-stone-400">
                    历史弹幕: <span className="text-stone-600 font-bold">{totalMessages}</span>
                  </div>
                  <div className="text-[10px] font-medium text-stone-400">
                    活跃弹幕: <span className="text-orange-500 font-bold">{activeMessages}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleBullet?.(); }}
                    className={`p-2 rounded-xl transition-all shadow-sm border ${isBulletEnabled ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-stone-400 border-stone-200'}`}
                    title={isBulletEnabled ? '隐藏弹幕' : '显示弹幕'}
                  >
                    {isBulletEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowAdminTools(!showAdminTools); }}
                        className={`p-2 rounded-xl transition-all ${showAdminTools ? 'bg-indigo-50 text-indigo-600' : 'bg-stone-100 text-stone-400'}`}
                        title="管理工具"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(window.confirm('确定清空所有弹幕吗？')) onClearAll?.(); }}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                        title="清空弹幕"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="text-[10px] font-bold text-stone-400 bg-stone-50 px-3 py-1 rounded-full border border-stone-100">
                    实时同步中
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isAdmin && showAdminTools && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                        <Shield className="w-3 h-3" />
                        管理员批量删除工具
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex gap-2">
                          <select 
                            value={deleteRole}
                            onChange={e => setDeleteRole(e.target.value)}
                            className="flex-grow px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs outline-none"
                          >
                            <option value="">按角色选择...</option>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button 
                            onClick={() => {
                              if(!deleteRole) return;
                              const ids = messages.filter(m => m.user === deleteRole).map(m => m.id);
                              if(ids.length > 0 && window.confirm(`确定删除 ${deleteRole} 的所有 ${ids.length} 条弹幕吗？`)) {
                                onDeleteMessage?.(ids);
                                setDeleteRole('');
                              }
                            }}
                            className="px-3 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                            disabled={!deleteRole}
                          >
                            删除该角色
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="date"
                            value={deleteDate}
                            onChange={e => setDeleteDate(e.target.value)}
                            className="flex-grow px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs outline-none"
                          />
                          <button 
                            onClick={() => {
                              if(!deleteDate) return;
                              const ids = messages.filter(m => m.date.startsWith(deleteDate)).map(m => m.id);
                              if(ids.length > 0 && window.confirm(`确定删除 ${deleteDate} 当天的所有 ${ids.length} 条弹幕吗？`)) {
                                onDeleteMessage?.(ids);
                                setDeleteDate('');
                              } else if(ids.length === 0) {
                                alert('该日期没有弹幕');
                              }
                            }}
                            className="px-3 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                            disabled={!deleteDate}
                          >
                            删除该日期
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-stone-50 rounded-[2rem] p-1 shadow-inner overflow-hidden relative h-64 mb-6 border border-stone-100">
                <div className="absolute inset-0" style={{ 
                  backgroundImage: 'url("https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1000&auto=format&fit=crop")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.05
                }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent"></div>
                
                <div className="absolute inset-0 flex items-end pointer-events-none px-8 pb-12">
                  <div className="flex justify-around items-end w-full h-full">
                    {sortedStats.map((member, index) => {
                      const percent = Math.min(Math.max((member.pts / (maxPoints || 1)) * 55, 15), 55);
                      const isLeader = index === 0 && member.pts > 0;
                      
                      return (
                        <div key={member.role} className="relative h-full w-16 flex flex-col justify-end items-center">
                          <motion.div 
                            initial={{ height: '0%' }}
                            animate={{ height: `${percent}%` }}
                            transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                            className={`w-2 rounded-t-full absolute bottom-0 ${isLeader ? 'bg-orange-400' : 'bg-stone-200'}`}
                          />
                          <motion.div
                            initial={{ bottom: '0%' }}
                            animate={{ bottom: `${percent}%` }}
                            transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                            className="absolute mb-2 flex flex-col items-center"
                          >
                            <div className="relative">
                              <UserAvatar 
                                role={member.role} 
                                profiles={profiles} 
                                className={`w-10 h-10 text-sm border-2 shadow-md ${isLeader ? 'border-orange-400' : 'border-white'}`} 
                              />
                              {isLeader && (
                                <div className="absolute -top-3 -right-1 text-lg">👑</div>
                              )}
                            </div>
                            <div className={`mt-1.5 text-xs font-black px-2 py-0.5 rounded-full shadow-sm ${isLeader ? 'bg-orange-500 text-white' : 'bg-stone-700 text-white'}`}>
                              {member.pts}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="absolute inset-0 overflow-hidden">
                  <AnimatePresence>
                    {isBulletEnabled && aggregatedMessages.filter(msg => {
                      if (!msg.duration || msg.duration === -1) return true;
                      return (new Date(msg.date).getTime() + msg.duration) > Date.now();
                    }).slice(-20).map((msg, i) => {
                      const laneIndex = i % LANES_COUNT;
                      const top = getLaneTop(laneIndex);
                      const isLeader = sortedStats[0] && sortedStats[0].role === msg.user && sortedStats[0].pts > 0;

                      return (
                        <DanmakuItem 
                          key={msg.id}
                          msg={msg}
                          profiles={profiles}
                          isLeader={isLeader}
                          isAdmin={isAdmin}
                          onDeleteMessage={onDeleteMessage}
                          i={i}
                          laneIndex={laneIndex}
                          top={top}
                        />
                      );
                    })}
                  </AnimatePresence>
                  {messages.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm">
                      暂无弹幕，快来发送第一条！
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && input.trim() && (onSend(input, undefined, selectedColor, selectedFontSize, undefined, selectedSpeed, selectedEffect.join(','), selectedDuration), setInput(''))}
                    placeholder={currentUser ? `作为 ${currentUser} 发送留言...` : "请先登录"}
                    disabled={!currentUser}
                    className="w-full pl-4 pr-12 py-3 bg-stone-50 border border-stone-100 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-inner"
                  />
                  <button 
                    onClick={() => setShowPicker(!showPicker)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-orange-500 transition-colors"
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => {
                    if (input.trim()) {
                      onSend(input, undefined, selectedColor, selectedFontSize, undefined, selectedSpeed, selectedEffect.join(','), selectedDuration);
                      setInput('');
                    }
                  }}
                  disabled={!currentUser || !input.trim()}
                  className="px-6 py-3 bg-stone-900 text-white rounded-2xl text-sm font-bold hover:bg-stone-800 transition-all disabled:opacity-50 shadow-md active:scale-95"
                >
                  发送
                </button>
              </div>

              <AnimatePresence>
                {showPicker && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4"
                  >
                    <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 space-y-4">
                      <div className="flex flex-wrap gap-2 pb-2 border-b border-stone-200/50">
                        {commonEmojis.map(emoji => (
                          <button 
                            key={emoji}
                            onClick={() => onSend(emoji, undefined, selectedColor, selectedFontSize, undefined, selectedSpeed, selectedEffect.join(','), selectedDuration)}
                            className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer bg-white rounded-lg shadow-sm border border-stone-100"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {MESSAGE_COLORS.map(color => (
                          <button 
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-stone-900 scale-110' : 'border-white'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">字体大小</label>
                          <div className="flex gap-1">
                            {['0.7rem', '0.9rem', '1.2rem'].map(size => (
                              <button 
                                key={size}
                                onClick={() => setSelectedFontSize(size)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedFontSize === size ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}
                              >
                                {size === '0.7rem' ? '小' : size === '0.9rem' ? '中' : '大'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">移动速度</label>
                          <div className="flex gap-1">
                            {[15, 10, 6].map(speed => (
                              <button 
                                key={speed}
                                onClick={() => setSelectedSpeed(speed)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedSpeed === speed ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}
                              >
                                {speed === 15 ? '慢' : speed === 10 ? '中' : '快'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">显示时长</label>
                          <div className="flex gap-1">
                            {[10000, 3600000, 24 * 3600000, -1].map(dur => (
                              <button 
                                key={dur}
                                onClick={() => setSelectedDuration(dur)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedDuration === dur ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}
                              >
                                {dur === 10000 ? '10秒' : dur === 3600000 ? '1小时' : dur === -1 ? '永久' : '1天'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5 w-full">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">弹幕特效 (可多选)</label>
                          <div className="flex flex-wrap gap-1">
                            {['default', 'blink', 'ghost', 'zoom', 'pulse', 'bounce', 'rotate', 'shake', 'flip', 'wave', 'float', 'skew', 'blur', 'neon', 'fire', 'ice', 'rainbow', 'glitch'].map(eff => (
                              <button 
                                key={eff}
                                onClick={() => {
                                  if (eff === 'default') {
                                    setSelectedEffect(['default']);
                                  } else {
                                    const newEffs = selectedEffect.includes(eff) 
                                      ? selectedEffect.filter(e => e !== eff) 
                                      : [...selectedEffect.filter(e => e !== 'default'), eff];
                                    setSelectedEffect(newEffs.length === 0 ? ['default'] : newEffs);
                                  }
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedEffect.includes(eff) ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-stone-500 border-stone-200'}`}
                              >
                                {DANMAKU_EFFECT_LABELS[eff] || eff}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
