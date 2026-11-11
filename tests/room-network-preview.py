"""Local production-build preview with reproducible network faults (never deployed).
Usage: python3 tests/room-network-preview.py outputs/github-pages
4205: material responses delayed 25s; 4206: all material requests fail;
4207: selected maps and HDR fail; 4208: all responses share 128 KiB/s.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import threading, time, sys, json
root=sys.argv[1]
class Server(ThreadingHTTPServer):
    request_queue_size=128
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
    def do_GET(self):
        material='/materials/poly-haven/' in self.path
        mode=self.server.server_port
        if material and mode==4205: time.sleep(25)
        if material and (mode==4206 or (mode==4207 and ('normal.jpg' in self.path or '.hdr' in self.path))):
            self.send_error(503,'Intentional network test');return
        try: super().do_GET()
        except (BrokenPipeError,ConnectionResetError): pass
    def copyfile(self, source, output):
        if self.server.server_port!=4208: return super().copyfile(source,output)
        while data:=source.read(8192):
            with self.server.rate_lock:
                time.sleep(len(data)/(128*1024));output.write(data);output.flush()
    def log_message(self, fmt, *args):
        print(json.dumps({'time':round(time.monotonic(),2),'port':self.server.server_port,'message':fmt%args}),flush=True)
servers=[]
for port in [4205,4206,4207,4208]:
    server=Server(('127.0.0.1',port),partial(Handler,directory=root));server.rate_lock=threading.Lock()
    threading.Thread(target=server.serve_forever,daemon=True).start();servers.append(server)
threading.Event().wait()
