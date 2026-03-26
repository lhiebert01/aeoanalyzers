import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Use full browser-like headers to avoid bot detection
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    // Handle soft 403s by trying www variant or non-www variant
    if (response.status === 403) {
      const urlObj = new URL(url);
      const altUrl = urlObj.hostname.startsWith('www.')
        ? url.replace('www.', '')
        : url.replace(`://${urlObj.hostname}`, `://www.${urlObj.hostname}`);

      const retryResponse = await fetch(altUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      if (retryResponse.ok) {
        const html = await retryResponse.text();
        return res.json({ html });
      }
    }

    if (!response.ok) {
      throw new Error(`Website returned status ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    res.json({ html });
  } catch (error: any) {
    console.error('Error fetching site:', error);
    let message = error.message || 'Failed to fetch website content';
    if (error.name === 'TimeoutError')
      message = "Request timed out. The website might be slow or blocking our crawler.";
    res.status(500).json({ error: message });
  }
}
