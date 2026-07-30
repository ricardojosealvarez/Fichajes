from html import escape
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "MANUAL_USUARIO.md"
OUTPUT = ROOT / "MANUAL_USUARIO.html"


def render_inline(text: str) -> str:
    parts = re.split(r"(`[^`]+`)", text)
    return "".join(
        f"<code>{escape(part[1:-1])}</code>"
        if part.startswith("`") and part.endswith("`")
        else escape(part)
        for part in parts
    )


def markdown_to_html(source: str) -> str:
    blocks: list[str] = []
    paragraph: list[str] = []
    list_type: str | None = None
    list_items: list[str] = []

    def flush_paragraph() -> None:
        if paragraph:
            blocks.append(f"<p>{render_inline(' '.join(paragraph))}</p>")
            paragraph.clear()

    def flush_list() -> None:
        nonlocal list_type
        if list_type:
            items = "".join(f"<li>{render_inline(item)}</li>" for item in list_items)
            blocks.append(f"<{list_type}>{items}</{list_type}>")
            list_items.clear()
            list_type = None

    for raw_line in source.splitlines():
        line = raw_line.strip()
        if not line:
            flush_paragraph()
            flush_list()
            continue

        heading = re.match(r"^(#{1,3})\s+(.+)$", line)
        if heading:
            flush_paragraph()
            flush_list()
            level = len(heading.group(1))
            blocks.append(f"<h{level}>{render_inline(heading.group(2))}</h{level}>")
            continue

        unordered = re.match(r"^-\s+(.+)$", line)
        ordered = re.match(r"^\d+\.\s+(.+)$", line)
        if unordered or ordered:
            flush_paragraph()
            next_type = "ul" if unordered else "ol"
            if list_type and list_type != next_type:
                flush_list()
            list_type = next_type
            list_items.append((unordered or ordered).group(1))
            continue

        flush_list()
        paragraph.append(line.rstrip("  "))

    flush_paragraph()
    flush_list()
    return "\n".join(blocks)


content = markdown_to_html(SOURCE.read_text(encoding="utf-8"))
OUTPUT.write_text(
    f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Manual de usuario de Fichajes</title>
<style>
  :root {{
    color-scheme: dark;
    --bg: #161719;
    --surface: #1e2023;
    --border: #3d4148;
    --accent: #e8ff47;
    --accent2: #47c8ff;
    --text: #e8eaed;
    --muted: #a6adba;
  }}
  * {{ box-sizing: border-box; }}
  html {{ scroll-behavior: smooth; }}
  body {{
    max-width: 820px;
    margin: 0 auto;
    padding: 8px 28px 44px;
    background: var(--bg);
    color: var(--text);
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 15px;
    line-height: 1.65;
  }}
  h1, h2, h3 {{ color: var(--text); line-height: 1.25; }}
  h1 {{ margin: 10px 0 8px; font-size: clamp(26px, 5vw, 38px); }}
  h2 {{
    margin: 34px 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
    color: var(--accent);
    font-size: 22px;
  }}
  h3 {{ margin: 24px 0 8px; color: var(--accent2); font-size: 17px; }}
  p {{ margin: 0 0 13px; }}
  h1 + p, h1 + p + p {{ color: var(--muted); }}
  ul, ol {{ margin: 0 0 16px; padding-left: 24px; }}
  li {{ margin: 5px 0; }}
  code {{
    padding: 2px 5px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    color: var(--accent);
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 0.9em;
  }}
  @media (max-width: 600px) {{
    body {{ padding: 4px 18px 36px; font-size: 14px; }}
    h2 {{ margin-top: 28px; font-size: 20px; }}
  }}
</style>
</head>
<body>
{content}
<script>
  document.addEventListener("keydown", event => {{
    if (event.key === "Escape") {{
      event.preventDefault();
      window.parent.postMessage({{type: "close-manual"}}, "*");
    }}
  }});
</script>
</body>
</html>
""",
    encoding="utf-8",
)
