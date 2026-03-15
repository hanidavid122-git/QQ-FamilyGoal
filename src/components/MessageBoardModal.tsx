import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, X, Heart, Trash2, Upload } from 'lucide-react';
import { Message, Profile } from '../types';
import { UserAvatar } from './UserAvatar';

export function MessageBoardModal({ messages, currentUser, profiles, onClose, onSend, onLike, onDelete }: { messages: Message[], currentUser: string, profiles: Profile[], onClose: () => void, onSend: (content: string) => void, onLike: (id: string) => void, onDelete?: (id: string) => void }) {
  const [content, setContent] = useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isAdmin = currentUser === '管理员';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 bg-indigo-500 text-white flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" /> 家庭留言板
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-stone-50" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center text-stone-400 py-10">
              <p>还没有留言，快来抢沙发！</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.user === currentUser;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <UserAvatar role={msg.user} profiles={profiles} className="w-6 h-6" />
                    <span className="text-xs font-bold text-stone-600">{msg.user}</span>
                    <span className="text-[10px] text-stone-400">{new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[80%] text-sm relative group ${isMe ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none'}`}>
                    {msg.content}
                    <div className={`absolute -bottom-3 ${isMe ? '-left-12' : '-right-12'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <button 
                        onClick={() => onLike(msg.id)}
                        className="bg-white border border-stone-100 shadow-sm rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 text-stone-500 hover:text-red-500 transition-colors"
                      >
                        <Heart className={`w-3 h-3 ${msg.likes > 0 ? 'fill-red-500 text-red-500' : ''}`} /> {msg.likes}
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => onDelete?.(msg.id)}
                          className="bg-white border border-stone-100 shadow-sm rounded-full p-1 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 bg-white border-t border-stone-100">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (content.trim()) {
                onSend(content);
                setContent('');
              }
            }}
            className="flex gap-2"
          >
            <input 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="说点什么..."
              className="flex-grow px-4 py-2 bg-stone-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button 
              type="submit"
              disabled={!content.trim()}
              className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Upload className="w-5 h-5 rotate-90" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
