"""Always serve this checkout; never open an unrelated server occupying the port."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import threading
import webbrowser
import socket

PROJECT = Path(__file__).resolve().parents[1]

class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, format, *args):
        # Keep a desktop-launched helper from blocking on an unread output pipe.
        pass

    def end_headers(self):
        if self.path.split('?', 1)[0].endswith(('.html', '.js', '.css', '.json')) or self.path.split('?', 1)[0] == '/':
            self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

class Server(ThreadingHTTPServer):
    allow_reuse_address = False
    request_queue_size = 128

    def server_bind(self):
        # Windows SO_REUSEADDR can let two servers share the same listening port.
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()

def start_server(port=8765):
    handler = partial(Handler, directory=str(PROJECT / 'dist'))
    try:
        return Server(('127.0.0.1', port), handler)
    except OSError:
        if not port:
            raise
        return Server(('127.0.0.1', 0), handler)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    with start_server(args.port) as server:
        url = f'http://127.0.0.1:{server.server_port}/?detail=low&v=navigation-20261008'
        print(f'Folder: {PROJECT / "dist"}', flush=True)
        print(f'Neuroatlas: {url}', flush=True)
        print('Zamknij to okno, aby zatrzymac serwer.', flush=True)
        if not args.no_browser:
            threading.Timer(.3, lambda: webbrowser.open(url)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass

if __name__ == '__main__':
    main()
