import http from 'node:http';
import { readFileSync } from 'node:fs';
import { discoveryResponse } from './community-fixtures.mjs';
let mode = 'normal';
http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const send = (status, body) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/control' && req.method === 'POST') {
      mode =
        url.searchParams.get('mode') === 'unavailable'
          ? 'unavailable'
          : 'normal';
      return send(200, { mode });
    }
    if (req.method !== 'GET') return send(405, { error: 'read_only' });
    if (url.pathname === '/responsive') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(
        readFileSync(new URL('./community-responsive.html', import.meta.url)),
      );
    }
    const result = discoveryResponse(url, mode);
    send(result.status, result.body);
  })
  .listen(43128, '127.0.0.1', () =>
    console.log(
      'Community workflow fixtures: http://127.0.0.1:43128; no production connection',
    ),
  );
