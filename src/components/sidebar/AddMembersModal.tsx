import React, { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { doc, updateDoc, arrayUnion, collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AddMembersModalProps {
  groupId: string;
  currentMembers: string[];
  onClose: () => void;
}

export default function AddMembersModal({ groupId, currentMembers, onClose }: AddMembersModalProps) {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        const users = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((u: any) => u.email && !currentMembers.includes(u.id));
        setAllUsers(users);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentMembers]);

  const toggleUser = (uid: string) => {
    if (selectedUsers.includes(uid)) {
      setSelectedUsers(selectedUsers.filter(id => id !== uid));
    } else {
      setSelectedUsers([...selectedUsers, uid]);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsAdding(true);
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(...selectedUsers)
      });
      onClose();
    } catch (error) {
      console.error("Error adding members:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Ajouter des membres
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
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-[#00a884]" size={32} />
            </div>
          ) : allUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucun utilisateur disponible à ajouter.</p>
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || isAdding}
            className="w-full py-3 bg-[#00a884] text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isAdding ? <Loader2 size={20} className="animate-spin" /> : `Ajouter (${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}