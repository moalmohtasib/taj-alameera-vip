#!/usr/bin/env python3
"""Put an HTML file onto the macOS clipboard as REAL HTML (public.html),
so Salla's Quill rich-text editor parses the tags into formatting instead of
escaping them to visible <p> text.

Usage:  python3 copy-html.py 01-about-من-نحن.html
"""
import sys, os
from AppKit import NSPasteboard, NSPasteboardTypeHTML, NSPasteboardTypeString

def main():
    if len(sys.argv) < 2:
        print("usage: python3 copy-html.py <file.html>"); sys.exit(1)
    path = sys.argv[1]
    if not os.path.exists(path):
        print("no such file:", path); sys.exit(1)
    with open(path, encoding="utf-8") as f:
        html = f.read()
    pb = NSPasteboard.generalPasteboard()
    pb.clearContents()
    # Write BOTH: HTML (Quill reads this) + plain fallback.
    pb.setString_forType_(html, NSPasteboardTypeHTML)
    pb.setString_forType_(html, NSPasteboardTypeString)
    print("copied as HTML:", path, "(%d chars)" % len(html))

if __name__ == "__main__":
    main()
