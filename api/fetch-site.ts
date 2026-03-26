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
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

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
