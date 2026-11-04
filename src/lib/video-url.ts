/** Accept normal YouTube links without making teachers copy embed codes. */
export function getVideoSource(src: string): {src: string; embed: boolean} {
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:') return {src: '', embed: false};
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const id = host === 'youtu.be' ? url.pathname.split('/')[1] : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
      if (!id || !/^[\w-]{11}$/.test(id)) return {src: '', embed: false};
      return {src: `https://www.youtube-nocookie.com/embed/${id}`, embed: true};
    }
    return {src: url.toString(), embed: !/\.(mp4|webm|ogg)(?:$|\?)/i.test(url.toString())};
  } catch { return {src: '', embed: false}; }
}
