import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, Calendar, Clock, CheckCircle2, Circle, 
  Trash2, Edit2, FileText, X, Smile, Image as ImageIcon 
} from 'lucide-react';
import { Goal, Profile, GoalComment } from '../types';
import { commonEmojis } from '../constants';
import { UserAvatar } from './UserAvatar';
import { getWarningStatus } from '../utils/goalUtils';

import { WarningLight } from './WarningLight';

interface GoalCardProps {
  goal: Goal;
  currentUser: string;
  profiles: Profile[];
  onUpdateProgress: (val: number) => void;
  onMarkAsDone: () => void;
  onConfirm: (member: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  comments: GoalComment[];
  onAddComment: (content: string, image?: string, replyTo?: string) => void;
}

export function GoalCard({ 
  goal, 
  currentUser, 
  profiles, 
  onUpdateProgress, 
  onMarkAsDone, 
  onConfirm, 
  onEdit, 
  onDelete, 
  comments, 
  onAddComment 
}: GoalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | undefined>(undefined);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sortedComments = [...comments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const displayedComments = showAllComments ? sortedComments : sortedComments.slice(0, 3);
  const [localProgress, setLocalProgress] = useState(goal.progress);

  useEffect(() => {
    setLocalProgress(goal.progress);
  }, [goal.progress]);

  const isCompleted = goal.progress >= 100 && goal.completedAt !== undefined;
  const isPendingConfirmation = goal.progress >= 99 && !goal.completedAt;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(goal.endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isOverdue = diffDays < 0 && !isCompleted;
  const warningStatus = getWarningStatus(goal);

  const assignees = goal.assignees || (goal.assignee ? [goal.assignee] : []);
  const confirmations = goal.confirmations || {};
  
  const requiredConfirmers = assignees.length > 0 ? assignees : ['爸爸'];
  const confirmedCount = requiredConfirmers.filter(r => confirmations[r]).length;
  const totalRequired = requiredConfirmers.length;

  const isAdmin = currentUser === '管理员';
  const canEdit = isAdmin || goal.creator === currentUser;
  const canAddProgress = isAdmin || assignees.includes(currentUser) || goal.creator === currentUser;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCommentImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all ${
        isCompleted ? 'border-emerald-200 bg-stone-50/50 grayscale-[0.2]' : isPendingConfirmation ? 'border-blue-200' : isOverdue ? 'border-red-200' : 'border-stone-200'
      }`}
    >
      <div 
        className="p-4 cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <WarningLight status={warningStatus} />
              <h3 className="text-base font-bold text-stone-900 truncate flex items-center gap-2">
                {goal.name}
                {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                goal.priority === '高' ? 'bg-red-100 text-red-700' : 
                goal.priority === '中' ? 'bg-orange-100 text-orange-700' : 
                'bg-stone-100 text-stone-700'
              }`}>
                {goal.priority}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                goal.type === 'family' ? 'bg-indigo-100 text-indigo-700' : 'bg-stone-100 text-stone-700'
              }`}>
                {goal.type === 'family' ? '家庭' : '个人'}
              </span>
              <span className="text-xs text-stone-400">
                {isCompleted ? '已完成' : diffDays < 0 ? `延迟 ${Math.abs(diffDays)} 天` : `剩余 ${diffDays} 天`}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex -space-x-1.5 mb-1">
              {assignees.map((a) => (
                <UserAvatar key={a} role={a} profiles={profiles} className="w-5 h-5 border-1 border-white" />
              ))}
            </div>
            <div className="text-[10px] font-bold text-stone-700">{goal.progress}%</div>
            <div className="w-16 h-1 bg-stone-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : isPendingConfirmation ? 'bg-blue-500' : 'bg-orange-500'}`}
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>
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
            <div className="px-4 pb-4 pt-0 border-t border-stone-100">
              <div className="py-3 space-y-3">
                <p className="text-sm text-stone-600 bg-stone-50 p-3 rounded-xl">{goal.description || '暂无描述'}</p>
                
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <UserAvatar role={goal.creator || '管理员'} profiles={profiles} className="w-5 h-5" />
                  <span>发起: {goal.creator || '管理员'}</span>
                  <span className="mx-1">|</span>
                  <div className="flex -space-x-1">
                    {assignees.map(a => (
                      <UserAvatar key={a} role={a} profiles={profiles} className="w-5 h-5 border-1 border-white" />
                    ))}
                  </div>
                  <span>责任: {assignees.join(', ')}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{goal.startDate} 至 {goal.endDate}</span>
                </div>

