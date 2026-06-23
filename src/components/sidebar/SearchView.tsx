'use client';

import React, { useState } from 'react';

interface SearchViewProps {
  users?: any[];
  onStartPrivateChat?: (user: any) => void;
}

export default function SearchView({ users = [], onStartPrivateChat }: SearchViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter((u) => {
    const name = (u.displayName || u.nickname || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Barre de recherche */}
      <div className="p-4">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-gray-400 text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Rechercher par pseudo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-[#00a884] outline-none transition-all"
          />
        </div>
      </div>
      
      {/* Suggestions */}
      <div className="px-4 py-2 overflow-y-auto">
        <h3 className="text-[13px] font-medium text-gray-500 mb-4">
          {searchTerm ? 'Résultats de recherche' : 'Voici des suggestions pour vous'}
        </h3>
        
        <div className="space-y-3">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <div 
                key={u.id || u.uid} 
                onClick={() => {
                  if (onStartPrivateChat) {
                    onStartPrivateChat(u);
                    setSearchTerm('');
                  }
                }}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName || u.nickname} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[24px]">person</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-normal text-gray-800 truncate">{u.displayName || u.nickname || 'Anonyme'}</p>
                  <p className="text-[11px] text-gray-400">{searchTerm ? 'Utilisateur trouvé' : 'Utilisateur suggéré'}</p>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onStartPrivateChat) onStartPrivateChat(u);
                  }}
                  className="bg-[#00a884] text-white px-3 py-1.5 rounded-full text-[12px] font-medium hover:bg-[#008f6a] transition-colors shadow-sm flex items-center gap-1 cursor-pointer relative z-10"
                >
                  <span className="material-symbols-outlined text-[14px] pointer-events-none">chat</span>
                  <span className="hidden md:inline pointer-events-none">Message</span>
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
              <span className="material-symbols-outlined text-[40px] mb-2 opacity-20">person_search</span>
              <p className="text-xs">Aucun utilisateur trouvé pour "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
