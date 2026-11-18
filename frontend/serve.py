from __future__ import annotations

import http.client
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


PROJECT_DIR = Path(__file__).resolve().parent
DIST_DIR = PROJECT_DIR / "dist"
API_HOST = os.environ.get("API_HOST", "127.0.0.1")
API_PORT = int(os.environ.get("API_PORT", "8000"))
FRONTEND_HOST = os.environ.get("FRONTEND_HOST", "0.0.0.0")
FRONTEND_PORT = int(os.environ.get("FRONTEND_PORT", "5173"))


class FrontendHandler(SimpleHTTPRequestHandler):
    """Serve the built app and proxy same-origin API requests to FastAPI."""

    def _proxy_api(self) -> None:
        parsed = urlsplit(self.path)
        body_size = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(body_size) if body_size else None
        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in {"host", "connection", "content-length", "transfer-encoding"}
        }

        connection = http.client.HTTPConnection(API_HOST, API_PORT, timeout=300)
        try:
            connection.request(self.command, parsed.path + (f"?{parsed.query}" if parsed.query else ""), body=body, headers=headers)
            upstream = connection.getresponse()
            self.send_response(upstream.status, upstream.reason)
            hop_by_hop = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade"}
            for key, value in upstream.getheaders():
                if key.lower() not in hop_by_hop:
                    self.send_header(key, value)
            self.end_headers()
            if self.command != "HEAD":
                while chunk := upstream.read(64 * 1024):
                    self.wfile.write(chunk)
                    self.wfile.flush()
        except OSError as exc:
            self.send_error(502, f"API server is unavailable: {exc}")
        finally:
            connection.close()

    def do_GET(self) -> None:
        if urlsplit(self.path).path == "/api" or urlsplit(self.path).path.startswith("/api/"):
            self._proxy_api()
        else:
            super().do_GET()

    def do_HEAD(self) -> None:
        if urlsplit(self.path).path == "/api" or urlsplit(self.path).path.startswith("/api/"):
            self._proxy_api()
        else:
            super().do_HEAD()

    def do_POST(self) -> None:
        self._proxy_api()

    def do_PUT(self) -> None:
        self._proxy_api()

    def do_PATCH(self) -> None:
        self._proxy_api()

    def do_DELETE(self) -> None:
        self._proxy_api()

    def do_OPTIONS(self) -> None:
        self._proxy_api()


if __name__ == "__main__":
    handler = partial(FrontendHandler, directory=str(DIST_DIR))
    server = ThreadingHTTPServer((FRONTEND_HOST, FRONTEND_PORT), handler)
    print(f"Serving frontend at http://localhost:{FRONTEND_PORT} from {DIST_DIR}", flush=True)
    server.serve_forever()
