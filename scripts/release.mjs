import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const REPO = "Clipdescript/messagerie";
const APK_PATH = "android/app/build/outputs/apk/debug/Messagerie.apk";
const VERSION = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;

async function release() {
  console.log(`🚀 Préparation de la release v${VERSION}...`);

  try {
    // 1. Vérifier si le fichier APK existe
    if (!fs.existsSync(APK_PATH)) {
      console.error("❌ Erreur: Le fichier APK n'a pas été trouvé. Lancez d'abord le build dans Android Studio.");
      process.exit(1);
    }

    // 2. Git push pour s'assurer que le code est à jour
    console.log("📤 Push du code vers GitHub...");
    execSync('git add .');
    try {
      execSync(`git commit -m "build: release v${VERSION}"`);
    } catch (e) {
      console.log("ℹ️ Rien à commiter.");
    }
    execSync('git push origin main');

    // 3. Création de la release GitHub via la CLI 'gh'
    console.log("📦 Création de la release sur GitHub...");
    const releaseTitle = `Release v${VERSION}`;
    const notes = `Mise à jour automatique de l'application Messagerie v${VERSION}`;
    
    // On supprime la release si elle existe déjà (pour permettre la mise à jour)
    try {
      execSync(`gh release delete v${VERSION} -y --cleanup-tag`);
    } catch (e) {}

    // Création de la nouvelle release avec l'APK en asset
    execSync(`gh release create v${VERSION} "${APK_PATH}" --title "${releaseTitle}" --notes "${notes}"`);

    console.log(`✅ Succès ! Votre application est disponible sur GitHub.`);
    console.log(`🔗 URL: https://github.com/${REPO}/releases/latest`);

  } catch (error) {
    console.error("❌ Une erreur est survenue lors de la release :");
    console.error(error.message);
    console.log("\n💡 Assurez-vous d'avoir installé la GitHub CLI (gh) et d'être connecté avec 'gh auth login'.");
  }
}

release();
