import { getLinkPreview } from 'link-preview-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  console.log('[API PREVIEW] Request for:', url);

  if (!url) {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
  }

  try {
    // Nettoyage de l'URL
    const targetUrl = url.trim();
    
    // 1. Détection des plateformes spécifiques pour OEmbed
    if (targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) {
      try {
        let videoId = null;
        if (targetUrl.includes('youtu.be/')) {
          videoId = targetUrl.split('youtu.be/')[1].split(/[?#]/)[0];
        } else if (targetUrl.includes('v=')) {
          videoId = targetUrl.split('v=')[1].split('&')[0];
        }

        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const data = await res.json();
          // Extraction améliorée de l'ID pour les Shorts et autres formats
          if (!videoId && data.html) {
            const idMatch = data.html.match(/\/embed\/([^?"]+)/);
            if (idMatch) videoId = idMatch[1];
          }
          
          return NextResponse.json({
            type: 'youtube',
            title: data.title || 'Vidéo YouTube',
            author: data.author_name || '',
            thumbnail: data.thumbnail_url || null,
            embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : null,
            url: targetUrl,
            siteName: 'YouTube'
          });
        }
      } catch (e) {
        console.warn('[API PREVIEW] YouTube OEmbed failed');
      }
    }

    if (targetUrl.includes('tiktok.com')) {
      try {
        let videoId = null;
        // Détection plus robuste de l'ID TikTok
        const videoIdMatch = targetUrl.match(/\/video\/(\d+)/) || targetUrl.match(/\/v\/(\d+)/);
        if (videoIdMatch) {
          videoId = videoIdMatch[1];
        }

        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const data = await res.json();
          
          // Si on n'a toujours pas d'ID, on essaie de l'extraire du HTML oEmbed
          if (!videoId && data.html) {
            const idMatch = data.html.match(/data-video-id="(\d+)"/);
            if (idMatch) videoId = idMatch[1];
          }

          return NextResponse.json({
            type: 'tiktok',
            title: data.title || 'Vidéo TikTok',
            author: data.author_name || '',
            thumbnail: data.thumbnail_url || null,
            // Utilisation du player mobile-friendly de TikTok
            embedUrl: videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null,
            url: targetUrl,
            siteName: 'TikTok'
          });
        }
      } catch (e) {
        console.warn('[API PREVIEW] TikTok OEmbed failed');
      }
    }

    // 2. Cas spécifique MyInstants ou Fallback Général via Microlink
    try {
      // On utilise Microlink pour MyInstants et comme fallback général car ils gèrent bien Cloudflare
      const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&palette=true&audio=true`;
      const res = await fetch(microlinkUrl);
      
      if (res.ok) {
        const { data } = await res.json();
        
        if (targetUrl.includes('myinstants.com')) {
          const parts = targetUrl.split('/instant/');
          const slug = parts.length > 1 ? parts[1].split('/')[0].split('?')[0] : '';
          
          return NextResponse.json({
            type: 'myinstants',
            title: data.title || slug.replace(/-/g, ' '),
            description: data.description || 'Bouton sonore MyInstants',
            image: data.image?.url || `https://www.myinstants.com/media/instants_images/${slug}.png`,
            url: targetUrl,
            siteName: 'MyInstants',
            audioUrl: `https://www.myinstants.com/media/sounds/${slug}.mp3`
          });
        }

        return NextResponse.json({
          type: 'generic',
          title: data.title || 'Lien externe',
          description: data.description || '',
          image: data.image?.url || data.logo?.url || null,
          siteName: data.publisher || new URL(targetUrl).hostname,
          url: targetUrl
        });
      }
    } catch (e) {
      console.warn('[API PREVIEW] Microlink failed, using local fallback');
    }

    // 3. Fallback minimal local si Microlink échoue
    try {
      const previewData = await getLinkPreview(targetUrl, {
        headers: { 
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        followRedirects: 'follow',
        timeout: 5000
      }) as any;

      let hostname = 'Lien';
      try {
        hostname = new URL(targetUrl).hostname;
      } catch (e) {}

      return NextResponse.json({
        type: 'generic',
        title: previewData.title || 'Lien externe',
        description: previewData.description || '',
        image: previewData.images?.[0] || previewData.favicons?.[0] || null,
        siteName: previewData.siteName || hostname,
        url: targetUrl
      });
    } catch (e) {
      console.error('[API PREVIEW] Generic parsing failed:', e);
      // Fallback minimal pour ne pas renvoyer 500
      return NextResponse.json({
        type: 'generic',
        title: targetUrl,
        url: targetUrl,
        siteName: 'Lien'
      });
    }

  } catch (error: any) {
    console.error('[API PREVIEW] Global Error:', error);
    return NextResponse.json({ 
      error: 'Erreur interne', 
      details: error?.message || 'Inconnue' 
    }, { status: 500 });
  }
}
