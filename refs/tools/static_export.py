"""Turn the prerendered TanStack build into a JS-light static site for nginx.

The VeriTeknik MCP deploy tool only takes small plain-text files, so the page
HTML goes to the server while CSS, JS and all binary assets are served from
jsDelivr (pinned to a git commit of this public repo).

usage:
  python static_export.py prepare <dist/client> <deploy dir> <assets-base>
      copy the built CSS into deploy/ with font URLs pointed at <assets-base>
  python static_export.py html <dist/client> <out dir> <assets-base> <deploy-base> <site-url>
      write index.html and links/index.html (React runtime swapped for deploy/app.js), robots.txt,
      sitemap.xml and site.webmanifest into <out dir>
"""
import json
import os
import re
import sys


def built_css(dist):
    page = open(os.path.join(dist, "index.html"), encoding="utf-8").read()
    files = sorted(set(re.findall(r'href="(/assets/styles-[^"/]+\.css)"', page)))
    if len(files) != 1:
        sys.exit(f"expected one referenced stylesheet, found {files}")
    return os.path.join(dist, files[0].lstrip("/"))


def prepare(dist, deploy, assets_base):
    css = open(built_css(dist), encoding="utf-8").read()
    css = re.sub(r"url\((['\"]?)/fonts/", rf"url(\1{assets_base}/fonts/", css)
    if "url(/fonts/" in css:
        sys.exit("unrewritten font url left in CSS")
    os.makedirs(deploy, exist_ok=True)
    open(os.path.join(deploy, "styles.css"), "w", encoding="utf-8", newline="\n").write(css)
    print("wrote", os.path.join(deploy, "styles.css"), len(css), "bytes")


def export_page(source, destination, deploy_base):
    page = open(source, encoding="utf-8").read()
    # Drop the React/TanStack runtime: module preloads and every inline/module script.
    page = re.sub(r'<link rel="modulepreload"[^>]*/>', "", page)
    page = re.sub(r"<script\b[^>]*>.*?</script>", "", page, flags=re.S)
    page = page.replace("<!--$-->", "").replace("<!--/$-->", "")
    page = re.sub(r'<link rel="stylesheet" href="/assets/styles-[^"]+\.css"[^>]*/>',
                  f'<link rel="stylesheet" href="{deploy_base}/styles.css"/>', page)
    page = page.replace("</body>", f'<script src="{deploy_base}/app.js" defer></script></body>')
    if "\x00" in page or "/assets/index-" in page or "/assets/styles-" in page:
        sys.exit("leftover runtime reference or NUL in HTML")
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    open(destination, "w", encoding="utf-8", newline="\n").write(page)


def html(dist, out, assets_base, deploy_base, site_url):
    pages = ("index.html", os.path.join("links", "index.html"))
    for path in pages:
        if not os.path.isfile(os.path.join(dist, path)):
            sys.exit(f"missing prerendered page: {path}")
    for path in pages:
        export_page(os.path.join(dist, path), os.path.join(out, path), deploy_base)

    open(os.path.join(out, "robots.txt"), "w", encoding="utf-8", newline="\n").write(
        f"User-agent: *\nAllow: /\n\nSitemap: {site_url}/sitemap.xml\n")
    open(os.path.join(out, "sitemap.xml"), "w", encoding="utf-8", newline="\n").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"  <url><loc>{site_url}/</loc></url>\n"
        f"  <url><loc>{site_url}/links</loc></url>\n</urlset>\n")
    manifest = json.load(open(os.path.join(dist, "site.webmanifest"), encoding="utf-8"))
    manifest["background_color"] = manifest["theme_color"] = "#FFFFFF"
    for icon in manifest.get("icons", []):
        icon["src"] = assets_base + icon["src"]
    open(os.path.join(out, "site.webmanifest"), "w", encoding="utf-8", newline="\n").write(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    for root, _, files in os.walk(out):
        for name in sorted(files):
            path = os.path.join(root, name)
            print(os.path.relpath(path, out), os.path.getsize(path), "bytes")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "prepare" and len(sys.argv) == 5:
        prepare(*sys.argv[2:])
    elif mode == "html" and len(sys.argv) == 7:
        html(*sys.argv[2:])
    else:
        sys.exit(__doc__)
