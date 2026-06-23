'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';

interface StatusItem {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  bgColor?: string;
  caption?: string;
  createdAt: any;
}

export default function StatusViewer({ userStatus, currentUserId, onClose }: { userStatus: any, currentUserId: string, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const items: StatusItem[] = userStatus.items || [];
  const currentItem = items[currentIndex];
  const isMe = userStatus.uid === currentUserId;

  const STATUS_DURATION = 10000; // 10 seconds

  // Utiliser une ref pour la fonction onClose pour éviter les problèmes de fermeture (stale closure)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleNext = React.useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < items.length - 1) {
        setProgress(0);
        return prev + 1;
      }
      return prev;
    });
  }, [items.length]);

  // Keep track of when we need to close
  useEffect(() => {
    if (progress >= 100) {
      if (currentIndex >= items.length - 1) {
        onCloseRef.current();
      } else {
        handleNext();
      }
    }
  }, [progress, currentIndex, items.length, handleNext]);

  useEffect(() => {
    if (!currentItem) return;
    
    // Si c'est une vidéo, on laisse la vidéo dicter la progression si possible
    if (currentItem.type === 'video' && videoRef.current) {
      // Le onTimeUpdate gère la progression
      return;
    }

    let interval: NodeJS.Timeout;
    if (!isPaused) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 100;
          return prev + (100 / (STATUS_DURATION / 100)); // Update every 100ms
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [currentIndex, isPaused, currentItem, items.length]); // Added items.length to dependencies

  const handlePrev = () => {
    setCurrentIndex(prev => {
      if (prev > 0) {
        setProgress(0);
        return prev - 1;
      }
      setProgress(0);
      return prev;
    });
  };

  const handleDelete = async () => {
    if (!isMe || !window.confirm('Supprimer ce statut ?')) return;
    
    try {
      const statusRef = doc(db, 'statuses', currentUserId);
      await updateDoc(statusRef, {
        items: arrayRemove(currentItem)
      });
      
      if (items.length <= 1) {
        onClose();
      } else {
        // Le composant parent va se mettre à jour via onSnapshot, 
        // mais pour l'UI locale on peut juste faire next ou prev
        if (currentIndex === items.length - 1) {
          handlePrev();
        } else {
          // Reste sur le même index (le prochain élément prendra cette place)
          setProgress(0);
        }
      }
    } catch (err) {
      console.error('Erreur suppression statut:', err);
    }
  };

  if (!currentItem) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col select-none">
      {/* Progress Bars */}
      <div className="flex gap-1 p-2 pt-4 absolute top-0 w-full z-20">
        {items.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 linear"
              style={{ 
                width: `${idx < currentIndex ? 100 : idx === currentIndex ? progress : 0}%` 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 w-full flex justify-between items-center p-4 z-20 text-white bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/50">
            {userStatus.photoURL ? (
              <img src={userStatus.photoURL} alt={userStatus.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-500 flex items-center justify-center">
                <span className="material-symbols-outlined">person</span>
              </div>
            )}
          </div>
          <div>
            <h2 className="font-medium text-[15px]">{isMe ? 'Mon statut' : userStatus.displayName}</h2>
            <p className="text-[12px] text-white/80">
              {currentItem.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {isMe && (
          <button onClick={handleDelete} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors text-white">
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div 
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: currentItem.bgColor || '#000' }}
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
        onPointerLeave={() => setIsPaused(false)}
      >
        {/* Navigation Areas */}
        <div className="absolute left-0 w-1/3 h-full z-10" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
        <div className="absolute right-0 w-1/3 h-full z-10" onClick={(e) => { e.stopPropagation(); handleNext(); }} />

        {currentItem.type === 'text' ? (
          <div className="px-6 text-center z-0">
            <p className="text-white text-4xl font-light whitespace-pre-wrap break-words">{currentItem.content}</p>
          </div>
        ) : currentItem.type === 'video' ? (
          <video 
            ref={videoRef}
            src={currentItem.content} 
            className="max-w-full max-h-full z-0" 
            autoPlay 
            playsInline
            onTimeUpdate={(e) => {
              const target = e.target as HTMLVideoElement;
              setProgress((target.currentTime / target.duration) * 100);
            }}
            onEnded={handleNext}
          />
        ) : (
          <img src={currentItem.content} alt="Status" className="max-w-full max-h-full object-contain z-0" />
        )}

        {currentItem.caption && currentItem.type !== 'text' && (
          <div className="absolute bottom-10 w-full text-center px-4 z-0">
            <span className="bg-black/50 text-white px-4 py-2 rounded-xl text-lg inline-block break-words max-w-full">
              {currentItem.caption}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
