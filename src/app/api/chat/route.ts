import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const mistral = new OpenAI({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: "https://api.mistral.ai/v1",
});

export async function POST(req: Request) {
  try {
    const { message, imageUrl } = await req.json();

    if (!message && !imageUrl) {
      return NextResponse.json({ error: "Message or Image is required" }, { status: 400 });
    }

    // Ajout de la date actuelle au système pour que l'IA soit à jour
    const currentDate = new Date().toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const messages: any[] = [
      {
        role: 'system',
        content: `Tu es "My IA", l'assistant intelligent de la Messagerie Landaise, propulsé par la technologie Mistral IA. 
        
        INFO CONTEXTUELLE : Nous sommes le ${currentDate}.
        
        DIRECTIVES IMPORTANTES :
        1. Vision : Tu peux analyser des images. Si on t'envoie une image seule, décris-la et analyse-la. Si on t'envoie une image avec un message, réponds d'abord à la consigne du message en utilisant l'image comme contexte.
        2. Identité : Tu te présentes UNIQUEMENT lors du tout premier message ou si l'utilisateur te demande explicitement qui tu es.
        3. Style : Réponds de manière amicale, utile et concise en français.
        4. Formatage : Utilise le Markdown.`
      }
    ];

    const userContent: any[] = [];
    
    if (message) {
      userContent.push({ type: "text", text: message });
    }
    
    if (imageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl }
      });
    }

    messages.push({ role: 'user', content: userContent });

    // Choix du modèle : Pixtral latest si il y a une image, Mistral Small latest sinon
    const modelToUse = imageUrl ? 'pixtral-12b-latest' : 'mistral-small-latest';

    const chatCompletion = await mistral.chat.completions.create({
      messages,
      model: modelToUse,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error('Mistral API Error:', error);
    return NextResponse.json(
      { error: "Erreur lors de la communication avec l'IA", details: error.message },
      { status: 500 }
    );
  }
}
