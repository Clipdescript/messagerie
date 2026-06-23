'use client';

import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { updateProfile, EmailAuthProvider, linkWithCredential, signOut } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, LogOut } from 'lucide-react';

export default function ProfileView() {
  const [user] = useAuthState(auth);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  
  const [nickname, setNickname] = useState(user?.displayName || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const profileInputRef = useRef<HTMLInputElement>(null);

  const [activeSubView, setActiveSubView] = useState<'main' | 'account'>('main');

  const isLinkingAccount = user?.isAnonymous || false;

  const hasChanges = isLinkingAccount 
    ? (nickname !== (user?.displayName || '') || email.trim() !== '' || password.trim() !== '')
    : (nickname !== (user?.displayName || ''));

  useEffect(() => {
    if (!user) return;
    
    // Listen to real-time profile changes from Firestore
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserData(docSnap.data());
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (currentUserData) {
      setNickname(currentUserData.displayName || currentUserData.nickname || user?.displayName || '');
    } else if (user) {
      setNickname(user.displayName || '');
    }
  }, [user, currentUserData]);

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploadingProfile(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.uid}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Mettre à jour le profil Firebase
      await updateProfile(user, { photoURL: publicUrl });
      
      // Mettre à jour Firestore
      await setDoc(doc(db, 'users', user.uid), {
        photoURL: publicUrl,
        updatedAt: new Date()
      }, { merge: true });

    } catch (error: any) {
      console.error('Erreur upload profil:', error.message);
      alert('Erreur lors de la mise à jour de la photo');
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !user) return;
    setAuthError('');
    setIsSuccess(false);
    setIsSaving(true);

    try {
      // 1. Mise à jour du pseudo dans Auth et Users (pour les listes et temps réel)
      await updateProfile(user, { displayName: nickname });
      await setDoc(doc(db, 'users', user.uid), {
        nickname,
        displayName: nickname,
        updatedAt: new Date()
      }, { merge: true });

      // 1.5 Mise à jour de tous les anciens messages pour répercuter le changement partout
      try {
        const q = query(collection(db, 'messages'), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const batches = [];
        let currentBatch = writeBatch(db);
        let operationCounter = 0;

        querySnapshot.forEach((docSnap) => {
          currentBatch.update(docSnap.ref, { displayName: nickname });
          operationCounter++;

          // Firestore permet max 500 opérations par batch
          if (operationCounter === 500) {
            batches.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            operationCounter = 0;
          }
        });

        if (operationCounter > 0) {
          batches.push(currentBatch.commit());
        }

        await Promise.all(batches);
      } catch (err) {
        console.error("Erreur lors de la mise à jour des anciens messages:", err);
      }

      // 2. Si on lie un compte (Email/Password)
      if (isLinkingAccount && email && password) {
        const credential = EmailAuthProvider.credential(email, password);
        try {
          await linkWithCredential(user, credential);
          await setDoc(doc(db, 'users', user.uid), {
            email,
            isPermanent: true
          }, { merge: true });
        } catch (linkErr: any) {
          if (linkErr.code === 'auth/email-already-in-use') {
            setAuthError("Cet email est déjà utilisé par un autre compte.");
            return;
          }
          throw linkErr;
        }
      }
      
      setIsSaving(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (err: any) {
      console.error("Erreur mise à jour profil:", err);
      setAuthError(err.message);
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Voulez-vous vraiment vous déconnecter ?")) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Erreur lors de la déconnexion:", err);
      }
    }
  };

  const displayPhotoURL = currentUserData?.photoURL || user?.photoURL;
  const displayDisplayName = currentUserData?.displayName || currentUserData?.nickname || user?.displayName || 'Utilisateur';

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {activeSubView === 'main' ? (
        <div className="p-2">
          {/* Section Profil (Avatar & Nom statiques) */}
          <div className="flex flex-col items-center justify-center p-6 border-b border-gray-100">
            <button 
              type="button"
              className={`w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center shadow-sm overflow-hidden mb-4 relative z-20 touch-manipulation ${displayPhotoURL ? 'cursor-pointer hover:opacity-90 transition-opacity active:scale-95' : 'cursor-default'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (displayPhotoURL) {
                  window.open(displayPhotoURL, '_blank');
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (displayPhotoURL) {
                  window.open(displayPhotoURL, '_blank');
                }
              }}
              title={displayPhotoURL ? "Voir la photo en grand" : ""}
            >
              {displayPhotoURL ? (
                <img src={displayPhotoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[48px] text-gray-400">person</span>
              )}
            </button>
            <h2 className="text-xl font-normal text-gray-800">
              {displayDisplayName}
            </h2>
          </div>

          {/* Liste des paramètres */}
          <div className="py-2 z-20 relative">
            <button 
              type="button"
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors text-left"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveSubView('account');
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveSubView('account');
              }}
            >
              <div className="text-gray-500 flex items-center justify-center w-6">
                <span className="material-symbols-outlined text-[22px]">key</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] text-gray-800 font-normal">Compte</span>
                <span className="text-[13px] text-gray-500">Photo de profil, pseudo, sécurité</span>
              </div>
            </button>
            
            {/* On pourra rajouter d'autres sections ici plus tard (Confidentialité, Notifications, etc.) */}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full animate-in slide-in-from-right duration-200">
          {/* Header Retour */}
          <div className="flex items-center px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveSubView('main');
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveSubView('main');
              }}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors cursor-pointer flex-shrink-0"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-medium text-gray-800 ml-4 flex-1">Compte</h1>
          </div>

          <div className="p-6">
            <div className="text-center mb-6 flex flex-col items-center">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={profileInputRef}
                onChange={handleProfileUpload}
              />
              <button 
                type="button"
                className="relative cursor-pointer group mb-4 block" 
                onClick={(e) => {
                  e.preventDefault();
                  profileInputRef.current?.click();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  profileInputRef.current?.click();
                }}
                title="Changer la photo de profil"
              >
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm text-gray-500 overflow-hidden group-hover:bg-gray-200 transition-all">
                  {isUploadingProfile ? (
                    <Loader2 size={32} className="animate-spin text-[#00a884]" />
                  ) : displayPhotoURL ? (
                    <img src={displayPhotoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[48px]">person</span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#00a884] rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </div>
              </button>

              <h2 className="text-xl font-bold text-gray-800">
                {isLinkingAccount ? "Sécurisez votre compte" : "Vos informations"}
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                {isLinkingAccount 
                  ? "Ajoutez un email pour ne jamais perdre vos messages." 
                  : "Mettez à jour votre profil."}
              </p>
            </div>
            
            <form onSubmit={handleNicknameSubmit} className="space-y-4 max-w-sm mx-auto w-full px-2 relative z-20">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 block">Prénom / Pseudo</label>
                <input
                  type="text"
                  placeholder="Votre prénom"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00a884] outline-none text-center font-normal text-[16px] touch-manipulation"
                  required
                />
              </div>

              {isLinkingAccount && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 block">Email</label>
                    <input
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00a884] outline-none text-sm text-[16px] touch-manipulation"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 block">Mot de passe</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00a884] outline-none text-sm text-[16px] touch-manipulation"
                      required
                    />
                  </div>
                </>
              )}

              {authError && <p className="text-xs text-red-500 text-center">{authError}</p>}

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  type="submit"
                  disabled={isSaving || (!hasChanges && !isSuccess)}
                  className={`w-full py-2.5 rounded font-bold transition-all flex items-center justify-center gap-2
                    ${isSuccess 
                      ? 'bg-[#00a884] text-white' 
                      : isSaving || !hasChanges
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-[#00a884] text-white'
                    }`}
                >
                  {isSaving ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : isSuccess ? (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      Enregistré
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </button>
              </div>

              {!isLinkingAccount && user?.email && (
                <div className="space-y-1 pt-6">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 block">Email (Non modifiable)</label>
                  <input
                    type="text"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg outline-none text-center font-normal text-[16px] text-gray-500 cursor-not-allowed touch-manipulation"
                  />
                </div>
              )}

              <div className="pt-8 mt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-3 px-4 bg-red-50 text-red-600 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors active:scale-95 touch-manipulation"
                >
                  <LogOut size={20} />
                  Déconnexion
                </button>
                <p className="text-[11px] text-gray-400 text-center mt-2 px-4">
                  {user?.isAnonymous 
                    ? "Attention : votre compte est temporaire. Si vous vous déconnectez sans ajouter d'email, vous perdrez l'accès à vos messages."
                    : "Déconnectez-vous de votre compte en toute sécurité."}
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
