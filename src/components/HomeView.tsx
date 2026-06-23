'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, MoreVertical, MessageCircle, CircleDashed, Users, Phone, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { auth, db } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, onSnapshot, orderBy, limit, getDoc, where, updateDoc, arrayUnion, arrayRemove, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import DiscussionList from './sidebar/DiscussionList';
import SearchView from './sidebar/SearchView';
import PlaceholderView from './sidebar/PlaceholderView';
import ProfileView from './sidebar/ProfileView';
import CallsView from './sidebar/CallsView';
import CreateGroupModal from './sidebar/CreateGroupModal';
import StatusView from './status/StatusView';

interface HomeViewProps {
  user?: any;
  onSelectGroup: (groupId: string | null, data?: { name: string, avatar?: string }) => void;
  onTabChange?: (tabId: string) => void;
  selectedGroupId?: string | null;
}

export default function HomeView({ user, onSelectGroup, onTabChange, selectedGroupId }: HomeViewProps) {
  const [activeTab, setActiveTab] = useState('discussion');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [timesAgo, setTimesAgo] = useState<{ [key: string]: string }>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  const [lastMessageTimes, setLastMessageTimes] = useState<{ [key: string]: string }>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [privateChats, setPrivateChats] = useState<any[]>([]);
  const [customGroups, setCustomGroups] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-réparation du profil utilisateur si supprimé de Firestore
  useEffect(() => {
    if (!user) return;

    const repairUserDoc = async () => {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log("Profil Firestore manquant détecté, recréation automatique...");
        const defaultName = user.displayName || user.email?.split('@')[0] || 'Utilisateur';
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: defaultName,
          nickname: defaultName,
          photoURL: user.photoURL || '',
          createdAt: new Date(),
          lastLogin: new Date()
        }, { merge: true });
      } else {
        // Si le document existe mais qu'il manque des champs essentiels (email ou pseudo)
        const data = userSnap.data();
        if (!data.email || !data.nickname) {
          console.log("Profil incomplet détecté, mise à jour des champs manquants...");
          await setDoc(userRef, {
            email: user.email,
            nickname: data.nickname || user.displayName || user.email?.split('@')[0] || 'Utilisateur',
            displayName: data.displayName || user.displayName || user.email?.split('@')[0] || 'Utilisateur',
            updatedAt: new Date()
          }, { merge: true });
        }
      }
    };

    repairUserDoc();
  }, [user]);

  // Écouter les utilisateurs réels (Méthode officielle Firestore onSnapshot)
  useEffect(() => {
    if (!user) return;

    // La méthode officielle recommandée par Firebase pour lister les utilisateurs côté client
    // est de maintenir une collection Firestore 'users' et d'y placer un écouteur en temps réel.
    const q = query(
      collection(db, 'users'),
      orderBy('nickname'), // Tri par pseudo pour un affichage propre
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // snapshot.docs contient uniquement les documents ACTUELLEMENT présents dans la collection
      // Si un document est supprimé de Firestore, il disparaît instantanément du snapshot.
      const usersList = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => {
              if (u.id === user.uid) return false; // On ne s'affiche pas soi-même
              if (!u.email) return false; // On ne garde que les comptes inscrits avec un email
              
              return true;
            });
      
      setAllUsers(usersList);
    }, (error) => {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Écouter les conversations privées
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'private_chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) })) as any[];
      // Filtrer les chats qui ont été supprimés par cet utilisateur
      const activeChats = chats.filter(chat => !chat.deletedBy?.includes(user.uid));
      
      // Trier côté client au lieu de Firebase pour éviter le besoin d'un index composite
      activeChats.sort((a, b) => {
        const dateA = (a.updatedAt || a.createdAt)?.toDate?.()?.getTime() || 0;
        const dateB = (b.updatedAt || b.createdAt)?.toDate?.()?.getTime() || 0;
        return dateB - dateA; // Ordre décroissant
      });
      
      setPrivateChats(activeChats);
    }, (error) => {
      console.error("Erreur lors de la récupération des conversations privées:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Écouter les groupes personnalisés
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) })) as any[];
      // Filter out deleted groups if needed (e.g. deleted by me)
      const activeGroups = groups.filter(g => !g.deletedBy?.includes(user.uid));
      
      activeGroups.sort((a, b) => {
        const dateA = (a.updatedAt || a.createdAt)?.toDate?.()?.getTime() || 0;
        const dateB = (b.updatedAt || b.createdAt)?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
      
      setCustomGroups(activeGroups);
    }, (error) => {
      console.error("Erreur lors de la récupération des groupes personnalisés:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Utiliser une ref pour selectedGroupId pour éviter de re-souscrire
  const selectedGroupIdRef = useRef(selectedGroupId);
  const messagesSnapshotRef = useRef<any[]>([]);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
    
    // Dès qu'on sélectionne un groupe, on marque comme lus tous les messages non lus de ce groupe
    if (selectedGroupId && user) {
      messagesSnapshotRef.current.forEach(docSnap => {
        const msg = docSnap.data();
        const gid = msg.groupId || 'general';
        const isUnread = msg.uid !== user.uid && (!msg.readBy || !msg.readBy[user.uid]);
        
        if (isUnread && gid === selectedGroupId) {
          const msgRef = doc(db, 'messages', docSnap.id);
          updateDoc(msgRef, {
            [`readBy.${user.uid}`]: user.displayName || 'Anonyme'
          }).catch(err => console.warn("Erreur marquage lecture au focus:", err));
        }
      });
    }
  }, [selectedGroupId, user]);

  // Écouter les messages non lus et l'heure du dernier message
  useEffect(() => {
    if (!user) return;

    // On limite aux 50 derniers messages pour les performances
    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      messagesSnapshotRef.current = snapshot.docs;
      const counts: { [key: string]: number } = { snapchat: 0, general: 0 };
      const times: { [key: string]: string } = {};
      
      snapshot.docs.forEach(docSnap => {
        const msg = docSnap.data();
        const gid = msg.groupId || 'general';
        
        // Stocker l'heure du dernier message pour chaque groupe
        if (!times[gid] && msg.createdAt) {
          const date = msg.createdAt.toDate();
          times[gid] = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Un message est non lu si :
        // 1. Il n'est pas de moi
        // 2. Mon UID n'est pas dans readBy
        const isUnread = msg.uid !== user.uid && (!msg.readBy || !msg.readBy[user.uid]);
        
        if (isUnread) {
          // Si on est actuellement dans ce groupe, on le marque comme lu directement ici
          if (selectedGroupIdRef.current === gid) {
             const msgRef = doc(db, 'messages', docSnap.id);
             updateDoc(msgRef, {
               [`readBy.${user.uid}`]: user.displayName || 'Anonyme'
             }).catch(err => console.warn("Erreur marquage lecture:", err));
          } else {
            // Logique spécifique Snapchat (Team Messagerie)
            if (gid === 'snapchat') {
              if (msg.displayName === 'Team Messagerie' || msg.displayName === 'Team Messagerie-Main' || (msg.displayName === 'My IA' && (msg as any).targetUid === user.uid)) {
                counts.snapchat++;
              }
            } else {
              // Pour les autres groupes (dont general)
              counts[gid] = (counts[gid] || 0) + 1;
            }
          }
        }
      });
      
      setUnreadCounts(counts);
      setLastMessageTimes(times);
    });

    return () => unsubscribe();
  }, [user]);

  const updateTimers = useCallback(() => {
    const groups = ['snapchat', 'general'];
    if (user?.uid) {
      groups.push(`ai-${user.uid}`);
    }
    // Ajouter les chats privés
    privateChats.forEach(chat => {
      groups.push(chat.id);
    });
    // Ajouter les groupes personnalisés
    customGroups.forEach(group => {
      groups.push(group.id);
    });

    const newTimes: { [key: string]: string } = {};

    groups.forEach(id => {
      const lastOpen = localStorage.getItem(`last_open_${id}`);
      if (!lastOpen) {
        newTimes[id] = '0 s';
        return;
      }

      const diff = Date.now() - parseInt(lastOpen);
      const secs = Math.floor(diff / 1000);
      const mins = Math.floor(secs / 60);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) newTimes[id] = `${days} j`;
      else if (hours > 0) newTimes[id] = `${hours} h`;
      else if (mins > 0) newTimes[id] = `${mins} min`;
      else newTimes[id] = `${secs} s`;
    });

    setTimesAgo(newTimes);
  }, [user?.uid, privateChats]);

  useEffect(() => {
    updateTimers();
    const timer = setInterval(updateTimers, 1000); // Mise à jour chaque seconde
    return () => clearInterval(timer);
  }, [updateTimers]);

  const handleGroupSelect = (id: string) => {
    localStorage.setItem(`last_open_${id}`, Date.now().toString());
    updateTimers();
    onSelectGroup(id);
  };

  const handleStartPrivateChat = async (otherUser: any) => {
    if (!user) return;
    const uid1 = user.uid;
    const uid2 = otherUser.id || otherUser.uid;
    if (uid1 === uid2) return;
    
    let finalPhotoURL = otherUser.photoURL || '';
    let finalName = otherUser.displayName || otherUser.nickname || 'Anonyme';
    const chatId = `private_${[uid1, uid2].sort().join('_')}`;

    // Switch to this chat and pass the other user's info immediately (Optimistic UI)
    localStorage.setItem(`last_open_${chatId}`, Date.now().toString());
    updateTimers();
    onSelectGroup(chatId, {
      name: finalName,
      avatar: finalPhotoURL
    });
    // Basculer sur l'onglet discussion
    setActiveTab('discussion');
    if (onTabChange) onTabChange('discussion');

    if (!finalPhotoURL) {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid2));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.photoURL) finalPhotoURL = data.photoURL;
          if (data.displayName || data.nickname) finalName = data.displayName || data.nickname;
          
          onSelectGroup(chatId, {
            name: finalName,
            avatar: finalPhotoURL
          });
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du profil:", err);
      }
    }
    
    // Créer la conversation dans Firestore en arrière-plan
    try {
      const chatRef = doc(db, 'private_chats', chatId);
      await setDoc(chatRef, {
        participants: [uid1, uid2],
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      await updateDoc(chatRef, {
        deletedBy: arrayRemove(user.uid)
      }).catch(() => {});
    } catch (e) {
      console.error("Erreur lors de la création de la conversation:", e);
    }
  };

  const handleDeletePrivateChat = async (chatId: string) => {
    if (!user || !window.confirm("Voulez-vous vraiment supprimer cette conversation ?")) return;
    try {
      // 1. Mettre à jour le chat privé pour l'UI instantanément
      const chatRef = doc(db, 'private_chats', chatId);
      await updateDoc(chatRef, {
        deletedBy: arrayUnion(user.uid),
        [`clearedAt.${user.uid}`]: serverTimestamp()
      });

      if (selectedGroupId === chatId) {
        onSelectGroup(null);
      }

      // 2. Supprimer DÉFINITIVEMENT les messages de cette conversation de la base de données
      const q = query(collection(db, 'messages'), where('groupId', '==', chatId));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.forEach((document) => {
        batch.delete(document.ref);
      });
      
      await batch.commit();

    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'discussion', icon: 'chat', label: 'Discussion' },
    { id: 'commu', icon: 'person_search', label: 'Recherche' },
    { id: 'actus', icon: 'radio_button_checked', label: 'Statut' },
    { id: 'appels', icon: 'call', label: 'Appels' },
    { id: 'profil', icon: 'account_circle', label: 'Profil' },
  ];

  useEffect(() => {
    const handleAppNavigate = (e: any) => {
      if (e.detail?.tabId) {
        handleTabClick(e.detail.tabId);
      }
    };
    window.addEventListener('app_navigate', handleAppNavigate);
    return () => window.removeEventListener('app_navigate', handleAppNavigate);
  }, []);

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (onTabChange) onTabChange(id);
  };

  const activeIconName = navItems.find(i => i.id === activeTab)?.icon || 'chat';

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar Vertical Icons (Desktop only) */}
      <nav className="hidden md:flex flex-col items-center py-4 w-[64px] bg-white gap-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={`p-2.5 rounded-full transition-all relative group flex items-center justify-center ${
              activeTab === item.id ? 'text-[#00a884] bg-green-50/80' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
            title={item.label}
          >
            <span 
              className="material-symbols-outlined" 
              style={{ fontSize: '24px', fontVariationSettings: activeTab === item.id ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
          </button>
        ))}
      </nav>

      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="flex justify-between items-center p-4 bg-white">
          <h1 className="text-xl font-normal text-black truncate">
            {navItems.find(i => i.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-4 text-gray-600 flex-shrink-0 relative">
            <button 
              onClick={() => handleTabClick('commu')}
              className="p-1 hover:bg-gray-100 rounded-full transition-all flex items-center justify-center text-gray-600"
              title="Nouveau message"
            >
              <span className="material-symbols-outlined text-[24px]">add_comment</span>
            </button>
            
            <div ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1 hover:bg-gray-100 rounded-full transition-all flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[24px]">more_vert</span>
              </button>

              {isMenuOpen && (
                   <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 overflow-hidden">
                     <button 
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center gap-2.5"
                      onClick={() => {
                        handleTabClick('profil');
                        setIsMenuOpen(false);
                      }}
                     >
                       <span className="material-symbols-outlined text-[20px]">settings</span>
                       Réglages
                     </button>
                     <button 
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center gap-2.5"
                      onClick={() => {
                        setShowCreateGroup(true);
                        setIsMenuOpen(false);
                      }}
                     >
                       <span className="material-symbols-outlined text-[20px]">group_add</span>
                       Créer un groupe
                     </button>
                     <button 
                       className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center gap-2.5"
                       onClick={() => {
                         handleTabClick('commu');
                         setIsMenuOpen(false);
                       }}
                     >
                       <span className="material-symbols-outlined text-[20px]">add_comment</span>
                       Nouvelle discussion
                     </button>
                   </div>
                 )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-white md:border-l md:border-t md:border-gray-300 md:rounded-tl-xl md:ml-[-1px]">
          {activeTab === 'discussion' && (
            <DiscussionList 
              user={user}
              selectedGroupId={selectedGroupId || null}
              onSelectGroup={onSelectGroup}
              unreadCounts={unreadCounts}
              lastMessageTimes={lastMessageTimes}
              timesAgo={timesAgo}
              privateChats={privateChats}
              customGroups={customGroups}
              allUsers={allUsers}
              onDeletePrivateChat={handleDeletePrivateChat}
            />
          )}
          {activeTab === 'commu' && <SearchView users={allUsers} onStartPrivateChat={handleStartPrivateChat} />}
          {activeTab === 'actus' && <StatusView user={user} />}
          {activeTab === 'appels' && <CallsView user={user} allUsers={allUsers} />}
          {activeTab === 'profil' && <ProfileView />}
        </div>

        {/* Bottom Nav (Mobile only) */}
        <nav className="md:hidden flex justify-around items-center p-2 border-t border-gray-100 bg-white relative h-[64px]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative ${
                activeTab === item.id ? 'text-[#00a884]' : 'text-gray-400'
              }`}
            >
              <div className="absolute top-1 flex flex-col items-center w-full">
                <div className={`transition-all duration-200 flex items-center justify-center ${activeTab === item.id ? 'bg-green-50 px-5 py-1 rounded-full' : 'px-5 py-1'}`}>
                  <span 
                    className="material-symbols-outlined transition-all duration-200" 
                    style={{ fontSize: '24px', fontVariationSettings: activeTab === item.id ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                </div>
                <span className={`text-[11px] mt-0.5 transition-all duration-200 ${activeTab === item.id ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal 
          user={user}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(groupId, data) => {
            onSelectGroup(groupId, data);
            setActiveTab('discussion');
          }}
        />
      )}
    </div>
  );
}

