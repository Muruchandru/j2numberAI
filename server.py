import os
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs, quote

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/proxy':
            target = parse_qs(parsed.query).get('url', [''])[0]
            if not target:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error":"missing url"}')
                return

            try:
                req = urllib.request.Request(target, headers={
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                })
                with urllib.request.urlopen(req, timeout=20) as response:
                    body = response.read()
                    content_type = response.headers.get_content_type()
                    self.send_response(200)
                    self.send_header('Content-Type', content_type + '; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(body)
            except Exception as exc:
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(str(exc).encode('utf-8'))
            return

        if parsed.path == '/':
            path = 'index.html'
        else:
            path = parsed.path.lstrip('/')

        file_path = os.path.join(ROOT, path)
        if os.path.isdir(file_path):
            file_path = os.path.join(file_path, 'index.html')

        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_response(200)
            if file_path.endswith('.html'):
                self.send_header('Content-Type', 'text/html; charset=utf-8')
            elif file_path.endswith('.js'):
                self.send_header('Content-Type', 'application/javascript; charset=utf-8')
            else:
                self.send_header('Content-Type', 'application/octet-stream')
            self.end_headers()
            with open(file_path, 'rb') as handle:
                self.wfile.write(handle.read())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not found')

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8080), Handler)
    print('Serving at http://127.0.0.1:8080')
    server.serve_forever()
