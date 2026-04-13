import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { IncomingMessage, ServerResponse } from 'http';

export const config = { api: { bodyParser: false } };

function parseBody(req: IncomingMessage): Promise<HandleUploadBody> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const body = await parseBody(req);

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req as any,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maximumSizeInBytes: 5 * 1024 * 1024, // 5 MB
      }),
      onUploadCompleted: async () => {},
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(jsonResponse));
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (error as Error).message }));
  }
}
