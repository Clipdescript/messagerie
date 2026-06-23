import { db, auth } from './firebase';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  onSnapshot,
  collection,
  Timestamp
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

// Heartbeat interval in milliseconds (20 seconds)
const HEARTBEAT_INTERVAL = 20000;
// Max age of a heartbeat to consider a user online (45 seconds)
const ONLINE_THRESHOLD = 45000;

export interface OnlineUser {
  uid: string;
  isTyping?: boolean;
  typingIn?: string | null;
  displayName?: string;
}

export function usePresence(uid: string | undefined, displayName?: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!uid) return;

    const userRef = doc(db, 'status', uid);

    // Function to update presence and heartbeat
    const updateHeartbeat = async (isTypingStatus?: boolean, typingInGroupId?: string | null) => {
      await setDoc(userRef, {
        state: 'online',
        displayName: displayName || null,
        lastSeen: serverTimestamp(),
        isTyping: isTypingStatus ?? false,
        typingIn: typingInGroupId ?? null,
      }, { merge: true });
    };

    // Initial update
    updateHeartbeat();

    // Start heartbeat interval
    const interval = setInterval(() => {
      // On met à jour le heartbeat sans toucher au statut isTyping
      setDoc(userRef, {
        lastSeen: serverTimestamp(),
      }, { merge: true });
    }, HEARTBEAT_INTERVAL);

    // Listen to all statuses with heartbeat validation
    const q = collection(db, 'status');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const online = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          if (data.state !== 'online') return false;
          
          // Check if heartbeat is still fresh
          const lastSeen = data.lastSeen as Timestamp;
          if (!lastSeen) return false;
          
          return (now - lastSeen.toDate().getTime()) < ONLINE_THRESHOLD;
        })
        .map(doc => ({
          uid: doc.id,
          isTyping: doc.data().isTyping,
          typingIn: doc.data().typingIn || null,
          displayName: doc.data().displayName
        }));
      setOnlineUsers(online);
    });

    // Cleanup interval on unmount
    return () => {
      clearInterval(interval);
      unsubscribe();
      setDoc(userRef, { state: 'offline', lastSeen: serverTimestamp(), isTyping: false, typingIn: null }, { merge: true });
    };
  }, [uid, displayName]);

  const setTyping = async (isTyping: boolean, groupId: string | null = null) => {
    if (!uid) return;
    const userRef = doc(db, 'status', uid);
    await setDoc(userRef, { isTyping, typingIn: isTyping ? groupId : null, lastSeen: serverTimestamp() }, { merge: true });
  };

  return { onlineUsers, setTyping };
}
