'use client';

import { auth, db } from '@/lib/firebase';
import { 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  linkWithCredential,
  EmailAuthProvider,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp, updateDoc, arrayRemove } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Chat from '@/components/Chat';
import HomeView from '@/components/HomeView';
import CallHandler from '@/components/CallHandler';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [user, loading, error] = useAuthState(auth);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedChatData, setSelectedChatData] = useState<{ name: string, avatar?: string } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleStartPrivateChat = async (otherUser: any) => {
    if (!user) return;
    const uid1 = user.uid;
    const uid2 = otherUser.id || otherUser.uid;
    if (uid1 === uid2) return; // Ne pas s'envoyer de message à soi-même
    
    let finalPhotoURL = otherUser.photoURL || '';
    let finalName = otherUser.displayName || otherUser.nickname || 'Anonyme';
    const chatId = `private_${[uid1, uid2].sort().join('_')}`;

    // Switch to this chat immediately (Optimistic UI)
    localStorage.setItem(`last_open_${chatId}`, Date.now().toString());
    setSelectedChat(chatId);
    setSelectedChatData({
      name: finalName,
      avatar: finalPhotoURL
    });

    // Si on n'a pas la photo (ex: depuis le groupe général), on essaie de la récupérer en arrière-plan
    if (!finalPhotoURL) {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid2));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.photoURL) finalPhotoURL = data.photoURL;
          if (data.displayName || data.nickname) finalName = data.displayName || data.nickname;
          
          // Mettre à jour avec les bonnes infos
          setSelectedChatData({
            name: finalName,
            avatar: finalPhotoURL
          });
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du profil:", err);
      }
    }
    
    // Créer la conversation dans Firestore pour qu'elle apparaisse dans la liste
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

  // Gestion du bouton retour physique/geste (Mobile & PWA)
  useEffect(() => {
    if (selectedChat) {
      // On ajoute une entrée dans l'historique quand un chat est ouvert
      window.history.pushState({ chatOpen: true }, "");
    }
  }, [selectedChat]);

  useEffect(() => {
    const handlePopState = () => {
      if (selectedChat) {
        // Si l'utilisateur fait "retour" alors qu'un chat est ouvert, on ferme juste le chat
        setSelectedChat(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedChat]);

  // Activer la persistance locale par défaut
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
  }, []);

  // Écouter les réponses depuis les notifications système (Web)
  useEffect(() => {
    if (!user) return;

    const handleSWMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'REPLY_NOTIFICATION') {
        const { text, groupId } = event.data;
        if (text && text.trim() && groupId) {
          try {
            await addDoc(collection(db, 'messages'), {
              text: text,
              uid: user.uid,
              displayName: user.displayName || 'Utilisateur',
              groupId: groupId,
              createdAt: serverTimestamp(),
              readBy: { [user.uid]: user.displayName || 'Utilisateur' }
            });
            console.log(`[GLOBAL REPLY] Message envoyé au groupe ${groupId}`);
          } catch (err) {
            console.error("[GLOBAL REPLY] Erreur envoi réponse notification:", err);
          }
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    }
  }, [user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (nickname) {
          await updateProfile(userCredential.user, { displayName: nickname });
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            nickname,
            email,
            createdAt: new Date()
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const loginAnonymously = async () => {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Erreur de connexion anonyme:", err);
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white p-6 relative overflow-hidden">
        <div className="max-w-[380px] w-full z-10 flex flex-col items-center">
          <div className="text-center mb-12">
            <img src="/Logo.png" alt="Logo" className="w-14 h-14 object-contain mx-auto mb-6" />
            <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight">Messagerie</h1>
            <p className="text-gray-500 text-[15px] mt-3">
              {isRegistering ? "Créez votre compte pour commencer" : "Connectez-vous pour continuer"}
            </p>
          </div>
          
          <form onSubmit={handleEmailAuth} className="space-y-4 w-full">
            {isRegistering && (
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-4 text-gray-400 text-[20px]">person</span>
                <input
                  type="text"
                  placeholder="Votre prénom"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#f7f7f9] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#00a884] focus:shadow-sm outline-none text-[15px] transition-all placeholder-gray-400"
                  required
                />
              </div>
            )}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-4 text-gray-400 text-[20px]">mail</span>
              <input
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#f7f7f9] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#00a884] focus:shadow-sm outline-none text-[15px] transition-all placeholder-gray-400"
                required
              />
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-4 text-gray-400 text-[20px]">lock</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-[#f7f7f9] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#00a884] focus:shadow-sm outline-none text-[15px] transition-all placeholder-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            {authError && <p className="text-[13px] text-red-500 mt-2 text-center font-medium">{authError}</p>}

            <button 
              type="submit"
              className="w-full bg-[#00a884] text-white py-4 rounded-2xl font-semibold text-[16px] hover:bg-[#008f6f] active:scale-[0.98] transition-all mt-4"
            >
              {isRegistering ? "Créer un compte" : "Se connecter"}
            </button>
          </form>

          <div className="mt-8 text-center space-y-6 w-full">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[14px] text-gray-500 hover:text-gray-900 font-medium transition-all"
            >
              {isRegistering ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
            </button>
            
            <div className="flex items-center justify-center gap-4">
              <div className="h-px bg-gray-100 w-12"></div>
              <span className="text-gray-300 text-[12px] uppercase tracking-wider">ou</span>
              <div className="h-px bg-gray-100 w-12"></div>
            </div>

            <button 
              onClick={loginAnonymously}
              className="text-[14px] text-gray-500 hover:text-gray-900 font-medium transition-colors"
            >
              Continuer en tant qu'invité
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      <CallHandler user={user} />
      {/* Sidebar Desktop / Liste Mobile */}
      <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] md:min-w-[380px] border-r border-gray-300 flex-col`}>
        <HomeView 
          user={user}
          onSelectGroup={(id, data) => {
            setSelectedChat(id);
            setSelectedChatData(data || null);
          }} 
          selectedGroupId={selectedChat}
          onTabChange={(tabId) => {
            if (tabId !== 'discussion') {
              setSelectedChat(null);
              setSelectedChatData(null);
            }
          }}
        />
      </div>

      {/* Zone Chat */}
      <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col relative bg-[#efeae2]`}>
        {selectedChat ? (
          <Chat 
            groupId={selectedChat}
            groupName={
              selectedChatData?.name || (
                selectedChat === 'snapchat' 
                  ? 'Team Messagerie' 
                  : selectedChat?.startsWith('ai-') 
                    ? 'My IA propulsé par Mistral IA' 
                    : 'Groupe Général'
              )
            }
            groupAvatar={selectedChatData?.avatar}
            onBack={() => {
              setSelectedChat(null);
              setSelectedChatData(null);
              if (window.history.state?.chatOpen) {
                window.history.back();
              }
            }}
            onStartPrivateChat={handleStartPrivateChat}
            onNavigate={(tabId) => {
              // Simuler un clic sur l'onglet correspondant
              const evt = new CustomEvent('app_navigate', { detail: { tabId } });
              window.dispatchEvent(evt);
            }}
          />
        ) : (
          <div className="hidden md:flex h-full items-center justify-center bg-[#f9f9f9]">
            <div className="flex justify-center gap-8 md:gap-12 max-w-[600px] w-full mt-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-11 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-all cursor-pointer shadow-sm">
                  <span className="material-symbols-outlined text-[22px] text-gray-800">description</span>
                </div>
                <span className="text-[13px] font-medium text-gray-700">Envoyer un document</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-11 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-all cursor-pointer shadow-sm">
                  <span className="material-symbols-outlined text-[22px] text-gray-800">person_search</span>
                </div>
                <span className="text-[13px] font-medium text-gray-700">Rechercher un contact</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-11 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-all cursor-pointer shadow-sm">
                  <span className="material-symbols-outlined text-[22px] text-gray-800">emoji_emotions</span>
                </div>
                <span className="text-[13px] font-medium text-gray-700">Créer un bitmoji</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
