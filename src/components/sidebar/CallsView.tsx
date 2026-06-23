'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Phone, Video, ArrowDownLeft, ArrowUpRight, Search, Plus } from 'lucide-react';
import SearchView from './SearchView';

interface CallsViewProps {
  user: any;
  allUsers: any[];
}

export default function CallsView({ user, allUsers }: CallsViewProps) {
  const [calls, setCalls] = useState<any[]>([]);
  const [showNewCall, setShowNewCall] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    // Récupérer l'historique des appels de l'utilisateur sans orderBy/limit serveur
    // pour éviter d'avoir besoin d'un index composite Firebase. Le tri et la limite
    // seront gérés côté client.
    const q = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let callsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      // Tri côté client par date de démarrage (décroissant)
      callsData.sort((a, b) => {
        const dateA = a.startedAt?.toDate?.()?.getTime() || 0;
        const dateB = b.startedAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
      
      // Limiter aux 50 derniers appels
      callsData = callsData.slice(0, 50);
      
      setCalls(callsData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!user || selectedUsers.length === 0) return;
    
    // Générer un nom de salle Jitsi valide (lettres et chiffres uniquement)
    const roomId = `MessagerieRoom${Date.now()}${Math.random().toString(36).substr(2, 6)}`.replace(/[^a-zA-Z0-9]/g, '');
    
    try {
      await addDoc(collection(db, 'calls'), {
        roomName: roomId,
        type,
        initiatorId: user.uid,
        initiatorName: user.displayName || 'Anonyme',
        initiatorAvatar: user.photoURL || '',
        participants: [user.uid, ...selectedUsers],
        status: 'calling',
        startedAt: serverTimestamp(),
        acceptedBy: [],
        declinedBy: []
      });
      
      setShowNewCall(false);
      setSelectedUsers([]);
    } catch (err) {
      console.error("Erreur création appel:", err);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleDeleteCall = async (callId: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet appel de votre historique ?")) return;
    try {
      await deleteDoc(doc(db, 'calls', callId));
    } catch (err) {
      console.error("Erreur lors de la suppression de l'appel:", err);
    }
  };

  if (showNewCall) {
    return (
      <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-200">
        <div className="flex items-center px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button 
            onClick={() => {
              setShowNewCall(false);
              setSelectedUsers([]);
            }}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-medium text-gray-800 ml-4 flex-1">Nouvel appel</h1>
          {selectedUsers.length > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={() => handleStartCall('audio')}
                className="w-10 h-10 flex items-center justify-center bg-green-50 text-[#00a884] rounded-full hover:bg-green-100 transition-colors"
              >
                <Phone size={20} />
              </button>
              <button 
                onClick={() => handleStartCall('video')}
                className="w-10 h-10 flex items-center justify-center bg-green-50 text-[#00a884] rounded-full hover:bg-green-100 transition-colors"
              >
                <Video size={20} />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {allUsers.map((u: any) => {
            const isSelected = selectedUsers.includes(u.id);
            return (
              <div 
                key={u.id} 
                onClick={() => toggleUserSelection(u.id)}
                className={`flex items-center justify-between p-3 cursor-pointer border-b border-gray-50 transition-colors ${isSelected ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.displayName || u.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[24px] text-gray-400 mt-2.5 ml-2.5">person</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 truncate">{u.displayName || u.nickname}</h3>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#00a884] bg-[#00a884]' : 'border-gray-300'}`}>
                    {isSelected && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <Phone size={48} className="opacity-20" />
            </div>
            <p className="text-sm">Aucun appel récent</p>
          </div>
        ) : (
          <div className="py-2 pb-24">
            <p className="px-4 py-2 text-[13px] font-bold text-gray-400 uppercase tracking-wider">Récent</p>
            {calls.map((call) => {
              const isOutgoing = call.initiatorId === user.uid;
              const hasAccepted = call.acceptedBy?.includes(user.uid) || call.initiatorId === user.uid;
              const isMissed = !isOutgoing && call.status === 'ended' && !hasAccepted;
              
              // Déterminer les infos à afficher
              let callName = isOutgoing ? 'Appel sortant' : call.initiatorName;
              let callAvatar = isOutgoing ? null : call.initiatorAvatar;
              
              // Si c'est un appel sortant, on essaie de trouver le nom et l'avatar du destinataire
              if (isOutgoing) {
                // S'il s'agit d'un appel de groupe
                if (call.groupName) {
                  callName = call.groupName;
                  // Pas d'avatar spécifique pour le groupe pour l'instant
                } else if (call.participants && call.participants.length > 0) {
                  // Trouver le destinataire (le premier qui n'est pas moi)
                  const targetId = call.participants.find((id: string) => id !== user.uid);
                  if (targetId) {
                    const targetUser = allUsers.find(u => u.id === targetId);
                    if (targetUser) {
                      callName = targetUser.displayName || targetUser.nickname || 'Utilisateur';
                      callAvatar = targetUser.photoURL || null;
                    }
                  }
                }
              }
              
              return (
                <div key={call.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 group">
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {callAvatar ? (
                      <img src={callAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[24px] text-gray-400">person</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-[16px] truncate ${isMissed ? 'text-red-500' : 'text-gray-800'}`}>
                      {callName}
                    </h3>
                    <div className="flex items-center gap-1 text-[13px] text-gray-500 mt-0.5">
                      {isOutgoing ? (
                        <ArrowUpRight size={14} className="text-green-500" />
                      ) : (
                        <ArrowDownLeft size={14} className={isMissed ? 'text-red-500' : 'text-green-500'} />
                      )}
                      <span>
                        {call.startedAt ? new Date(call.startedAt.toDate()).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pr-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCall(call.id);
                      }}
                      className="p-2.5 text-red-500 hover:bg-gray-100 rounded-full transition-all flex items-center justify-center"
                      title="Supprimer l'appel"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Relancer l'appel si on clique sur l'icône (bonus pratique)
                        if (call.participants && call.participants.length > 0) {
                          const targetIds = call.participants.filter((id: string) => id !== user.uid);
                          if (targetIds.length > 0) {
                            setSelectedUsers(targetIds);
                            handleStartCall(call.type);
                          }
                        }
                      }}
                      className={`p-2.5 rounded-full transition-all flex items-center justify-center hover:bg-gray-100 ${call.type === 'video' ? 'text-[#00a884]' : 'text-[#00a884]'}`}
                      title={call.type === 'video' ? "Rappeler en vidéo" : "Rappeler"}
                    >
                      {call.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowNewCall(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#00a884] text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-[#008f6f] transition-all hover:scale-105 active:scale-95"
      >
        <span className="material-symbols-outlined text-[28px]">add_call</span>
      </button>
    </div>
  );
}
