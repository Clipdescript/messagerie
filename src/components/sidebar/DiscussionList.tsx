'use client';

import React from 'react';
import { usePresence } from '@/lib/presence';

interface DiscussionListProps {
  user?: any;
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null, data?: { name: string, avatar?: string }) => void;
  unreadCounts: { [key: string]: number };
  lastMessageTimes: { [key: string]: string };
  timesAgo: { [key: string]: string };
  privateChats?: any[];
  customGroups?: any[];
  allUsers?: any[];
  onDeletePrivateChat?: (id: string) => void;
}

export default function DiscussionList({
  user,
  selectedGroupId,
  onSelectGroup,
  unreadCounts,
  lastMessageTimes,
  timesAgo,
  privateChats = [],
  customGroups = [],
  allUsers = [],
  onDeletePrivateChat
}: DiscussionListProps) {
  const { onlineUsers } = usePresence(user?.uid, user?.displayName);

  const handleGroupSelect = (id: string, data?: { name: string, avatar?: string }) => {
    localStorage.setItem(`last_open_${id}`, Date.now().toString());
    onSelectGroup(id, data);
  };

  return (
    <div className="p-2 space-y-1">
      {/* Groupe Team Snapchat */}
      <div 
        onClick={() => handleGroupSelect('snapchat')}
        className={`flex items-center gap-4 p-3 cursor-pointer transition-all rounded-xl group ${
          selectedGroupId === 'snapchat' 
            ? 'bg-gray-100' 
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm">
          <img src="/Logo.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0 relative">
          <div className="flex justify-between items-baseline gap-2">
            <h2 className="font-normal text-gray-800 text-[15px] truncate pr-14">Team Messagerie</h2>
          </div>
          {unreadCounts['snapchat'] > 0 && selectedGroupId !== 'snapchat' && (
            <div className="absolute right-0 top-0.5 flex flex-col items-end gap-1">
              <span className="text-[10px] text-[#00a884] font-medium">
                {lastMessageTimes['snapchat'] || '00:00'}
              </span>
              <div className="w-4.5 h-4.5 flex items-center justify-center bg-[#25d366] text-white text-[10px] rounded-full font-bold">
                {unreadCounts['snapchat']}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            {selectedGroupId === 'snapchat' ? (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGroup(null);
                  }}
                  className="hidden group-hover:flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  <span className="text-[12px] font-normal">Fermer le tchat</span>
                </button>
                <div className="flex group-hover:hidden items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-[#00a884] rotate-90">navigation</span>
                  <span className="text-[12px] text-gray-400 font-normal">{timesAgo['snapchat'] || '0 s'}</span>
                </div>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[12px] text-[#00a884] rotate-90">navigation</span>
                <span className="text-[12px] text-gray-400 font-normal">{timesAgo['snapchat'] || '0 s'}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Groupe Général */}
      <div 
        onClick={() => handleGroupSelect('general')}
        className={`flex items-center gap-4 p-3 cursor-pointer transition-all rounded-xl group ${
          selectedGroupId === 'general' 
            ? 'bg-gray-100' 
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-100 shadow-sm text-gray-500 overflow-hidden">
          <span className="material-symbols-outlined text-[24px]">group</span>
        </div>
        <div className="flex-1 min-w-0 relative">
          <div className="flex justify-between items-baseline gap-2">
            <h2 className="font-normal text-gray-800 text-[15px] truncate pr-14">Groupe Général</h2>
          </div>
          {unreadCounts['general'] > 0 && selectedGroupId !== 'general' && (
            <div className="absolute right-0 top-0.5 flex flex-col items-end gap-1">
              <span className="text-[10px] text-[#00a884] font-medium">
                {lastMessageTimes['general'] || '00:00'}
              </span>
              <div className="w-4.5 h-4.5 flex items-center justify-center bg-[#25d366] text-white text-[10px] rounded-full font-bold">
                {unreadCounts['general']}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            {selectedGroupId === 'general' ? (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGroup(null);
                  }}
                  className="hidden group-hover:flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  <span className="text-[12px] font-normal">Fermer le tchat</span>
                </button>
                <div className="flex group-hover:hidden items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-[#00a884] rotate-90">navigation</span>
                  <span className="text-[12px] text-gray-400 font-normal">{timesAgo['general'] || '0 s'}</span>
                </div>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[12px] text-[#00a884] rotate-90">navigation</span>
                <span className="text-[12px] text-gray-400 font-normal">{timesAgo['general'] || '0 s'}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Groupe My IA (Privé) */}
      <div 
        onClick={() => handleGroupSelect(`ai-${user?.uid}`)}
        className={`flex items-center gap-4 p-3 cursor-pointer transition-all rounded-xl group ${
          selectedGroupId === `ai-${user?.uid}` 
            ? 'bg-gray-100' 
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0 border border-gray-100 shadow-sm overflow-hidden p-2">
          <img 
            src="https://www.google.com/s2/favicons?domain=mistral.ai&sz=128" 
            alt="Mistral IA" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0 relative">
          <div className="flex justify-between items-baseline gap-2">
            <h2 className="font-normal text-gray-800 text-[15px] truncate pr-14">My IA propulsé par Mistral IA</h2>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {selectedGroupId === `ai-${user?.uid}` ? (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGroup(null);
                  }}
                  className="hidden group-hover:flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  <span className="text-[12px] font-normal">Fermer le tchat</span>
                </button>
                <div className="flex group-hover:hidden items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-[#00a884] rotate-90">navigation</span>
                  <span className="text-[12px] text-gray-400 font-normal">{timesAgo[`ai-${user?.uid}`] || '0 s'}</span>
                </div>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[12px] text-[#00a884] rotate-90">navigation</span>
                <span className="text-[12px] text-gray-400 font-normal">{timesAgo[`ai-${user?.uid}`] || '0 s'}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Liste des groupes personnalisés */}
      {customGroups.map(group => {
        const photoURL = group.photoURL || '';
        const displayName = group.name || 'Groupe sans nom';
        
        let displayLastMessage = group.lastMessage || 'Nouveau groupe';
        if (group.clearedAt && group.clearedAt[user?.uid] && group.updatedAt) {
          const clearedTime = group.clearedAt[user?.uid].toDate?.()?.getTime() || 0;
          const updatedTime = group.updatedAt.toDate?.()?.getTime() || 0;
          if (clearedTime >= updatedTime) {
            displayLastMessage = 'Nouveau groupe';
          }
        }

        return (
          <div 
            key={group.id}
            onClick={() => handleGroupSelect(group.id, { name: displayName, avatar: photoURL })}
            className={`flex items-center gap-4 p-3 cursor-pointer transition-all rounded-xl group relative ${
              selectedGroupId === group.id 
                ? 'bg-gray-100' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-100 shadow-sm text-gray-500 overflow-hidden">
              {photoURL ? (
                <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[24px]">group</span>
              )}
            </div>
            <div className="flex-1 min-w-0 relative pr-6">
              <div className="flex justify-between items-baseline gap-2">
                <h2 className="font-normal text-gray-800 text-[15px] truncate pr-14">{displayName}</h2>
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5 max-w-[85%]">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-[#00a884] rotate-90">navigation</span>
                  <span>{timesAgo[group.id] || '0 s'}</span>
                </div>
              </div>
              {unreadCounts[group.id] > 0 && selectedGroupId !== group.id && (
                <div className="absolute right-0 top-0.5 flex flex-col items-end gap-1">
                  <span className="text-[10px] text-[#00a884] font-medium">
                    {lastMessageTimes[group.id] || '00:00'}
                  </span>
                  <div className="w-4.5 h-4.5 flex items-center justify-center bg-[#25d366] text-white text-[10px] rounded-full font-bold">
                    {unreadCounts[group.id]}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Liste des conversations privées */}
      {privateChats.map(chat => {
        const otherUserId = chat.participants.find((id: string) => id !== user?.uid);
        const otherUser = allUsers.find(u => u.id === otherUserId || u.uid === otherUserId);
        const displayName = otherUser?.displayName || otherUser?.nickname || 'Anonyme';
        const photoURL = otherUser?.photoURL;
        
        // Déterminer si le dernier message a été effacé par cet utilisateur
        let displayLastMessage = chat.lastMessage || 'Nouvelle conversation';
        if (chat.clearedAt && chat.clearedAt[user?.uid] && chat.updatedAt) {
          const clearedTime = chat.clearedAt[user?.uid].toDate?.()?.getTime() || 0;
          const updatedTime = chat.updatedAt.toDate?.()?.getTime() || 0;
          if (clearedTime >= updatedTime) {
            displayLastMessage = 'Nouvelle conversation';
          }
        }

        return (
          <div 
            key={chat.id}
            onClick={() => handleGroupSelect(chat.id, { name: displayName, avatar: photoURL })}
            className={`flex items-center gap-4 p-3 cursor-pointer transition-all rounded-xl group relative ${
              selectedGroupId === chat.id 
                ? 'bg-gray-100' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-100 shadow-sm text-gray-500 overflow-hidden">
              {photoURL ? (
                <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[24px]">person</span>
              )}
            </div>
            <div className="flex-1 min-w-0 relative pr-6">
              <div className="flex justify-between items-baseline gap-2">
                <h2 className="font-normal text-gray-800 text-[15px] truncate pr-14">{displayName}</h2>
              </div>
              {/* Dernier message ou statut 'écrit...' si disponible */}
              <div className="text-xs text-gray-500 truncate mt-0.5 max-w-[85%]">
                {onlineUsers.find(u => u.uid === otherUserId && u.isTyping && u.typingIn === chat.id) ? (
                  <span className="text-[#00a884] font-medium italic flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-pulse"></span>
                    écrit...
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-[#00a884] rotate-90">navigation</span>
                    <span>{timesAgo[chat.id] || '0 s'}</span>
                  </div>
                )}
              </div>
              {unreadCounts[chat.id] > 0 && selectedGroupId !== chat.id && (
                <div className="absolute right-0 top-0.5 flex flex-col items-end gap-1">
                  <span className="text-[10px] text-[#00a884] font-medium">
                    {lastMessageTimes[chat.id] || '00:00'}
                  </span>
                  <div className="w-4.5 h-4.5 flex items-center justify-center bg-[#25d366] text-white text-[10px] rounded-full font-bold">
                    {unreadCounts[chat.id]}
                  </div>
                </div>
              )}
            </div>
            {/* Bouton de suppression toujours visible et rouge */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onDeletePrivateChat) onDeletePrivateChat(chat.id);
              }}
              className="absolute right-12 bottom-3 p-1 text-red-500 hover:text-red-700 transition-colors z-10 flex items-center justify-center"
              title="Supprimer la conversation"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
