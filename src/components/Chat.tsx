'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
  where,
  or,
  setDoc,
  getDoc,
  getDocs,
  arrayRemove,
  arrayUnion,
  deleteDoc
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Send, Zap, Circle, MoreVertical, Camera, CheckCheck, ArrowLeft, Loader2, X, Play, Volume2, ExternalLink, Smile, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Copy, Check } from 'lucide-react';
import { ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';
import AddMembersModal from './sidebar/AddMembersModal';
import CreateGroupModal from './sidebar/CreateGroupModal';
import StatusViewer from './status/StatusViewer';

interface LinkPreviewData {
  type: 'youtube' | 'tiktok' | 'myinstants' | 'generic';
  title: string;
  description?: string;
  author?: string;
  thumbnail?: string;
  image?: string;
  embedUrl?: string;
  url: string;
  audioUrl?: string;
  siteName?: string;
}

const LinkPreviewCard = ({ url }: { url: string }) => {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          setPreview(data);
        }
      } catch (err) {
        console.error('Failed to fetch preview', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [url]);

  if (loading) return <div className="mt-2 h-20 w-full bg-gray-50 animate-pulse rounded-lg border border-gray-100" />;
  if (!preview) return null;

  const handleClick = () => window.open(url, '_blank');

  return (
    <div 
      onClick={handleClick}
      className="mt-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:border-gray-200 transition-all max-w-[320px]"
    >
      {/* Thumbnail or Video Player */}
      {isPlaying && preview.embedUrl ? (
        <div 
          className={`relative bg-black flex items-center justify-center overflow-hidden ${
            preview.type === 'tiktok' ? 'h-[500px]' : 'aspect-video'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <iframe
            src={preview.embedUrl}
            className="w-full h-full border-none"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (preview.thumbnail || preview.image) && (
        <div className="relative aspect-video bg-gray-100 overflow-hidden group">
          <img 
            src={preview.thumbnail || preview.image} 
            alt={preview.title} 
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          {(preview.type === 'youtube' || preview.type === 'tiktok') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(true);
                }}
                className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg text-red-600 hover:scale-110 transition-transform"
              >
                <Play size={24} fill="currentColor" />
              </div>
            </div>
          )}
          {preview.type === 'myinstants' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition-all">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg text-white">
                <Volume2 size={24} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3">
        {preview.siteName && (
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            {preview.siteName}
          </p>
        )}
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">
          {preview.title}
        </h3>
        {preview.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {preview.description}
          </p>
        )}
        {preview.author && (
          <p className="text-[11px] text-[#00a884] font-medium mt-1">
            Par {preview.author}
          </p>
        )}
        
        {/* MyInstants Petit Plus: Audio Player */}
        {preview.type === 'myinstants' && preview.audioUrl && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                try {
                  const audio = new Audio(preview.audioUrl);
                  audio.play().catch(err => {
                    console.error("Erreur de lecture audio:", err);
                    window.open(url, '_blank');
                  });
                } catch (err) {
                  window.open(url, '_blank');
                }
              }}
              className="w-full py-2.5 bg-[#00a884] text-white rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#008f6a] transition-all shadow-sm active:scale-[0.98]"
            >
              <Volume2 size={16} fill="white" />
              ÉCOUTER LE SON
            </button>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
          <ExternalLink size={10} />
          <span className="truncate">{new URL(url).hostname}</span>
        </div>
      </div>
    </div>
  );
};
import { usePresence } from '@/lib/presence';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App } from '@capacitor/app';

interface Message {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  createdAt: Timestamp | any;
  readBy?: { [uid: string]: string };
  groupId?: string | null;
  imageUrl?: string;
  videoUrl?: string;
  targetUid?: string;
}

const CodeBlock = ({ children, className, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg';
      case 'javascript': case 'js': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg';
      case 'typescript': case 'ts': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg';
      case 'html': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg';
      case 'css': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg';
      case 'react': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg';
      case 'json': return 'https://www.vectorlogo.zone/logos/json/json-icon.svg';
      case 'php': return 'https://www.vectorlogo.zone/logos/php/php-icon.svg';
      default: return null;
    }
  };

  const iconUrl = getIcon(language);

  return match ? (
    <div className="my-2 rounded-xl border border-gray-200 bg-[#fcfcfc] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          {iconUrl && <img src={iconUrl} alt={language} className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-medium text-gray-500 lowercase">{language || 'code'}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-800 transition-colors"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
      <div className="p-0">
        <SyntaxHighlighter
          style={ghcolors as any}
          language={language}
          PreTag="div"
          customStyle={{ 
            margin: 0, 
            padding: '12px', 
            background: 'transparent',
            fontSize: '13px',
            lineHeight: '1.4'
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    </div>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

export default function Chat({ 
  groupId = 'snapchat',
  groupName = 'Team Messagerie',
  groupAvatar,
  onBack,
  onStartPrivateChat,
  onNavigate
}: { 
  groupId?: string | null,
  groupName?: string,
  groupAvatar?: string,
  onBack?: () => void,
  onStartPrivateChat?: (user: { uid: string, displayName: string, photoURL?: string }) => void,
  onNavigate?: (tab: string) => void
}) {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageLimit, setMessageLimit] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [appState, setAppState] = useState('active');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showOtherUserProfile, setShowOtherUserProfile] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingVideo, setPendingVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { onlineUsers, setTyping } = usePresence(user?.uid, user?.displayName);
  const [otherUserRealtimeData, setOtherUserRealtimeData] = useState<{ displayName?: string, photoURL?: string } | null>(null);
  const [allGroupUsers, setAllGroupUsers] = useState<any[]>([]);
  const [customGroupData, setCustomGroupData] = useState<any | null>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');
  
  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!user || !groupId) return;
    
    // Check if we can call this group/user
    if (groupId.startsWith('ai-') || groupId === 'snapchat') return;

    // Générer un nom de salle Jitsi valide (lettres et chiffres uniquement)
    const roomId = `MessagerieRoom${Date.now()}${Math.random().toString(36).substr(2, 6)}`.replace(/[^a-zA-Z0-9]/g, '');
    
    try {
      let participants = [user.uid];
      let finalGroupName = groupName;
      
      if (groupId.startsWith('private_')) {
        // Find the other user from groupId
        const uids = groupId.replace('private_', '').split('_');
        participants = uids;
        finalGroupName = '';
      } else if (isCustomGroup && customGroupData) {
        participants = customGroupData.members || [user.uid];
      } else if (groupId === 'general') {
        // Pour général, on met une balise spéciale et on ne liste pas tous les participants pour éviter de dépasser la limite
        participants = ['general_call']; 
        finalGroupName = 'Groupe Général';
      }

      await addDoc(collection(db, 'calls'), {
        roomName: roomId,
        type,
        initiatorId: user.uid,
        initiatorName: user.displayName || 'Anonyme',
        initiatorAvatar: user.photoURL || '',
        participants: participants,
        groupId: groupId,
        groupName: finalGroupName,
        status: 'calling',
        startedAt: serverTimestamp(),
        acceptedBy: [],
        declinedBy: []
      });
      
      // Close the modal if open
      setShowOtherUserProfile(false);
    } catch (err) {
      console.error("Erreur création appel:", err);
    }
  };

  const [otherUserStatus, setOtherUserStatus] = useState<any | null>(null);
  const [viewingOtherUserStatus, setViewingOtherUserStatus] = useState(false);

  const isCustomGroup = groupId && !groupId.startsWith('private_') && !groupId.startsWith('ai-') && groupId !== 'general' && groupId !== 'snapchat';

  const saveGroupName = async () => {
    if (!groupId || !editedGroupName.trim() || !user) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        name: editedGroupName.trim(),
        updatedAt: serverTimestamp()
      });
      setIsEditingGroupName(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du nom:", error);
    }
  };

  const handleGroupImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId || !user) return;
    
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `group-${groupId}-${Date.now()}.${fileExt}`;
      const filePath = `group-images/${fileName}`;

      const { error } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        photoURL: publicUrl,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Erreur update image:', error.message);
      alert('Erreur lors de la mise à jour de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMember = async (e: React.MouseEvent, memberId: string, memberName: string) => {
    e.stopPropagation(); // Empêcher l'ouverture du chat privé
    if (!groupId || !user || !isCustomGroup) return;
    
    const isCreator = customGroupData?.createdBy === user.uid;
    const isAdmin = isCreator || customGroupData?.admins?.includes(user.uid);

    if (!isAdmin) {
      alert("Seul un administrateur du groupe peut retirer des membres.");
      return;
    }

    if (memberId === customGroupData?.createdBy) {
      alert("Vous ne pouvez pas retirer le créateur du groupe.");
      return;
    }

    if (window.confirm(`Voulez-vous vraiment retirer ${memberName} de ce groupe ?`)) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
          members: arrayRemove(memberId),
          admins: arrayRemove(memberId), // Au cas où il était admin
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Erreur lors de l'exclusion du membre:", error);
      }
    }
  };

  const handleToggleAdmin = async (e: React.MouseEvent, memberId: string, isCurrentlyAdmin: boolean) => {
    e.stopPropagation();
    if (!groupId || !user || !isCustomGroup) return;

    const isCreator = customGroupData?.createdBy === user.uid;
    if (!isCreator) {
      alert("Seul le créateur du groupe peut nommer ou révoquer des administrateurs.");
      return;
    }

    if (memberId === user.uid) return;

    try {
      const groupRef = doc(db, 'groups', groupId);
      if (isCurrentlyAdmin) {
        await updateDoc(groupRef, {
          admins: arrayRemove(memberId),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(groupRef, {
          admins: arrayUnion(memberId),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Erreur lors de la modification des droits admin:", error);
    }
  };

  // Fetch all users for the general group profile or custom group profile
  useEffect(() => {
    if (showOtherUserProfile && (groupId === 'general' || isCustomGroup)) {
      const fetchAllUsers = async () => {
        try {
          const q = query(collection(db, 'users'));
          const snap = await getDocs(q);
          let users = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => {
              if (!u.email) return false;
              return true;
            });

          if (isCustomGroup && customGroupData) {
            users = users.filter((u: any) => customGroupData.members?.includes(u.id));
          }

          users.sort((a: any, b: any) => {
            const nameA = a.displayName || a.nickname || '';
            const nameB = b.displayName || b.nickname || '';
            return nameA.localeCompare(nameB);
          });
          setAllGroupUsers(users);
        } catch (err) {
          console.error("Erreur lors de la récupération des utilisateurs:", err);
        }
      };
      fetchAllUsers();
    }
  }, [showOtherUserProfile, groupId, isCustomGroup, customGroupData]);

  // Listen to custom group data
  useEffect(() => {
    if (!user) return;

    if (isCustomGroup && groupId) {
      const groupRef = doc(db, 'groups', groupId);
      const unsubscribe = onSnapshot(groupRef, (docSnap) => {
        if (!docSnap.exists()) {
          // Le groupe a été supprimé par un autre utilisateur
          if (onBack) onBack();
          return;
        }
        
        const data = docSnap.data();
        // Si je ne fais plus partie des membres
        if (!data.members?.includes(user.uid)) {
          if (onBack) onBack();
          return;
        }

        setCustomGroupData({ id: docSnap.id, ...data });
      });
      return () => unsubscribe();
    } else if (groupId?.startsWith('private_')) {
      // Pour les chats privés, on écoute aussi les suppressions
      const chatRef = doc(db, 'private_chats', groupId);
      const unsubscribe = onSnapshot(chatRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.deletedBy?.includes(user.uid)) {
            // Si on l'a supprimé d'un autre appareil
            if (onBack) onBack();
          }
        }
      });
      return () => unsubscribe();
    } else {
      setCustomGroupData(null);
    }
  }, [groupId, isCustomGroup, user, onBack]);

  const handleLeaveGroup = async () => {
    if (!groupId || !user || !window.confirm("Voulez-vous vraiment quitter ce groupe ?")) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) return;
      const groupData = groupSnap.data();
      
      let newCreatedBy = groupData.createdBy;
      let newAdmins = groupData.admins || [];
      const currentMembers = groupData.members || [];
      
      // Filtrer l'utilisateur actuel de la liste des membres
      const remainingMembers = currentMembers.filter((id: string) => id !== user.uid);
      
      // Si l'utilisateur qui quitte est le créateur
      if (groupData.createdBy === user.uid) {
        if (remainingMembers.length > 0) {
          // Chercher un admin existant pour devenir le nouveau créateur (super-admin)
          const remainingAdmins = newAdmins.filter((id: string) => id !== user.uid);
          
          if (remainingAdmins.length > 0) {
            // S'il y a d'autres admins, on prend le premier pour devenir le "createdBy"
            newCreatedBy = remainingAdmins[0];
          } else {
            // S'il n'y a pas d'autres admins, on choisit aléatoirement un membre restant
            const randomIndex = Math.floor(Math.random() * remainingMembers.length);
            newCreatedBy = remainingMembers[randomIndex];
            // On le promeut également admin pour être sûr
            newAdmins.push(newCreatedBy);
          }
        } else {
          // S'il n'y a plus personne dans le groupe, le groupe sera techniquement vide.
          // On pourrait le supprimer, mais pour suivre WhatsApp on le laisse vide.
          newCreatedBy = null;
        }
      }

      await updateDoc(groupRef, {
        members: arrayRemove(user.uid),
        admins: arrayRemove(user.uid), // Retirer des admins s'il l'était
        createdBy: newCreatedBy, // Transférer la propriété si nécessaire
        updatedAt: serverTimestamp()
      });
      if (onBack) onBack();
    } catch (error) {
      console.error("Erreur lors de la sortie du groupe:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId || !user || !window.confirm("Voulez-vous vraiment supprimer ce groupe pour tout le monde ?")) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      await deleteDoc(groupRef);
      
      // Optionnel : supprimer les messages associés au groupe
      // Cela peut être lourd côté client, idéalement fait via Cloud Functions
      // Pour l'instant on supprime juste le document du groupe
      
      if (onBack) onBack();
    } catch (error) {
      console.error("Erreur lors de la suppression du groupe:", error);
    }
  };

  // Écouter les changements de profil de l'autre utilisateur en temps réel et son statut
  useEffect(() => {
    if (!groupId?.startsWith('private_')) {
      setOtherUserRealtimeData(null);
      setOtherUserStatus(null);
      return;
    }
    
    // Extraire l'ID de l'autre utilisateur depuis l'ID du groupe
    const participants = groupId.replace('private_', '').split('_');
    const otherUserId = participants.find(id => id !== user?.uid);
    
    if (!otherUserId) return;

    const userRef = doc(db, 'users', otherUserId);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOtherUserRealtimeData({
          displayName: data.displayName || data.nickname,
          photoURL: data.photoURL
        });
      }
    });

    const statusRef = doc(db, 'statuses', otherUserId);
    const unsubscribeStatus = onSnapshot(statusRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        
        const validItems = (data.items || []).filter((item: any) => {
          if (!item.createdAt) return false;
          return item.createdAt.toDate() > twentyFourHoursAgo;
        });
        
        if (validItems.length > 0) {
          setOtherUserStatus({ ...data, uid: docSnap.id, items: validItems });
        } else {
          setOtherUserStatus(null);
        }
      } else {
        setOtherUserStatus(null);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeStatus();
    };
  }, [groupId, user?.uid]);

  useEffect(() => {
    // Détecter l'état de l'app (Native)
    // --- RÉPARATION CLAVIER MOBILE (NATIF & WEB) ---
    const handleVisualViewportChange = () => {
      if (window.visualViewport && scrollRef.current) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const keyboardHeight = windowHeight - viewportHeight;
        
        if (keyboardHeight > 50) {
          scrollRef.current.style.paddingBottom = `${keyboardHeight}px`;
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 100);
        } else {
          scrollRef.current.style.paddingBottom = '0px';
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      window.visualViewport.addEventListener('scroll', handleVisualViewportChange);
    }

    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        setAppState(isActive ? 'active' : 'background');
      });
      
      // Demander permission notifications natives
      LocalNotifications.requestPermissions();

      // --- RÉPARATION CLAVIER MOBILE ---
      window.addEventListener('keyboardWillShow', (e: any) => {
        if (scrollRef.current) {
          scrollRef.current.style.marginBottom = `${e.keyboardHeight}px`;
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 100);
        }
      });

      window.addEventListener('keyboardWillHide', () => {
        if (scrollRef.current) {
          scrollRef.current.style.marginBottom = '0px';
        }
      });
      // ----------------------------------
    }

    // Initialiser le son de notification
    audioRef.current = new Audio('/sounds/notification.mp3');
    
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    // Demander la permission pour les notifications
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
        window.visualViewport.removeEventListener('scroll', handleVisualViewportChange);
      }
    };
  }, []);

  // Réinitialiser les états lors du changement de groupe
  useEffect(() => {
    setMessageLimit(30);
    setIsInitialLoad(true);
    setHasMore(true);
    setIsLoadingMore(false);
  }, [groupId]);

  const sendDirectMessage = async (text: string, imageUrl?: string, videoUrl?: string) => {
    if ((!text.trim() && !imageUrl && !videoUrl) || !user) return;

    const startTime = performance.now();
    const messageData: any = {
      text: text,
      uid: user.uid,
      displayName: user.displayName || 'Utilisateur',
      sentAt: startTime,
    };

    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }

    if (videoUrl) {
      messageData.videoUrl = videoUrl;
    }

    // Envoi via Firestore
    try {
      await addDoc(collection(db, 'messages'), {
        ...messageData,
        groupId: groupId,
        createdAt: serverTimestamp(),
        readBy: { [user.uid]: user.displayName || 'Utilisateur' }
      });

      // Si c'est un chat privé, on met à jour le document de la conversation
      if (groupId?.startsWith('private_')) {
        const uids = groupId.replace('private_', '').split('_');
        const chatRef = doc(db, 'private_chats', groupId);
        
        let lastMsgText = text;
        if (!text && imageUrl) lastMsgText = "📸 Image";
        if (!text && videoUrl) lastMsgText = "🎥 Vidéo";

        await setDoc(chatRef, {
          participants: uids,
          updatedAt: serverTimestamp(),
          lastMessage: lastMsgText,
          deletedBy: [] // On réinitialise les suppressions quand un nouveau message est envoyé
        }, { merge: true });
      }

      // Si c'est un groupe personnalisé, on met à jour le document du groupe
      if (isCustomGroup && groupId) {
        const groupRef = doc(db, 'groups', groupId);
        let lastMsgText = text;
        if (!text && imageUrl) lastMsgText = "📸 Image";
        if (!text && videoUrl) lastMsgText = "🎥 Vidéo";

        await updateDoc(groupRef, {
          updatedAt: serverTimestamp(),
          lastMessage: `${user.displayName || 'Utilisateur'}: ${lastMsgText}`,
          deletedBy: [] // Réinitialiser si quelqu'un l'avait supprimé
        }).catch(err => console.warn("Erreur maj groupe personnalisé:", err));
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const processFile = async (file: File) => {
    if (!user) return;
    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(fileExt || '');
      const isGif = fileExt === 'gif';

      // Bloquer les vidéos et les GIFs pour l'IA
      if (groupId?.startsWith('ai-') && (isVideo || isGif)) {
        alert("Désolé, My IA ne peut pas encore analyser les vidéos ou les GIFs. Merci d'envoyer une image fixe (JPG, PNG, WebP).");
        return;
      }
      
      const fileName = `${user.uid}-${Date.now()}.${fileExt}`;
      const filePath = `${isVideo ? 'chat-videos' : 'chat-images'}/${fileName}`;

      const { error } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      
      if (isVideo) {
        setPendingVideo(publicUrl);
        setPendingImage(null);
      } else {
        setPendingImage(publicUrl);
        setPendingVideo(null);
      }
    } catch (error: any) {
      console.error('Erreur upload:', error.message);
      alert('Erreur lors de l\'envoi du fichier');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('video') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          await processFile(file);
          break; // On ne traite qu'un fichier à la fois
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      await processFile(file);
    }
  };

  // Marquer les messages comme lus
  useEffect(() => {
    if (!user || messages.length === 0) return;

    // On vérifie tous les messages chargés
    messages.forEach(async (msg) => {
      // Si je n'ai pas encore lu ce message et que ce n'est pas moi qui l'ai envoyé
      if (msg.uid !== user.uid && (!msg.readBy || !msg.readBy[user.uid])) {
        try {
          const msgRef = doc(db, 'messages', msg.id);
          await updateDoc(msgRef, {
            [`readBy.${user.uid}`]: user.displayName || 'Anonyme'
          });
        } catch (err) {
          // L'erreur peut arriver si le message vient d'être supprimé ou si on n'a pas les droits
          console.warn("Erreur marquage lecture pour:", msg.id);
        }
      }
    });
  }, [messages, user]);

  const [clearedAtTime, setClearedAtTime] = useState<number>(0);

  // Fetch clearedAt once when entering a private chat
  useEffect(() => {
    if (groupId?.startsWith('private_') && user?.uid) {
      const chatRef = doc(db, 'private_chats', groupId);
      getDoc(chatRef).then(chatSnap => {
        if (chatSnap.exists()) {
          const data = chatSnap.data();
          if (data.clearedAt && data.clearedAt[user.uid]) {
            setClearedAtTime(data.clearedAt[user.uid].toDate?.()?.getTime() || 0);
          } else {
            setClearedAtTime(0);
          }
        }
      }).catch(e => console.error("Erreur lecture clearedAt:", e));
    } else {
      setClearedAtTime(0);
    }
  }, [groupId, user?.uid]);

  useEffect(() => {
    // Construction de la requête filtrée par groupe avec limite (Performance 2026 Strategy)
    const q = groupId === 'general' 
      ? query(
          collection(db, 'messages'),
          or(where('groupId', '==', 'general'), where('groupId', '==', null)),
          orderBy('createdAt', 'desc'),
          limit(messageLimit)
        )
      : query(
          collection(db, 'messages'),
          where('groupId', '==', groupId),
          orderBy('createdAt', 'desc'),
          limit(messageLimit)
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      // Vérifier s'il y a plus de messages à charger
       setHasMore(fetchedMessages.length === messageLimit);
 
       // --- MODE TEAM SNAPCHAT vs GENERAL ---
       // Si on est dans le groupe snapchat:
       // 1. Tout le monde voit les messages de "Team Messagerie"
       // 2. Tout le monde voit les réponses de "My IA"
       // 3. Un utilisateur ne voit que ses propres messages
       
       const filteredMessages = fetchedMessages.filter(msg => {
         if (groupId === 'snapchat') {
           // Les messages officiels
           if (msg.displayName === 'Team Messagerie' || msg.displayName === 'Team Messagerie-Main') return true;
           // Les réponses de My IA ne sont visibles que par celui qui a posé la question
           if (msg.displayName === 'My IA') return msg.targetUid === user?.uid;
           // Les messages de l'utilisateur
           if (msg.uid === user?.uid) return true;
           
           return false;
         }
         
         // Filtrer les messages supprimés via clearedAt
         if (clearedAtTime > 0 && msg.createdAt) {
           const msgTime = msg.createdAt.toDate?.()?.getTime() || 0;
           if (msgTime < clearedAtTime) return false;
         }
         
         return true;
       });

       // Gérer les notifications pour les nouveaux messages
        if (!snapshot.metadata.hasPendingWrites) {
          const lastMsg = fetchedMessages[0]; // Rappel: orderBy desc
          const isAppBackground = Capacitor.isNativePlatform() ? appState !== 'active' : document.visibilityState !== 'visible';
          
          // On ne notifie que pour les messages du groupe actuel qui nous concernent
          const shouldNotify = lastMsg && lastMsg.uid !== user?.uid && isAppBackground && (
            (groupId === 'snapchat' && (lastMsg.displayName === 'Team Messagerie' || lastMsg.displayName === 'Team Messagerie-Main' || (lastMsg.displayName === 'My IA' && lastMsg.targetUid === user?.uid))) ||
            (groupId !== 'snapchat' && lastMsg.groupId === groupId)
          );

          if (shouldNotify) {
            // On vérifie si on a déjà notifié pour ce message
            const lastNotifId = localStorage.getItem('last_notif_id');
            if (lastNotifId !== lastMsg.id) {
              localStorage.setItem('last_notif_id', lastMsg.id);
              
              // --- NOTIFICATION NATIVE (CAPACITOR) ---
              if (Capacitor.isNativePlatform()) {
                // Vibration native
                Haptics.vibrate();
                
                // Notification avec le son système WhatsApp (res/raw/notification.mp3)
                LocalNotifications.schedule({
                  notifications: [
                    {
                      title: `Nouveau message de ${lastMsg.displayName}`,
                      body: lastMsg.text,
                      id: Math.floor(Math.random() * 1000000),
                      sound: 'notification.mp3', // Nom du fichier dans res/raw
                      attachments: [],
                      actionTypeId: '',
                      extra: null
                    }
                  ]
                });
              } else {
                // --- NOTIFICATION WEB CLASSIQUE ---
                // Jouer le son personnalisé
                if (audioRef.current) {
                  audioRef.current.play().catch(e => console.log("Autoplay bloqué:", e));
                }

                if (Notification.permission === 'granted') {
                  navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(`Nouveau message de ${lastMsg.displayName}`, {
                      body: lastMsg.text,
                      icon: '/Logo.png',
                      badge: '/Logo.png',
                      tag: 'new-message',
                      renotify: true,
                      data: {
                        groupId: lastMsg.groupId || 'general'
                      },
                      actions: [
                        { 
                          action: 'reply', 
                          title: 'Répondre', 
                          type: 'text', 
                          placeholder: 'Écrivez votre réponse...' 
                        }
                      ]
                    } as any);
                  });
                }
              }
            }
          }
        }

        setMessages(filteredMessages.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
            const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
            return dateA - dateB;
          }));
    });

    return () => unsubscribe();
  }, [groupId, user?.uid, appState, messageLimit, clearedAtTime]);

  // Gestion du scroll intelligent
  useEffect(() => {
    if (!scrollRef.current) return;

    const scrollContainer = scrollRef.current;
    
    if (isInitialLoad && messages.length > 0) {
      // Premier chargement: scroll tout en bas
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      setIsInitialLoad(false);
      prevScrollHeightRef.current = scrollContainer.scrollHeight;
      return;
    }

    // Si on a chargé plus de messages (pagination)
    if (isLoadingMore) {
      const scrollDiff = scrollContainer.scrollHeight - prevScrollHeightRef.current;
      scrollContainer.scrollTop = scrollDiff;
      setIsLoadingMore(false);
    } else {
      // Nouveau message reçu ou envoyé: scroll en bas si on était déjà proche du bas
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 150;
      if (isNearBottom) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
    
    prevScrollHeightRef.current = scrollContainer.scrollHeight;
  }, [messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    
    // Si on arrive en haut et qu'il y a plus de messages
    if (target.scrollTop === 0 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      prevScrollHeightRef.current = target.scrollHeight;
      setMessageLimit(prev => prev + 30);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingImage && !pendingVideo) || !user) return;

    // Arrêter l'indicateur de saisie
    setTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const startTime = performance.now();
    const textToSend = newMessage;
    const imageToSend = pendingImage;
    const videoToSend = pendingVideo;

    // --- LOGIQUE COMMANDE /myia ---
    // La commande ne fonctionne que dans les groupes publics (pas dans le tchat privé My IA)
    const isAiGroup = groupId?.startsWith('ai-');
    const isAiCommand = !isAiGroup && textToSend.trim().startsWith('/myia');
    const aiPrompt = isAiCommand ? textToSend.trim().substring(5).trim() : null;
    // ------------------------------

    // --- OPTIMISTIC UI : Affichage instantané (0ms) ---
    const optimisticMsg: Message = {
      text: textToSend,
      uid: user.uid,
      displayName: user.displayName || 'Utilisateur',
      createdAt: { toDate: () => new Date() },
      id: 'opt-' + Date.now(),
      readBy: { [user.uid]: user.displayName || 'Utilisateur' },
      groupId: groupId,
      imageUrl: imageToSend || undefined,
      videoUrl: videoToSend || undefined
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage(''); 
    setPendingImage(null);
    setPendingVideo(null);
    // --------------------------------------------------

    // --- LOGIQUE MY IA ---
    if (isAiGroup || isAiCommand) {
      try {
        const finalPrompt = isAiCommand ? aiPrompt : textToSend;
        if (!finalPrompt && !imageToSend) return;

        // 1. Sauvegarder d'abord le message de l'utilisateur dans Firestore
        await sendDirectMessage(textToSend, imageToSend || undefined, videoToSend || undefined);

        // 2. Appeler l'API Mistral pour obtenir la réponse
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: finalPrompt,
            imageUrl: imageToSend || undefined 
          }),
        });
        
        const data = await response.json();
        
        if (data.response) {
          // 3. Ajouter la réponse de l'IA à Firestore
          await addDoc(collection(db, 'messages'), {
            text: data.response,
            uid: 'ai-bot',
            targetUid: user.uid,
            displayName: 'My IA',
            groupId: groupId,
            createdAt: serverTimestamp(),
            readBy: { [user.uid]: user.displayName || 'Utilisateur' }
          });

          // Mettre à jour le chat privé si nécessaire
          if (groupId?.startsWith('private_')) {
            const chatRef = doc(db, 'private_chats', groupId);
            await setDoc(chatRef, {
              updatedAt: serverTimestamp(),
              lastMessage: data.response,
              deletedBy: []
            }, { merge: true });
          }

          if (isCustomGroup && groupId) {
            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, {
              updatedAt: serverTimestamp(),
              lastMessage: `My IA: ${data.response}`,
              deletedBy: []
            }).catch(() => {});
          }
        }
      } catch (error) {
        console.error('Erreur My IA:', error);
      }
    } else {
      // On utilise la fonction commune pour l'envoi réel
      await sendDirectMessage(textToSend, imageToSend || undefined, videoToSend || undefined);
    }

    const cloudEndTime = performance.now();
    const cloudLat = (cloudEndTime - startTime).toFixed(3);
    console.log(
      `%c[MESSAGERIE 2.0] 🚀 Message envoyé\n` +
      `%c• Latence: ${cloudLat}ms\n` +
      `%c• Statut: Confirmé`,
      'color: #00a884; font-weight: bold; font-size: 11px;', 'color: #666;', 'color: #4caf50;'
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Gérer l'indicateur de saisie
    if (!user || groupId === 'snapchat') return;
    setTyping(true, groupId || 'general');
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false, groupId || 'general');
    }, 3000);
  };

  const typingUsers = groupId === 'snapchat' ? [] : onlineUsers.filter(u => u.uid !== user?.uid && u.isTyping && u.typingIn === (groupId || 'general'));

  const handleHeaderClick = () => {
    if (groupId?.startsWith('private_') || groupId?.startsWith('ai-') || groupId === 'general' || groupId === 'snapchat' || isCustomGroup) {
      setShowOtherUserProfile(true);
    }
  };

  // Données d'affichage dynamiques
  const displayAvatar = isCustomGroup ? customGroupData?.photoURL || groupAvatar : otherUserRealtimeData?.photoURL ?? groupAvatar;
  const displayName = isCustomGroup ? customGroupData?.name || groupName : otherUserRealtimeData?.displayName ?? groupName;

  return (
    <div className="flex flex-col h-full w-full bg-[#efeae2] overflow-hidden relative">
      {viewingOtherUserStatus && otherUserStatus && (
        <div className="absolute inset-0 z-[100]">
          <StatusViewer 
            userStatus={otherUserStatus} 
            currentUserId={user?.uid || ''} 
            onClose={() => setViewingOtherUserStatus(false)} 
          />
        </div>
      )}

      {/* Profil de l'autre utilisateur (Modal) */}
      {showOtherUserProfile && (groupId?.startsWith('private_') || groupId?.startsWith('ai-') || groupId === 'general' || groupId === 'snapchat' || isCustomGroup) && (
        <div className="absolute inset-0 z-50 bg-[#efeae2] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="bg-[#f9f9f9] p-3 flex items-center border-b border-gray-300">
            <button 
              onClick={() => setShowOtherUserProfile(false)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-[16px] font-normal text-gray-800 ml-2">
              {(groupId === 'general' || isCustomGroup) ? 'Infos du groupe' : 'Profil du contact'}
            </h1>
          </div>
          
          <div className="flex-1 overflow-y-auto w-full">
            <div className="flex flex-col items-center pt-10 px-4 bg-white m-4 md:m-8 rounded-2xl shadow-sm pb-8 w-auto relative">
              
              {showAddMembersModal && isCustomGroup && groupId && (
                <AddMembersModal 
                  groupId={groupId}
                  currentMembers={customGroupData?.members || []}
                  onClose={() => setShowAddMembersModal(false)}
                />
              )}

              <div className="relative mb-4">
                <div 
                  className="w-40 h-40 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm"
                  onClick={() => {
                    if (displayAvatar && !groupId?.startsWith('ai-') && groupId !== 'general' && groupId !== 'snapchat') {
                      window.open(displayAvatar, '_blank');
                    }
                  }}
                  style={{ cursor: (displayAvatar && !groupId?.startsWith('ai-') && groupId !== 'general' && groupId !== 'snapchat') ? 'pointer' : 'default' }}
                  title={(displayAvatar && !groupId?.startsWith('ai-') && groupId !== 'general' && groupId !== 'snapchat') ? "Ouvrir l'image de profil" : ""}
                >
                  {groupId === 'general' ? (
                    <span className="material-symbols-outlined text-[80px] text-gray-400">group</span>
                  ) : groupId?.startsWith('ai-') ? (
                    <div className="w-full h-full bg-white flex items-center justify-center p-6">
                      <img src="https://www.google.com/s2/favicons?domain=mistral.ai&sz=128" alt="Mistral IA" className="w-full h-full object-contain" />
                    </div>
                  ) : groupId === 'snapchat' ? (
                    <img src="/Logo.png" alt="Team Messagerie" className="w-full h-full object-cover" />
                  ) : displayAvatar ? (
                    <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover hover:scale-[1.02] transition-transform" />
                  ) : isCustomGroup ? (
                    <span className="material-symbols-outlined text-[80px] text-gray-400">group</span>
                  ) : (
                    <span className="material-symbols-outlined text-[80px] text-gray-400">person</span>
                  )}
                </div>
                {isCustomGroup && (
                  <label className="absolute bottom-1 right-1 w-10 h-10 bg-[#00a884] rounded-full border-[3px] border-white flex items-center justify-center cursor-pointer shadow-md hover:bg-[#008f6a] transition-colors">
                    <span className="material-symbols-outlined text-white text-[20px]">edit</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleGroupImageUpdate}
                    />
                  </label>
                )}
              </div>
              
              {isEditingGroupName ? (
                <div className="flex flex-col items-center w-full max-w-[280px] mb-6">
                  <div className="flex items-center w-full gap-2 mb-3">
                    <input 
                      type="text" 
                      value={editedGroupName}
                      onChange={(e) => setEditedGroupName(e.target.value)}
                      className="flex-1 text-center text-xl font-medium text-gray-800 border-b-2 border-[#00a884] focus:outline-none bg-transparent py-1"
                      autoFocus
                    />
                    <button 
                      onClick={() => setIsEditingGroupName(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full bg-gray-50 hover:bg-gray-100"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <button 
                    onClick={saveGroupName}
                    disabled={!editedGroupName.trim()}
                    className="w-full py-2 bg-[#00a884] text-white rounded-xl font-medium hover:bg-[#008f6a] transition-colors shadow-sm disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </div>
              ) : (
                <h2 className="text-2xl font-normal text-gray-800 mb-1 flex items-center gap-1.5 justify-center w-full">
                  {groupId === 'general' ? 'Groupe Général' : groupId === 'snapchat' ? 'Team Messagerie' : displayName}
                  {(groupId === 'general' || groupId === 'snapchat') && (
                    <span className="material-symbols-outlined text-[20px] text-[#00a884]">verified</span>
                  )}
                  {isCustomGroup && (
                    <button 
                      onClick={() => {
                        setEditedGroupName(displayName);
                        setIsEditingGroupName(true);
                      }}
                      className="ml-1 text-gray-400 hover:text-[#00a884] transition-colors p-1 rounded-full hover:bg-gray-50"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                  )}
                </h2>
              )}
              
              {!isEditingGroupName && (
                <p className="text-[15px] text-gray-500 mb-6 text-center">
                  {groupId === 'general' 
                    ? "Voici le groupe officiel de Messagerie." 
                    : groupId === 'snapchat'
                      ? "Le canal d'actualité officiel de Messagerie."
                      : isCustomGroup
                        ? `Créé le ${customGroupData?.createdAt?.toDate?.().toLocaleDateString('fr-FR')} par ${allGroupUsers.find(u => u.id === customGroupData?.createdBy)?.displayName || 'Un utilisateur'}`
                        : groupId?.startsWith('ai-') 
                          ? "Intelligence Artificielle" 
                          : "Utilisateur de Messagerie"}
                </p>
              )}

              <div className="flex gap-4 w-full max-w-[320px] justify-center flex-wrap">
                <button 
                  onClick={() => setShowOtherUserProfile(false)}
                  className="flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-[#f9f9f9] hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <span className="material-symbols-outlined text-[#00a884]">chat</span>
                  <span className="text-[13px] text-gray-700 font-medium">Message</span>
                </button>
                {(!groupId?.startsWith('ai-') && groupId !== 'snapchat') && (
                  <>
                    <button 
                        onClick={() => handleStartCall('audio')}
                        className="flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-[#f9f9f9] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[#00a884]">call</span>
                        <span className="text-[13px] text-gray-700 font-medium">Appeler</span>
                      </button>
                      <button 
                        onClick={() => handleStartCall('video')}
                        className="flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-[#f9f9f9] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[#00a884]">videocam</span>
                        <span className="text-[13px] text-gray-700 font-medium">Vidéo</span>
                      </button>
                    {!isCustomGroup && groupId !== 'general' && (
                      <button 
                        onClick={() => {
                          if (otherUserStatus) {
                            setViewingOtherUserStatus(true);
                          }
                        }}
                        className={`flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-[#f9f9f9] hover:bg-gray-100 rounded-xl transition-colors ${otherUserStatus ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                      >
                        <span className={`material-symbols-outlined ${otherUserStatus ? 'text-[#00a884]' : 'text-gray-400'}`}>radio_button_checked</span>
                        <span className="text-[13px] text-gray-700 font-medium">Statut</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {groupId?.startsWith('ai-') && (
                <div className="w-full max-w-[320px] mt-8 flex items-start gap-3 justify-center">
                  <span className="material-symbols-outlined text-gray-500 text-[24px] flex-shrink-0 mt-0.5">info</span>
                  <p className="text-[14px] text-gray-600 leading-relaxed text-left font-medium">
                    Les réponses sont générées par l'IA. Certaines peuvent être inappropriées, notamment pour des ados.
                  </p>
                </div>
              )}

              {groupId === 'snapchat' && (
                <div className="w-full max-w-[320px] mt-8 flex items-start gap-3 justify-center">
                  <span className="material-symbols-outlined text-gray-500 text-[24px] flex-shrink-0 mt-0.5">info</span>
                  <p className="text-[14px] text-gray-600 leading-relaxed text-left font-medium">
                    Les messages publiés dans ce fil d'actualité vous sont envoyés exclusivement par l'équipe Messagerie pour vous tenir informé.
                  </p>
                </div>
              )}

              {(groupId === 'general' || isCustomGroup) && (
                <div className="w-full mt-8 border-t border-gray-100 pt-6">
                  <h3 className="text-[15px] font-medium text-gray-800 mb-4 px-2">Membres du groupe ({allGroupUsers.length})</h3>
                  <div className="flex flex-col gap-2">
                    {allGroupUsers.map(u => {
                      const memberName = u.displayName || u.nickname;
                      const isGroupCreator = isCustomGroup && customGroupData?.createdBy === u.id;
                      const isGroupAdmin = isGroupCreator || (isCustomGroup && customGroupData?.admins?.includes(u.id));
                      const amICreator = isCustomGroup && customGroupData?.createdBy === user?.uid;
                      const amIAdmin = amICreator || (isCustomGroup && customGroupData?.admins?.includes(user?.uid));
                      
                      return (
                      <div 
                        key={u.id} 
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
                        onClick={() => {
                          if (onStartPrivateChat && u.id !== user?.uid) {
                            setShowOtherUserProfile(false);
                            onStartPrivateChat(u);
                          }
                        }}
                      >
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.nickname} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-gray-400">person</span>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[15px] text-gray-800 font-medium truncate">
                            {memberName}
                            {isGroupCreator ? (
                              <span className="ml-2 text-[10px] bg-[#00a884]/10 text-[#00a884] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide align-middle">Créateur</span>
                            ) : isGroupAdmin ? (
                              <span className="ml-2 text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide align-middle">Admin</span>
                            ) : null}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {u.id !== user?.uid && (
                            <span className="material-symbols-outlined text-[#00a884] text-[20px] p-1.5 rounded-full hover:bg-[#00a884]/10 transition-colors" title="Envoyer un message">chat</span>
                          )}
                          {isCustomGroup && amICreator && u.id !== user?.uid && (
                            <button 
                              onClick={(e) => handleToggleAdmin(e, u.id, isGroupAdmin)}
                              className="material-symbols-outlined text-blue-500 text-[20px] p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                              title={isGroupAdmin ? "Révoquer admin" : "Nommer admin"}
                            >
                              {isGroupAdmin ? 'remove_moderator' : 'add_moderator'}
                            </button>
                          )}
                          {isCustomGroup && amIAdmin && u.id !== user?.uid && !isGroupCreator && (
                            <button 
                              onClick={(e) => handleRemoveMember(e, u.id, memberName)}
                              className="material-symbols-outlined text-red-500 text-[20px] p-1.5 rounded-full hover:bg-red-50 transition-colors"
                              title="Retirer du groupe"
                            >
                              person_remove
                            </button>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              )}

              {isCustomGroup && (
                <div className="w-full mt-4 flex flex-col gap-2 border-t border-gray-100 pt-6">
                  <button 
                    onClick={() => setShowAddMembersModal(true)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-[#00a884] font-medium"
                  >
                    <span className="material-symbols-outlined">person_add</span>
                    Ajouter des membres
                  </button>
                  <button 
                    onClick={handleLeaveGroup}
                    className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl transition-colors text-red-500 font-medium"
                  >
                    <span className="material-symbols-outlined">logout</span>
                    Quitter le groupe
                  </button>
                  {customGroupData?.createdBy === user?.uid && (
                    <button 
                      onClick={handleDeleteGroup}
                      className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl transition-colors text-red-600 font-medium"
                    >
                      <span className="material-symbols-outlined">delete_forever</span>
                      Supprimer le groupe pour tous
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Header */}
      <header className="bg-[#f9f9f9] p-3 flex justify-between items-center border-b border-gray-300 z-10 w-full overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <button 
              onClick={onBack}
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full transition-all flex-shrink-0"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div 
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-all border border-gray-200 overflow-hidden flex-shrink-0"
            onClick={handleHeaderClick}
          >
            {groupId === 'general' ? (
              <span className="material-symbols-outlined text-[24px] text-gray-500">group</span>
            ) : groupId?.startsWith('ai-') ? (
              <div className="w-full h-full bg-white flex items-center justify-center p-2">
                <img 
                  src="https://www.google.com/s2/favicons?domain=mistral.ai&sz=128" 
                  alt="Mistral IA" 
                  className="w-full h-full object-contain"
                />
              </div>
            ) : groupId === 'snapchat' ? (
              <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain p-1.5" />
            ) : isCustomGroup ? (
              displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[24px] text-gray-500">group</span>
              )
            ) : groupId?.startsWith('private_') ? (
              displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[24px] text-gray-500">person</span>
              )
            ) : (
              <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain p-1.5" />
            )}
          </div>
          <div 
            className="min-w-0 flex-1 cursor-pointer"
            onClick={handleHeaderClick}
          >
            <h1 className="text-[16px] font-normal text-gray-800 leading-tight truncate pr-2 hover:underline">
              {displayName}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-1 relative">
            {(!groupId?.startsWith('ai-') && groupId !== 'snapchat') && (
              <>
                <button 
                  onClick={() => handleStartCall('video')}
                  className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-all flex items-center justify-center"
                  title="Appel vidéo"
                >
                  <span className="material-symbols-outlined text-[24px]">videocam</span>
                </button>
                <button 
                  onClick={() => handleStartCall('audio')}
                  className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-all flex items-center justify-center mr-1"
                  title="Appel vocal"
                >
                  <span className="material-symbols-outlined text-[24px]">call</span>
                </button>
              </>
            )}
            <div ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-all flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[24px]">more_vert</span>
              </button>

              {isMenuOpen && (
                   <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 overflow-hidden">
                     <button 
                       className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center gap-2.5"
                       onClick={() => {
                         if (onBack) onBack();
                         if (onNavigate) onNavigate('profil');
                       }}
                     >
                       <span className="material-symbols-outlined text-[20px]">settings</span>
                       Réglages
                     </button>
                     <button 
                       onClick={() => {
                         setShowCreateGroupModal(true);
                         setIsMenuOpen(false);
                       }}
                       className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center gap-2.5"
                     >
                       <span className="material-symbols-outlined text-[20px]">group_add</span>
                       Créer un groupe
                     </button>
                     <button 
                       className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center gap-2.5"
                       onClick={() => {
                         if (onBack) onBack();
                         if (onNavigate) onNavigate('commu');
                       }}
                     >
                       <span className="material-symbols-outlined text-[20px]">add_comment</span>
                       Nouvelle discussion
                     </button>
                   </div>
                 )}
            </div>
          </div>
        </div>
      </header>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal 
          user={user}
          onClose={() => setShowCreateGroupModal(false)}
          onGroupCreated={(newGroupId, data) => {
            setShowCreateGroupModal(false);
            if (onStartPrivateChat) {
              // Hacky way to switch to the new group by simulating onStartPrivateChat
              // Or we can just refresh the page or let the user find it. 
              // Wait, onStartPrivateChat expects a user object.
              // Chat.tsx doesn't have onSelectGroup. It's better if we just close it, and the user can see it in HomeView.
              // Actually, since we don't have a direct way to switch chat from Chat.tsx, we can just close the modal.
            }
          }}
        />
      )}

      {/* Messages Area - Full Width */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-2 relative bg-white"
      >
        <div className="relative z-10 space-y-1">
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="animate-spin text-[#00a884]" size={24} />
            </div>
          )}
          {messages.map((msg, index) => {
            const isMe = msg.uid === user?.uid;
            
            // Fonction pour générer une couleur unique basée sur l'UID de l'utilisateur
            const getUserColor = (uid: string) => {
              if (!uid) return '#ff004a'; // Couleur par défaut (Snap Rouge)
              
              // My IA (Mistral) est toujours en Rouge Snap par défaut
              if (uid === 'mistral-ai' || uid.startsWith('ai-')) return '#ff004a';

              const colors = [
                '#ff004a', // Rouge Snap
                '#9b51e0', // Violet
                '#f2994a', // Orange
                '#219653', // Vert
                '#eb5757', // Corail
                '#ee00ff', // Rose bonbon
                '#00d1ff', // Cyan (différent du bleu utilisateur)
                '#7f8c8d', // Gris ardoise
                '#2c3e50', // Bleu nuit (très sombre)
              ];
              // Utiliser la somme des codes de caractères pour choisir une couleur
              let hash = 0;
              for (let i = 0; i < uid.length; i++) {
                hash = uid.charCodeAt(i) + ((hash << 5) - hash);
              }
              return colors[Math.abs(hash) % colors.length];
            };

            // Style Snapchat: Bleu pour l'utilisateur actuel, Couleur unique pour les autres dans le groupe général
            const accentColor = isMe 
              ? '#00baff' 
              : (groupId === 'general' ? getUserColor(msg.uid) : '#ff004a');

            return (
              <div 
                key={msg.id}
                className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-1 duration-300 mb-4"
              >
                <div 
                  className="relative max-w-[95%] md:max-w-[85%] bg-transparent flex"
                >
                  {/* Barre latérale colorée style Snap */}
                  <div 
                    className="w-[1.5px] flex-shrink-0 rounded-full" 
                    style={{ backgroundColor: accentColor }}
                  ></div>
                  
                  <div className="px-3 py-1 flex flex-col w-full">
                    {/* Header: NOM en majuscules style Snap */}
                    <p 
                      onClick={() => {
                        if (!isMe && onStartPrivateChat && msg.uid !== 'ai-bot' && !msg.uid?.startsWith('ai-')) {
                          onStartPrivateChat({
                            uid: msg.uid,
                            displayName: msg.displayName,
                          });
                        }
                      }}
                      className={`text-[11px] font-normal uppercase tracking-tighter mb-0.5 flex items-center gap-1 ${!isMe && msg.uid !== 'ai-bot' && !msg.uid?.startsWith('ai-') ? 'cursor-pointer hover:underline' : ''}`}
                      style={{ color: accentColor }}
                    >
                      {isMe ? 'MOI' : msg.displayName}
                      {!isMe && (msg.uid === 'mistral-ai' || msg.uid?.startsWith('ai-')) && !groupId?.startsWith('ai-') && (
                        <span className="material-symbols-outlined text-[7px] font-black scale-75 opacity-90">verified</span>
                      )}
                    </p>
                    
                    <div className="flex flex-col">
                      {msg.imageUrl && (
                        <div className="mb-2 mt-1 rounded-lg overflow-hidden border border-gray-100 shadow-sm max-w-[280px]">
                          <img 
                            src={msg.imageUrl} 
                            alt="Image partagée" 
                            className="w-full h-auto object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                            onClick={() => window.open(msg.imageUrl, '_blank')}
                          />
                        </div>
                      )}
                      {msg.videoUrl && (
                        <div className="mb-2 mt-1 rounded-lg overflow-hidden border border-gray-100 shadow-sm max-w-[280px] bg-black">
                          <video 
                            src={`${msg.videoUrl}#t=1`} 
                            controls
                            preload="metadata"
                            className="w-full h-auto max-h-[400px]"
                          />
                        </div>
                      )}
                      <div className="text-[16px] text-[#111b21] font-normal leading-relaxed break-words markdown-content">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({children}) => {
                              // Si le message commence par /myia ET qu'on n'est pas dans le tchat privé IA, on colore
                              const isPrivateAiGroup = msg.groupId?.startsWith('ai-');
                              if (!isPrivateAiGroup && typeof children === 'string' && children.startsWith('/myia')) {
                                const parts = children.split(/(\/myia)/);
                                return (
                                  <p className="mb-3 last:mb-0">
                                    {parts.map((part, i) => 
                                      part === '/myia' 
                                        ? <span key={i} className="text-blue-500 font-bold">/myia</span>
                                        : part
                                    )}
                                  </p>
                                );
                              }
                              return <p className="mb-3 last:mb-0">{children}</p>;
                            },
                            code: CodeBlock,
                            table: ({children}) => (
                              <div className="overflow-x-auto my-4 rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">{children}</table>
                              </div>
                            ),
                            thead: ({children}) => <thead className="bg-gray-50">{children}</thead>,
                            th: ({children}) => <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{children}</th>,
                            td: ({children}) => <td className="px-4 py-2 text-sm text-gray-600 border-t border-gray-100">{children}</td>,
                            ul: ({children}) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>,
                            li: ({children}) => <li className="mb-1">{children}</li>,
                            strong: ({children}) => <strong className="font-bold text-black">{children}</strong>,
                            a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">{children}</a>,
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Link Previews */}
                      {(() => {
                        const urlRegex = /(https?:\/\/[^\s]+)/g;
                        const match = msg.text.match(urlRegex);
                        if (match) {
                          return <LinkPreviewCard url={match[0]} />;
                        }
                        return null;
                      })()}
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {typingUsers.length > 0 && (
            <div className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ml-2 mb-4">
              <div className="bg-white px-3 py-1.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce"></span>
                </div>
                <span className="text-[12px] text-gray-500 italic">
                  {typingUsers.map(u => u.displayName || 'Quelqu\'un').join(', ')} {typingUsers.length > 1 ? 'écrivent' : 'écrit'}...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Input Area */}
      <footer 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`px-2 py-3 md:p-3 flex flex-col z-10 border-t transition-colors overflow-hidden ${
          isDragging ? 'bg-blue-50 border-blue-300' : 'bg-[#f7f8f9] border-gray-200'
        }`}
      >
        {(pendingImage || pendingVideo) && (
          <div className="mb-2 relative inline-block self-start ml-10 md:ml-12">
            <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-[#00a884] shadow-sm bg-black flex items-center justify-center">
              {pendingImage ? (
                <img src={pendingImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <video 
                  src={`${pendingVideo!}#t=1`} 
                  preload="metadata"
                  className="w-full h-full object-cover" 
                />
              )}
            </div>
            <button 
              onClick={() => {
                setPendingImage(null);
                setPendingVideo(null);
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-center w-full max-w-[1200px] mx-auto">
          <input 
            type="file" 
            accept="image/*,video/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          
          {/* Bouton Caméra circulaire */}
          <label 
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-sm hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            <input 
              type="file" 
              accept="image/*,video/*" 
              className="hidden" 
              onChange={handleImageUpload}
            />
            {isUploading ? (
              <Loader2 size={20} className="animate-spin text-gray-400" />
            ) : (
              <Camera size={20} className="text-gray-800" />
            )}
          </label>
          
          {/* Barre d'input capsule */}
          <div className="flex-1 min-w-0 relative">
            <form onSubmit={sendMessage} className="relative flex items-center">
              <div className="w-full relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  placeholder="Envoyer votre message"
                  className={`w-full pl-4 md:pl-5 pr-4 md:pr-12 py-2.5 rounded-full bg-white border border-gray-100 focus:ring-1 focus:ring-gray-100 focus:border-gray-200 text-[15px] placeholder-gray-400 shadow-sm transition-colors ${
                    !groupId?.startsWith('ai-') && newMessage.trim().startsWith('/myia') ? 'text-blue-500' : 'text-[#111b21]'
                  }`}
                />
                {/* Overlay pour colorer uniquement le /myia pendant la saisie */}
                {!groupId?.startsWith('ai-') && newMessage.startsWith('/myia') && (
                  <div className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 pointer-events-none text-[15px]">
                    <span className="text-blue-500">/myia</span>
                    <span className="text-transparent">{newMessage.substring(5)}</span>
                  </div>
                )}
              </div>
              {!newMessage && (
                <span className="absolute right-5 text-[12px] text-gray-400 pointer-events-none hidden lg:block whitespace-nowrap transition-opacity duration-200">
                  Glissez-déposez pour l'importateur.
                </span>
              )}
            </form>
          </div>
          
          {/* Bouton Micro ou Send */}
          {newMessage.trim() || pendingImage || pendingVideo ? (
            <button 
              onClick={sendMessage}
              className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-sm hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[24px] text-[#00baff] font-bold">arrow_upward</span>
            </button>
          ) : (
            <button 
              className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-sm hover:bg-gray-50 transition-all flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[24px] text-[#00baff]">mic</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
