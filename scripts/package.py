"""Validate and package the directly loaded Manifest V3 extension (no bundler)."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import hashlib
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'extension'


def asset(name):
    path = (SOURCE / name).resolve()
    if not path.is_relative_to(SOURCE.resolve()) or not path.is_file():
        raise ValueError(f'Missing or unsafe extension asset: {name}')
    return path


class References(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key not in ('src', 'href') or not value:
                continue
            url = urlsplit(value)
            if not url.scheme and not url.netloc and url.path:
                asset(url.path)


def main():
    manifest = json.loads(asset('manifest.json').read_text(encoding='utf-8'))
    if manifest.get('manifest_version') != 3 or not manifest.get('name') or not manifest.get('version'):
        raise ValueError('Expected a named and versioned Manifest V3 extension')
    asset(manifest['background']['service_worker'])
    asset(manifest['action']['default_popup'])
    for entry in manifest.get('content_scripts', []):
        for name in entry.get('js', []) + entry.get('css', []):
            asset(name)
    files = sorted(p for p in SOURCE.iterdir() if p.suffix in {'.html', '.js', '.css'} or p.name == 'manifest.json')
    for path in files:
        if path.suffix == '.js':
            subprocess.run(['node', '--check', str(path)], check=True)
        elif path.suffix == '.html':
            References().feed(path.read_text(encoding='utf-8'))
    dist = ROOT / 'dist'
    dist.mkdir(exist_ok=True)
    archive = dist / f'MrG-AI-Chrome-{manifest["version"]}.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as package:
        for path in files:
            package.write(path, path.relative_to(SOURCE).as_posix())
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (dist / 'SHA256SUMS.txt').write_text(f'{digest}  {archive.name}\n', encoding='utf-8')
    print(f'Validated and packaged {len(files)} extension files: {archive.name}')


if __name__ == '__main__':
    main()
