'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, arrayUnion, serverTimestamp, or, and } from 'firebase/firestore';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { Phone, Video, X, PhoneMissed } from 'lucide-react';

interface CallHandlerProps {
  user: any;
}

export default function CallHandler({ user }: CallHandlerProps) {
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);

  // Listen to incoming calls
  useEffect(() => {
    if (!user) return;

    // Listen to calls where user is a participant, or if it's a general call
    const q = query(
      collection(db, 'calls'),
      and(
        or(
          where('participants', 'array-contains', user.uid),
          where('participants', 'array-contains', 'general_call')
        ),
        where('status', 'in', ['calling', 'ongoing'])
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let foundIncoming = null;
      let foundActive = null;

      snapshot.docs.forEach(docSnap => {
        const call = { id: docSnap.id, ...docSnap.data() } as any;
        
        // Skip if ended
        if (call.status === 'ended') return;

        // Skip if I declined
        if (call.declinedBy?.includes(user.uid)) return;

        // If I am already in a call, keep it active
        if (activeCall && call.id === activeCall.id) {
          foundActive = call;
          return;
        }

        // If I already accepted, it's an active call
        if (call.acceptedBy?.includes(user.uid) || call.initiatorId === user.uid) {
          foundActive = call;
        } else {
          // Otherwise it's an incoming call (only if not already active in another call)
          if (!activeCall) {
            foundIncoming = call;
          }
        }
      });

      // Update states
      if (foundActive) {
        setActiveCall(foundActive);
        setIncomingCall(null);
      } else {
        // If active call ended
        setActiveCall(null);
        setIncomingCall(foundIncoming);
      }
    });

    return () => unsubscribe();
  }, [user, activeCall]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), {
        acceptedBy: arrayUnion(user.uid),
        status: 'ongoing'
      });
      setActiveCall(incomingCall);
      setIncomingCall(null);
    } catch (err) {
      console.error("Erreur lors de l'acceptation:", err);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), {
        declinedBy: arrayUnion(user.uid)
      });
      setIncomingCall(null);
      
      // If it's a 1-to-1 call and declined, end it for the other person too
      if (incomingCall.participants.length <= 2 && !incomingCall.participants.includes('general_call')) {
        await updateDoc(doc(db, 'calls', incomingCall.id), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Erreur lors du refus:", err);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    try {
      // If initiator, end call for everyone
      if (activeCall.initiatorId === user.uid || (activeCall.participants.length <= 2 && !activeCall.participants.includes('general_call'))) {
        await updateDoc(doc(db, 'calls', activeCall.id), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
      } else {
        // Just leave the call (optional logic)
      }
      setActiveCall(null);
    } catch (err) {
      console.error("Erreur lors de la fin de l'appel:", err);
      setActiveCall(null);
    }
  };

  if (!user) return null;

  // Define the room name properly - Jitsi works best with simple alphanumeric room names
  const cleanRoomName = activeCall?.roomName ? activeCall.roomName.replace(/[^a-zA-Z0-9]/g, '') : '';

  return (
    <>
      {/* Incoming Call Popup */}
      {incomingCall && !activeCall && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-white rounded-2xl shadow-2xl p-4 flex flex-col items-center animate-in slide-in-from-top duration-300 border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-gray-100 mb-3 overflow-hidden border border-gray-200">
            {incomingCall.initiatorAvatar ? (
              <img src={incomingCall.initiatorAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[32px] text-gray-400 mt-3">person</span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-800 text-center">
            {incomingCall.initiatorName}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Appel {incomingCall.type === 'video' ? 'vidéo' : 'vocal'} entrant...
            {incomingCall.groupName ? ` (dans ${incomingCall.groupName})` : ''}
          </p>
          
          <div className="flex gap-6 w-full justify-center">
            <button 
              onClick={handleDecline}
              className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md hover:shadow-lg active:scale-95"
            >
              <PhoneMissed size={24} />
            </button>
            <button 
              onClick={handleAccept}
              className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors shadow-md hover:shadow-lg active:scale-95"
            >
              {incomingCall.type === 'video' ? <Video size={24} /> : <Phone size={24} />}
            </button>
          </div>
        </div>
      )}

      {/* Active Call Window (Jitsi) */}
      {activeCall && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center bg-black text-white absolute top-0 w-full z-[201] bg-opacity-50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium text-sm">Appel en cours</span>
            </div>
            <button 
              onClick={handleEndCall}
              className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors shadow-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 w-full h-full">
               <JitsiMeeting
                 domain="jitsi.riot.im"
                 roomName={cleanRoomName}
              configOverwrite={{
                startWithAudioMuted: false,
                startWithVideoMuted: activeCall.type === 'audio',
                prejoinPageEnabled: false,
                disableDeepLinking: true,
                requireDisplayName: false,
              }}
              interfaceConfigOverwrite={{
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                DEFAULT_LOGO_URL: '',
                DEFAULT_WELCOME_PAGE_LOGO_URL: '',
                TOOLBAR_BUTTONS: [
                  'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                  'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                  'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                  'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                  'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', 'security'
                ],
              }}
              userInfo={{
                displayName: user.displayName || 'Utilisateur',
                email: user.email || ''
              }}
              onApiReady={(externalApi) => {
                externalApi.executeCommand('subject', 'Appel Messagerie');
                
                // Forcer l'avatar de l'utilisateur (ou l'avatar par défaut s'il n'en a pas)
                externalApi.executeCommand('avatarUrl', user.photoURL || 'https://messagerie.landaisdiscute.com/Logo.png');
                
                externalApi.addListener('videoConferenceLeft', () => {
                  handleEndCall();
                });
              }}
              getIFrameRef={(iframeRef) => {
                iframeRef.style.height = '100%';
                iframeRef.style.width = '100%';
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
