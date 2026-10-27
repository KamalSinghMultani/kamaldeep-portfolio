"""Validate the built release, including HTTP delivery and the resume PDF."""

from functools import partial
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen

import pymupdf

ROOT = Path(__file__).resolve().parents[1] / "dist" / "site"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag in ("a", "img", "video", "script", "link"):
            url = attrs.get("href") or attrs.get("src")
            if url:
                self.urls.append(url)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def check_release(base_url):
    pages = {}
    for name in ("index.html", "quick.html"):
        markup = (ROOT / name).read_text(encoding="utf-8")
        parser = Links()
        parser.feed(markup)
        pages[name] = parser
        for url in parser.urls:
            ref = urlsplit(url)
            if ref.scheme or ref.netloc or url.startswith("#"):
                continue
            if ref.path:
                target = (ROOT / unquote(ref.path)).resolve()
                assert target.is_relative_to(ROOT.resolve()), (name, url)
                assert target.is_file(), (name, url)
        with urlopen(base_url + name, timeout=10) as response:
            assert response.status == 200
            assert response.read() == (ROOT / name).read_bytes()

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    quick = (ROOT / "quick.html").read_text(encoding="utf-8")
    assert 'id="alley-stage"' in index
    assert 'href="quick.html"' in index
    assert "<details" not in quick and 'id="alley-stage"' not in quick
    assert quick.count('id="workshop-canvas"') == 1
    assert 'id="quick-motion"' in quick and 'src="quick-workshop.mjs"' in quick
    assert 'data-quick-scene=' not in quick
    assert (ROOT / "media/robot-expressive.glb").read_bytes()[:4] == b"glTF"
    for dependency in ("quick-workshop.mjs", "quick-workshop-core.mjs", "vendor/GLTFLoader.js",
                       "vendor/BufferGeometryUtils.js", "vendor/three.module.min.js", "media/robot-license.txt"):
        with urlopen(base_url + dependency, timeout=10) as response:
            assert response.status == 200
    for anchor in ("projects", "experience", "skills", "education", "contact"):
        assert anchor in pages["quick.html"].ids

    with pymupdf.open(ROOT / "kamaldeep-singh-resume.pdf") as pdf:
        assert len(pdf) == 1
        assert len(pdf[0].get_links()) == 3
        for heading in ("EDUCATION", "EXPERIENCE", "SELECTED PROJECTS", "TECHNICAL SKILLS"):
            assert heading in pdf[0].get_text()
    with urlopen(base_url + "kamaldeep-singh-resume.pdf", timeout=10) as response:
        assert response.read(4) == b"%PDF"
    print("Release checks passed: local assets, HTTP pages/download, ungated sections, PDF text and links.")


def main():
    # An OS-assigned port avoids conflicts with existing local preview servers.
    handler = partial(QuietHandler, directory=str(ROOT))
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            check_release(f"http://127.0.0.1:{server.server_port}/")
        finally:
            server.shutdown()
            thread.join()


if __name__ == "__main__":
    main()
