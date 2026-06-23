import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { addDoc, collection, serverTimestamp, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CreateGroupModalProps {
  user: any;
  onClose: () => void;
  onGroupCreated: (groupId: string, groupData: any) => void;
}

export default function CreateGroupModal({ user, onClose, onGroupCreated }: CreateGroupModalProps) {
  const [step, setStep] = useState(1);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        const users = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((u: any) => u.email && u.id !== user?.uid);
        
        users.sort((a: any, b: any) => {
          const nameA = a.displayName || a.nickname || '';
          const nameB = b.displayName || b.nickname || '';
          return nameA.localeCompare(nameB);
        });
        
        setAllUsers(users);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const toggleUser = (uid: string) => {
    if (selectedUsers.includes(uid)) {
      setSelectedUsers(selectedUsers.filter(id => id !== uid));
    } else {
      setSelectedUsers([...selectedUsers, uid]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setGroupImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2 || !user) return;
    
    setIsCreating(true);
    try {
      let photoURL = '';
      
      // If we had cloud storage, we would upload the image here
      // For now, we can use the base64 preview as a simple solution if it's small enough,
      // but ideally we'd use Firebase Storage. Let's just use base64 for simplicity or skip it if too large.
      // Assuming we just use the preview for now or let them use default if no storage is setup.
      if (imagePreview) {
        photoURL = imagePreview; // Careful with large images in Firestore
      }

      const members = [user.uid, ...selectedUsers];
      
      const docRef = await addDoc(collection(db, 'groups'), {
        name: groupName,
        photoURL: photoURL,
        members: members,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isGroup: true
      });

      onGroupCreated(docRef.id, {
        name: groupName,
        avatar: photoURL
      });
      onClose();
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {step === 1 ? 'Créer un groupe' : 'Nouveau groupe'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Sélectionnez au moins 2 personnes
              </p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-[#00a884]" size={32} />
                </div>
              ) : (
                <div className="space-y-2">
                  {allUsers.map((u) => {
                    const isSelected = selectedUsers.includes(u.id || u.uid);
                    return (
                      <div 
                        key={u.id || u.uid}
                        onClick={() => toggleUser(u.id || u.uid)}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                      >
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-[#00a884] border-[#00a884]' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        
                        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-400">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.displayName || u.nickname} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[24px]">person</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-medium text-gray-800 truncate">
                            {u.displayName || u.nickname || 'Anonyme'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center space-y-6 py-4">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[40px] text-gray-400">group</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImageIcon className="text-white" size={24} />
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </label>

              <div className="w-full">
                <input
                  type="text"
                  placeholder="Nom du groupe"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00a884] outline-none text-center font-medium text-[16px]"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={selectedUsers.length < 2}
              className="w-full py-3 bg-[#00a884] text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Continuer ({selectedUsers.length} sélectionnés)
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
              >
                Retour
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || isCreating}
                className="flex-1 py-3 bg-[#00a884] text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isCreating ? <Loader2 size={20} className="animate-spin" /> : 'Terminer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
