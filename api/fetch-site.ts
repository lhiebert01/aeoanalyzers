import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Normalize URL
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  const browserHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': 'https://www.google.com/',
    'Sec-Ch-Ua': '"Chromium";v="135", "Google Chrome";v="135", "Not-A.Brand";v="8"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };

  // Helper: attempt a fetch, return html string or null
  const tryFetch = async (targetUrl: string, headers: Record<string, string>): Promise<string | null> => {
    try {
      const resp = await fetch(targetUrl, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });
      if (resp.ok) {
        return await resp.text();
      }
    } catch {
      // Swallow — will try next strategy
    }
    return null;
  };

  try {
    const urlObj = new URL(normalizedUrl);
    const altUrl = urlObj.hostname.startsWith('www.')
      ? normalizedUrl.replace('www.', '')
      : normalizedUrl.replace(`://${urlObj.hostname}`, `://www.${urlObj.hostname}`);

    // Strategy 1: Direct fetch with full browser headers
    let html = await tryFetch(normalizedUrl, browserHeaders);

    // Strategy 2: Try www/non-www alternate with Mac UA
    if (!html) {
      html = await tryFetch(altUrl, {
        ...browserHeaders,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Sec-Ch-Ua-Platform': '"macOS"',
      });
    }

    // Strategy 3: Original URL with minimal headers (some WAFs block excessive headers)
    if (!html) {
      html = await tryFetch(normalizedUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      });
    }

    // Strategy 4: Alternate URL with minimal headers
    if (!html) {
      html = await tryFetch(altUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      });
    }

    // Strategy 5: Google webcache fallback
    if (!html) {
      const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(normalizedUrl)}`;
      html = await tryFetch(cacheUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      });
    }

    if (!html) {
      return res.status(502).json({
        error: `Unable to fetch this website. The site may be blocking automated requests (bot protection). Try entering the URL with or without "www." prefix, or try a different page on the same site.`
      });
    }

    res.json({ html });
  } catch (error: any) {
    console.error('Error fetching site:', error);
    let message = error.message || 'Failed to fetch website content';
    if (error.name === 'TimeoutError' || error.name === 'AbortError')
      message = "Request timed out. The website might be slow or blocking automated requests. Try again or use a different page URL.";
    res.status(500).json({ error: message });
  }
}
