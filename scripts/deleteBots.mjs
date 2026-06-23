import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, getDocs, writeBatch } from "firebase/firestore";

// Configuration Firebase récupérée depuis votre projet
const firebaseConfig = {
  apiKey: "AIzaSyBc8tmtjZEndUlvUHPdxmjEAvhAXZQNvMM",
  authDomain: "landaisdiscute.firebaseapp.com",
  projectId: "landaisdiscute",
  storageBucket: "landaisdiscute.firebasestorage.app",
  messagingSenderId: "199794213962",
  appId: "1:199794213962:web:06f474cfcf1dfbedaf52b3",
  measurementId: "G-H584GGNHS8"
};

// Initialisation de Firebase et Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Liste des bots à supprimer
const blockedNames = ['dfssfdsfdsfd', 'bot56', 'bot67', 'bot'];

async function cleanBots() {
  console.log("Démarrage du nettoyage des bots...");
  try {
    // 1. On récupère TOUS les utilisateurs UNE SEULE FOIS (pas de onSnapshot pour éviter la boucle infinie)
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    
    // 2. On utilise un Batch pour optimiser les écritures
    const batch = writeBatch(db);
    let deletedCount = 0;

    snapshot.forEach((doc) => {
      const userData = doc.data();
      const nickname = (userData.nickname || '').toLowerCase();
      const displayName = (userData.displayName || '').toLowerCase();

      // Si le nom correspond à un bot bloqué
      if (blockedNames.includes(nickname) || blockedNames.includes(displayName)) {
        console.log(`Bot trouvé pour suppression: ${nickname || displayName} (ID: ${doc.id})`);
        batch.delete(doc.ref);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      console.log(`Envoi de la demande de suppression pour ${deletedCount} document(s)...`);
      // 3. Exécution du batch
      await batch.commit();
      console.log("✅ Succès ! Les bots ont été supprimés définitivement.");
    } else {
      console.log("✅ Aucun bot trouvé dans la base de données.");
    }

  } catch (error) {
    console.error("❌ Erreur lors de la suppression :", error);
    if (error.code === 'resource-exhausted' || error.message.includes('quota')) {
      console.log("\n⚠️ ATTENTION : Ton quota Firebase est toujours bloqué pour aujourd'hui.");
      console.log("Il faudra attendre demain (vers 9h du matin en France) pour que le quota gratuit se réinitialise, ou passer au plan Blaze (Pay-as-you-go).");
    }
  }
  
  process.exit(0);
}

cleanBots();
