'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import StatusCreator from './StatusCreator';
import StatusViewer from './StatusViewer';

interface StatusItem {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  bgColor?: string;
  createdAt: Timestamp;
}

interface UserStatus {
  uid: string;
  displayName: string;
  photoURL: string;
  items: StatusItem[];
  updatedAt: Timestamp;
}

export default function StatusView({ user }: { user: any }) {
  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  const [myStatus, setMyStatus] = useState<UserStatus | null>(null);
  
  const [isCreatingText, setIsCreatingText] = useState(false);
  const [isCreatingMedia, setIsCreatingMedia] = useState(false);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [viewingStatusUser, setViewingStatusUser] = useState<UserStatus | null>(null);

  const handleMediaClick = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMediaFile(file);
      setIsCreatingMedia(true);
    }
    // Reset the input value so the same file can be selected again if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (!user) return;

    // Fetch all statuses from the last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const q = query(
      collection(db, 'statuses'),
      where('updatedAt', '>', twentyFourHoursAgo)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allStatuses: UserStatus[] = [];
      let myStat: UserStatus | null = null;

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as UserStatus;
        // Filter out expired items (older than 24h)
        const validItems = (data.items || []).filter(item => {
          if (!item.createdAt) return false;
          const itemDate = item.createdAt.toDate();
          return itemDate > twentyFourHoursAgo;
        });

        if (validItems.length > 0) {
          const userStatus = { ...data, uid: docSnap.id, items: validItems };
          if (docSnap.id === user.uid) {
            myStat = userStatus;
          } else {
            allStatuses.push(userStatus);
          }
        }
      });

      // Sort by latest update
      allStatuses.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
      
      setStatuses(allStatuses);
      setMyStatus(myStat);
    });

    return () => unsubscribe();
  }, [user]);

  if (isCreatingText) {
    return <StatusCreator user={user} type="text" onClose={() => setIsCreatingText(false)} />;
  }

  if (isCreatingMedia) {
    return (
      <StatusCreator 
        user={user} 
        type="media" 
        initialFile={selectedMediaFile}
        onClose={() => {
          setIsCreatingMedia(false);
          setSelectedMediaFile(null);
        }} 
      />
    );
  }

  if (viewingStatusUser) {
    return (
      <StatusViewer 
        userStatus={viewingStatusUser} 
        currentUserId={user?.uid}
        onClose={() => setViewingStatusUser(null)} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] overflow-y-auto">
      {/* Hidden file input for media creation */}
      <input 
        type="file" 
        accept="image/*,video/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />

      {/* Mon statut */}
      <div className="bg-white px-4 py-3 mt-2 shadow-sm flex items-center justify-between cursor-pointer" onClick={() => myStatus ? setViewingStatusUser(myStatus) : handleMediaClick()}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full overflow-hidden ${myStatus ? 'border-[2.5px] border-[#00a884] p-0.5' : ''}`}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Moi" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-full">
                  <span className="material-symbols-outlined text-gray-500 text-[24px]">person</span>
                </div>
              )}
            </div>
            {!myStatus && (
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center border-2 border-white">
                <span className="material-symbols-outlined text-white text-[14px]">add</span>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-[16px] font-medium text-gray-800">Mon statut</h2>
            <p className="text-[14px] text-gray-500">
              {myStatus ? 'Appuyez pour voir votre statut' : 'Ajouter au statut'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            type="button"
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors z-10 relative"
            onClick={handleMediaClick}
            onTouchEnd={handleMediaClick}
          >
            <span className="material-symbols-outlined text-gray-600 text-[20px]">photo_camera</span>
          </button>
          <button 
            type="button"
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors z-10 relative"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCreatingText(true); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setIsCreatingText(true); }}
          >
            <span className="material-symbols-outlined text-gray-600 text-[20px]">edit</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-2 mt-2">
        <h3 className="text-[14px] font-medium text-gray-500 uppercase">Statuts récents</h3>
      </div>

      {/* Autres statuts */}
      <div className="bg-white shadow-sm flex-1">
        {statuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[40px] text-gray-400">data_usage</span>
            </div>
            <p className="text-gray-500 text-[15px]">Aucune mise à jour récente</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {statuses.map(stat => (
              <div 
                key={stat.uid} 
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                onClick={() => setViewingStatusUser(stat)}
              >
                <div className="w-14 h-14 rounded-full border-[2.5px] border-[#00a884] p-0.5 flex-shrink-0">
                  {stat.photoURL ? (
                    <img src={stat.photoURL} alt={stat.displayName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-full">
                      <span className="material-symbols-outlined text-gray-500 text-[24px]">person</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-[16px] font-medium text-gray-800">{stat.displayName}</h2>
                  <p className="text-[13px] text-gray-500">
                    Aujourd'hui à {stat.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
