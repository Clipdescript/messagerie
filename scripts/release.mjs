import { execSync } from 'child_process';
import fs from 'fs';

// Configuration
const VERSION = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;

async function release() {
  console.log(`🚀 Préparation de la release v${VERSION}...`);

  try {
    // 1. Git add et commit
    console.log("📦 Préparation des fichiers...");
    execSync('git add .');
    try {
      execSync(`git commit -m "build: release v${VERSION}"`);
      console.log("✅ Fichiers commités.");
    } catch (e) {
      console.log("ℹ️ Aucun nouveau fichier à commiter.");
    }

    // 2. Git push du code
    console.log("📤 Push du code vers GitHub...");
    execSync('git push origin main'); 

    // 3. Création et push du tag Git (déclenche GitHub Actions)
    console.log(`🏷️ Création du tag de version v${VERSION}...`);
    try {
      // Supprime le tag local et distant s'il existe déjà pour forcer la mise à jour
      execSync(`git tag -d v${VERSION}`, { stdio: 'ignore' });
      execSync(`git push origin :refs/tags/v${VERSION}`, { stdio: 'ignore' });
    } catch (e) {
      // Ignorer l'erreur si le tag n'existe pas
    }
    
    execSync(`git tag v${VERSION}`);
    console.log("🚀 Déclenchement de la création de l'APK sur GitHub...");
    execSync('git push origin --tags');

    console.log(`\n✅ Succès ! Le code a été envoyé avec le tag v${VERSION}.`);
    console.log(`⚙️ GitHub Actions est en train de générer l'APK et de le publier automatiquement.`);
    console.log(`🔗 Suivez la progression ici : https://github.com/Clipdescript/messagerie/actions`);    

  } catch (error) {
    console.error("❌ Une erreur est survenue lors de la release :");       
    console.error(error.message);     
  }
}

release();
