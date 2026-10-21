"""Portable read-only preview for the exported Reline website (Python 3)."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import mimetypes
import sys

ROOT = Path(__file__).resolve().parent
REMOTE = 'https://enanro.github.io/relain-site/'
TEXT_TYPES = {'.html', '.css', '.js', '.json', '.svg', '.xml', '.txt'}


class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        request_path = unquote(urlsplit(self.path).path)
        if request_path.startswith('/relain-site/'):
            request_path = request_path[len('/relain-site'):]
        target = (ROOT / request_path.lstrip('/')).resolve()
        if not target.is_relative_to(ROOT):
            self.send_error(403)
            return None
        if target.is_dir():
            if not request_path.endswith('/'):
                self.send_response(301)
                self.send_header('Location', request_path + '/')
                self.end_headers()
                return None
            target /= 'index.html'
        if not target.is_file():
            self.send_error(404)
            return None
        if target.suffix.lower() in TEXT_TYPES:
            from io import BytesIO
            data = target.read_text(encoding='utf-8-sig')
            data = data.replace(REMOTE, '/')
            data = data.replace(REMOTE.replace('/', r'\/'), r'\/')
            data = data.encode('utf-8')
            self.send_response(200)
            content_type = mimetypes.guess_type(str(target))[0] or 'text/plain'
            self.send_header('Content-Type', content_type + '; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return BytesIO(data)
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(str(target))[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(target.stat().st_size))
        self.end_headers()
        return target.open('rb')


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f'Preview: http://127.0.0.1:{port}/ospt-reline-static/', flush=True)
    print('Stop: Ctrl+C. Files are served without modification.', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Preview).serve_forever()
