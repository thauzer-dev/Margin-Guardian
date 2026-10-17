"""Servidor local opcional. Demonstração HTML também funciona sem Python."""

from guardian import __version__
import argparse
import json
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from guardian.simulator import simulate

ROOT = Path(__file__).resolve().parent


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "dist"), **kwargs)

    def reply(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def allowed_host(self):
        # O Host não pode definir sozinho quais origens são confiáveis.
        hosts = self.headers.get_all("Host", [])
        allowed = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
        if len(hosts) != 1 or hosts[0] not in allowed:
            self.reply(403, {"error": "Host não permitido"})
            return False
        return True

    def do_GET(self):
        if not self.allowed_host():
            return
        if self.path == "/api/health":
            self.reply(200, {"status": "ok", "version": __version__})
            return
        super().do_GET()

    def do_POST(self):
        if not self.allowed_host():
            return
        if self.path != "/api/simulate":
            self.reply(404, {"error": "Rota inexistente"})
            return
        origins = self.headers.get_all("Origin", [])
        if origins and (len(origins) != 1 or origins[0] != f"http://{self.headers.get('Host')}"):
            self.reply(403, {"error": "Origem não permitida"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 4096:
                raise ValueError("Requisição excede 4 KB ou está vazia.")
            if self.headers.get_content_type() != "application/json":
                raise ValueError("Envie JSON.")
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict) or set(payload) - {
                "p",
                "c",
                "q",
                "t",
                "m",
                "goal",
            }:
                raise ValueError("Campos inválidos.")
            self.reply(200, simulate(**payload))
        except (ValueError, TypeError, OverflowError):
            self.reply(
                400,
                {
                    "error": "Premissas inválidas. Confira preço, custo, quantidade, comissão e meta."
                },
            )

    def list_directory(self, path):
        self.send_error(404, "Página indisponível")
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Margin Guardian AI — servidor local sem dependências"
    )
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--port", type=int, default=8501)
    args = parser.parse_args()
    for port in range(args.port, min(args.port + 20, 65536)):
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
            break
        except OSError:
            continue
    else:
        raise SystemExit(
            "Não há porta livre. Abra ABRIR_DEMONSTRACAO.html diretamente."
        )
    url = f"http://127.0.0.1:{server.server_port}"
    print(
        "Margin Guardian AI pronto: "
        + url
        + "\nSem instalação ou downloads. Ctrl+C encerra.",
        flush=True,
    )
    if not args.no_browser:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
