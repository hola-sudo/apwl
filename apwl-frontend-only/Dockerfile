FROM python:3.11-alpine

WORKDIR /app

# Copy static files
COPY dist/ ./

# Create a simple HTTP server script
RUN echo '#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = int(os.environ.get("PORT", 3000))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()
    
    def do_GET(self):
        if self.path == "/" or not os.path.exists(self.path[1:]):
            self.path = "/index.html"
        return super().do_GET()

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server running on port {PORT}")
    httpd.serve_forever()
' > server.py

RUN chmod +x server.py

EXPOSE 3000

CMD ["python3", "server.py"]