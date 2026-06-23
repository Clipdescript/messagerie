'use client';

import React, { useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

const BG_COLORS = [
  '#FF8A8C', // Red/Pink
  '#54C265', // Green
  '#FFB74D', // Orange
  '#5C6BC0', // Indigo
  '#8D6E63', // Light Indigo
  '#26A69A', // Blue
  '#78909C'  // Blue Grey
];

export default function StatusCreator({ user, type, initialFile, onClose }: { user: any, type: 'text' | 'media', initialFile?: File | null, onClose: () => void }) {
  const [text, setText] = useState('');
  const [bgColorIndex, setBgColorIndex] = useState(0);
  const [mediaFile, setMediaFile] = useState<File | null>(initialFile || null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(initialFile ? URL.createObjectURL(initialFile) : null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Only click if we don't have an initial file
    if (type === 'media' && !initialFile && !mediaPreview) {
      fileInputRef.current?.click();
    }
  }, [type, initialFile, mediaPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    } else {
      onClose();
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    if (type === 'text' && !text.trim()) return;
    if (type === 'media' && !mediaFile) return;

    setIsUploading(true);

    try {
      let content = text;
      let mediaType = 'text';

      if (type === 'media' && mediaFile) {
        const fileExt = mediaFile.name.split('.').pop()?.toLowerCase();
        mediaType = ['mp4', 'webm', 'ogg', 'mov'].includes(fileExt || '') ? 'video' : 'image';
        
        const fileName = `status-${user.uid}-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('chat-files') // using existing bucket
          .upload(`statuses/${fileName}`, mediaFile);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('chat-files')
          .getPublicUrl(`statuses/${fileName}`);

        content = urlData.publicUrl;
      }

      const statusItem: any = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        type: mediaType,
        content: content,
        createdAt: new Date()
      };
      
      if (type === 'media' && text.trim()) {
        statusItem.caption = text;
      }
      
      if (type === 'text') {
        statusItem.bgColor = BG_COLORS[bgColorIndex];
      }

      const statusRef = doc(db, 'statuses', user.uid);
      const docSnap = await getDoc(statusRef);

      if (docSnap.exists()) {
        await setDoc(statusRef, {
          items: arrayUnion(statusItem),
          updatedAt: serverTimestamp(),
          displayName: user.displayName || 'Utilisateur',
          photoURL: user.photoURL || ''
        }, { merge: true });
      } else {
        await setDoc(statusRef, {
          uid: user.uid,
          displayName: user.displayName || 'Utilisateur',
          photoURL: user.photoURL || '',
          items: [statusItem],
          updatedAt: serverTimestamp()
        });
      }

      onClose();
    } catch (err) {
      console.error('Error publishing status:', err);
      alert('Erreur lors de la publication du statut');
    } finally {
      setIsUploading(false);
    }
  };

  if (type === 'media' && !mediaPreview) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <input 
          type="file" 
          accept="image/*,video/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: type === 'text' ? BG_COLORS[bgColorIndex] : '#000' }}
    >
      <div className="flex justify-between items-center p-4 bg-black/20 text-white relative z-10">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-black/20 rounded-full transition-colors">
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
        {type === 'text' && (
          <div className="flex gap-4">
            <button 
              className="w-10 h-10 flex items-center justify-center hover:bg-black/20 rounded-full transition-colors"
              onClick={() => setBgColorIndex((prev) => (prev + 1) % BG_COLORS.length)}
            >
              <span className="material-symbols-outlined text-[24px]">palette</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative">
        {type === 'media' && mediaPreview && (
          <div className="absolute inset-0 flex items-center justify-center">
            {mediaFile?.type.startsWith('video') ? (
              <video src={mediaPreview} className="max-w-full max-h-full" controls autoPlay loop />
            ) : (
              <img src={mediaPreview} className="max-w-full max-h-full object-contain" alt="Preview" />
            )}
          </div>
        )}

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={type === 'text' ? "Tapez un statut" : "Ajouter une légende..."}
          className={`w-full bg-transparent resize-none outline-none text-center text-white placeholder-white/70 ${
            type === 'text' ? 'text-4xl font-light' : 'text-lg absolute bottom-20 bg-black/40 p-3 rounded-xl'
          }`}
          rows={type === 'text' ? 5 : 2}
        />
      </div>

      <div className="p-4 bg-black/20 flex justify-end relative z-10">
        <button 
          onClick={handlePublish}
          disabled={isUploading || (type === 'text' && !text.trim())}
          className="w-14 h-14 bg-[#00a884] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
        >
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-white ml-1 text-[24px]">send</span>
          )}
        </button>
      </div>
    </div>
  );
}
