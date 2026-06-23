'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Download, ShieldCheck } from 'lucide-react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export default function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkVersion = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);

    try {
      // On n'utilise plus de fetch sur version.json en développement local pour éviter les erreurs de console
      if (!Capacitor.isNativePlatform() && window.location.hostname === 'localhost') {
        return;
      }

      const response = await fetch('/version.json', { cache: 'no-cache' });
      if (!response.ok) return; 
      
      const data = await response.json();
      if (!data || !data.version) return;
      const serverWebVersion = data.version;
      const serverNativeVersion = data.nativeVersion;
      
      // 1. Vérification Web (LocalStorage)
      const localWebVersion = localStorage.getItem('app_version');
      if (!localWebVersion) {
        localStorage.setItem('app_version', serverWebVersion);
      } else if (serverWebVersion !== localWebVersion) {
        setUpdateAvailable(true);
      }
    } catch (error) {
      // Échec silencieux
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  useEffect(() => {
    // Vérification initiale avec un petit délai pour laisser le serveur/SW se stabiliser
    const timerInitial = setTimeout(checkVersion, 2000);

    // Vérification quand l'utilisateur revient sur l'onglet (très efficace sur mobile)
    const handleFocus = () => checkVersion();
    window.addEventListener('focus', handleFocus);

    // Vérification périodique toutes les 10 minutes
    const interval = setInterval(checkVersion, 10 * 60 * 1000);

    return () => {
      clearTimeout(timerInitial);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [checkVersion]);

  const handleUpdate = async () => {
    try {
      // 1. On force le Service Worker à se mettre à jour s'il y en a un
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          // On force la mise à jour du SW
          await registration.update();
          // Si un SW attend, on lui dit de s'activer
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }

      // 2. On récupère la version et on met à jour le localStorage
      const res = await fetch('/version.json', { cache: 'no-cache' });
      const data = await res.json();
      localStorage.setItem('app_version', data.version);

      // 3. On vide tous les caches du navigateur manuellement pour être sûr
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 4. Force un rechargement complet avec une nouvelle URL pour casser le cache du CDN/Navigateur
      const url = new URL(window.location.origin);
      url.searchParams.set('upd', data.version);
      window.location.href = url.toString();
    } catch (error) {
      console.error('Erreur lors de la mise à jour forcée:', error);
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500 md:left-auto md:right-8 md:bottom-8 md:w-96">
      <div className="bg-[#00a884] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-4 border border-green-400/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <RefreshCw className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <p className="font-bold text-sm">Mise à jour disponible</p>
            <p className="text-xs text-green-50; mt-0.5">Nouvelle version du site prête !</p>
          </div>
        </div>
        <button
          onClick={handleUpdate}
          className="bg-white text-[#00a884] px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-50 active:scale-95 transition-all shadow-sm whitespace-nowrap"
        >
          Actualiser
        </button>
      </div>
    </div>
  );
}