                {isPendingConfirmation && (
                  <div className="bg-blue-50 p-3 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                      <Clock className="w-3 h-3" />
                      <span>等待责任人确认 ({confirmedCount}/{totalRequired})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {requiredConfirmers.map(r => (
                        <div key={r} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${confirmations[r] ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-blue-100 text-stone-400'}`}>
                          {confirmations[r] ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                {!isCompleted && (
                  <>
                    {goal.progress < 99 && canAddProgress && (
                      <div className="space-y-4">
                        <div className="space-y-2 py-2">
                          <div className="flex justify-between text-xs font-medium text-stone-500">
                            <span>调整进度</span>
                            <span>{localProgress}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="99" 
                            value={localProgress} 
                            onChange={(e) => setLocalProgress(parseInt(e.target.value))}
                            onMouseUp={() => onUpdateProgress(localProgress)}
                            onTouchEnd={() => onUpdateProgress(localProgress)}
                            className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                          />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onMarkAsDone(); }}
                          className="w-full py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" /> 确认完成
                        </button>
                      </div>
                    )}
                    {goal.progress >= 99 && !isCompleted && (
                      <div className="flex flex-wrap gap-2">
                        {requiredConfirmers.map(r => {
                          if (confirmations[r]) return null;
                          const canConfirm = isAdmin || r === currentUser;
                          return (
                            <button 
                              key={r}
                              onClick={(e) => { e.stopPropagation(); canConfirm && onConfirm(r); }}
                              disabled={!canConfirm}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-1 min-h-[48px] ${
                                canConfirm 
                                  ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' 
                                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" /> {r} 确认完成
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                
                {/* Comments Section */}
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-stone-400 uppercase flex items-center gap-2">
                      <FileText className="w-3 h-3" /> 任务讨论
                    </h4>
                    {sortedComments.length > 3 && (
                      <button 
                        onClick={() => setShowAllComments(!showAllComments)}
                        className="text-[10px] font-bold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        {showAllComments ? '收起' : `查看全部 ${sortedComments.length} 条`}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto mb-3 pr-1">
                    {sortedComments.length === 0 ? (
                      <p className="text-[10px] text-stone-400 text-center py-2">暂无留言</p>
                    ) : (
                      displayedComments.map(c => (
                        <div key={c.id} className="flex gap-2">
                          <UserAvatar role={c.user} profiles={profiles} className="w-5 h-5 shrink-0" />
                          <div className="flex-grow">
                            <div className="flex justify-between items-center mb-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-stone-600">{c.user}</span>
                                {c.replyTo && (
                                  <span className="text-[8px] text-stone-400 bg-stone-100 px-1 rounded">回复了</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-stone-400">{new Date(c.date).toLocaleString()}</span>
                                <button 
                                  onClick={() => {
                                    setCommentInput(`@${c.user} `);
                                    setReplyToId(c.id);
                                    setTimeout(() => {
                                      if (commentInputRef.current) {
                                        commentInputRef.current.focus();
                                        const len = commentInputRef.current.value.length;
                                        commentInputRef.current.setSelectionRange(len, len);
                                      }
                                    }, 0);
                                  }}
                                  className="text-[8px] font-bold text-orange-500 hover:text-orange-600"
                                >
                                  回复
                                </button>
                              </div>
                            </div>
                            {c.replyTo && (
                              <div className="mb-1 pl-2 border-l-2 border-stone-200">
                                {(() => {
                                  const repliedComment = comments.find(rc => rc.id === c.replyTo);
                                  return repliedComment ? (
                                    <p className="text-[9px] text-stone-400 italic truncate">
                                      "{repliedComment.content}"
                                    </p>
                                  ) : (
                                    <p className="text-[9px] text-stone-300 italic">原留言已删除</p>
                                  );
                                })()}
                              </div>
                            )}
                            <p className="text-xs text-stone-700 bg-stone-50 p-2 rounded-lg">
                              {c.content}
                              {c.image && (
                                <img 
                                  src={c.image} 
                                  alt="Comment attachment" 
                                  className="mt-2 rounded-lg max-w-full h-auto border border-stone-100 shadow-sm"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    {commentImage && (
                      <div className="relative inline-block">
                        <img src={commentImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-stone-200" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => setCommentImage(null)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex flex-wrap gap-2 p-2 bg-stone-50 rounded-xl border border-stone-100"
                        >
                          {commonEmojis.map(emoji => (
                            <button 
                              key={emoji}
                              onClick={() => {
                                setCommentInput(prev => prev + emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {replyToId && (
                      <div className="flex items-center justify-between bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-orange-600 font-bold">回复:</span>
                          <span className="text-[10px] text-stone-500 truncate max-w-[200px]">
                            {comments.find(c => c.id === replyToId)?.content || '加载中...'}
                          </span>
                        </div>
                        <button 
                          onClick={() => setReplyToId(undefined)}
                          className="text-stone-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <input 
                          ref={commentInputRef}
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          placeholder="写下你的评论或建议..."
                          className="w-full pl-3 pr-20 py-2 bg-stone-50 border border-stone-100 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                          <button 
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-1.5 text-stone-400 hover:text-orange-500 transition-colors cursor-pointer"
                          >
                            <Smile className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 text-stone-400 hover:text-orange-500 transition-colors cursor-pointer"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (commentInput.trim() || commentImage) {
                            onAddComment(commentInput, commentImage || undefined, replyToId);
                            setCommentInput('');
                            setCommentImage(null);
                            setReplyToId(undefined);
                          }
                        }}
                        disabled={!currentUser}
                        className="px-4 py-2 bg-stone-800 text-white rounded-xl text-xs font-bold hover:bg-stone-900 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        发送
                      </button>
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-2 pt-2 border-t border-stone-100 mt-2 justify-end">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(); }}
                      className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> 编辑
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> 删除
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
