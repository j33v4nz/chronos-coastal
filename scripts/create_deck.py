"""Build a compact 16:9 submission PDF from verified prototype evidence."""
import json
import shutil
from pathlib import Path

from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'submission'
EVIDENCE = ROOT / 'artifacts/browser'
WIDTH, HEIGHT = 1280, 720
INK, MUTED, GREEN, LIME, PAPER = map(HexColor, ['#203b3a', '#6d8175', '#247c69', '#d9ebc8', '#f6f7f3'])
FONT_DIR = Path('/usr/share/fonts/noto')
pdfmetrics.registerFont(TTFont('Noto', str(FONT_DIR / 'NotoSans-Regular.ttf')))
pdfmetrics.registerFont(TTFont('NotoBold', str(FONT_DIR / 'NotoSans-Bold.ttf')))
OUT.mkdir(exist_ok=True)
PDF = OUT / 'chronos-coastal-deck.pdf'
c = canvas.Canvas(str(PDF), pagesize=(WIDTH, HEIGHT), pageCompression=1, invariant=1)
c.setTitle('Chronos Coastal — Connected coastal preparedness')
c.setAuthor('Chronos Coastal')
c.setSubject('Working prototype, evidence flow, architecture and validation boundaries')
PAGE = 0


def text(value, x, top, size=18, color=INK, bold=False, width=1100, leading=None):
    font = 'NotoBold' if bold else 'Noto'
    c.setFont(font, size)
    c.setFillColor(color)
    lines = []
    for paragraph in value.split('\n'):
        lines += simpleSplit(paragraph, font, size, width) or ['']
    leading = leading or size * 1.5
    for line in lines:
        c.drawString(x, HEIGHT - top - size, line)
        top += leading
    return top


def box(x, top, width, height, fill=PAPER, stroke=None, radius=12):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.roundRect(x, HEIGHT - top - height, width, height, radius, fill=1, stroke=bool(stroke))


def start(eyebrow, title, subtitle=None, dark=False):
    global PAGE
    PAGE += 1
    c.setFillColor(INK if dark else PAPER)
    c.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    text(eyebrow.upper(), 64, 42, 12, LIME if dark else GREEN, bold=True)
    text(title, 64, 78, 40, PAPER if dark else INK, bold=True, width=1152, leading=50)
    if subtitle:
        text(subtitle, 64, 141, 17, LIME if dark else MUTED)
    c.setStrokeColor(HexColor('#496557') if dark else HexColor('#dce5d8'))
    c.line(64, 49, WIDTH - 64, 49)
    text('CHRONOS / COASTAL  ·  PREPAREDNESS PROTOTYPE', 64, 685, 10, LIME if dark else MUTED)
    text(f'{PAGE:02d}', WIDTH - 88, 685, 10, LIME if dark else MUTED)


def screenshot(name, x, top, width, height, source_crop=None):
    # Crop in PDF coordinates; preserve the original captured image bytes.
    image = ImageReader(str(EVIDENCE / name))
    iw, ih = image.getSize()
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, HEIGHT - top - height, width, height)
    c.clipPath(clip, stroke=0)
    if source_crop:
        sx, sy, sw, sh = source_crop
        scale = min(width / sw, height / sh)
        c.drawImage(image, x - sx * scale, HEIGHT - top - height - (ih - sy - sh) * scale, width=iw * scale, height=ih * scale)
    else:
        scale = width / iw
        c.drawImage(image, x, HEIGHT - top - ih * scale, width=width, height=ih * scale)
    c.restoreState()
    c.setStrokeColor(HexColor('#d8e2d4'))
    c.rect(x, HEIGHT - top - height, width, height, fill=0, stroke=1)


state = json.loads((EVIDENCE / 'scenario.json').read_text())
hospital = next(h for h in state['grid']['hospitals'] if h['is_dry_but_outaged'])
routes = state['logistics']['routes']
public = 'https://chronos-coastal.jeevangeorge2030i.chatgpt.site'

start('Working public prototype', 'A dry hospital can still lose power.', dark=True)
text('See the dependencies.\nAct before access closes.', 64, 222, 35, PAPER, True, width=485, leading=52)
text('A coastal preparedness workspace connecting flood scenarios to electricity, critical care, and resupply access.', 64, 354, 20, LIME, width=475, leading=32)
box(64, 493, 448, 56, GREEN)
text('4 corridors  ·  connected service impacts', 82, 508, 17, PAPER, True)
screenshot('desktop.png', 564, 219, 652, 354, source_crop=(0, 0, 1600, 870))
text('A working demonstration with explicit model assumptions.', 564, 590, 14, LIME, width=650)
c.linkURL(public, (64, 80, 1216, 620), relative=0, thickness=0)
c.showPage()

start('The problem', 'Flood exposure is only one part of the risk.', 'Essential services depend on assets beyond their own footprint.')
items = [('01', 'Compound water', 'Surge and river inflow interact in the screening model.'), ('02', 'Power dependency', 'A low-lying upstream substation can interrupt supply.'), ('03', 'Dry hospital', 'A facility can remain dry while its grid connection fails.'), ('04', 'Backup reserve', 'Generator fuel becomes a service-continuity dependency.'), ('05', 'Resupply access', 'Choke-point depth and travel time limit delivery windows.')]
for i, (number, title, detail) in enumerate(items):
    x = 64 + i * 235
    box(x, 239, 212, 258, HexColor('#ffffff'), HexColor('#dce5d8'))
    text(number, x + 19, 258, 37, GREEN, True)
    text(title, x + 19, 322, 18, INK, True, width=178)
    text(detail, x + 19, 378, 15, MUTED, width=172, leading=24)
    if i < 4:
        text('→', x + 215, 343, 21, GREEN)
box(64, 550, 1152, 74, LIME)
text('Our question: which service fails next, and what response window remains?', 88, 570, 22, INK, True)
c.showPage()

start('The solution', 'From “what if” to a reviewable action.', 'One workspace connects scenario controls, service impacts, and evidence-linked advisories.')
screenshot('desktop.png', 64, 203, 792, 403, source_crop=(0, 0, 1600, 814))
for top, title, detail in [(218, 'Explore', 'Choose a corridor. Compare baseline, cyclone, severe, or custom inputs.'), (348, 'Trace', 'Inspect power links, hospital backup reserves, and resupply windows.'), (478, 'Prepare', 'Generate a draft, download a brief, and verify test delivery.')]:
    text(title, 899, top, 24, GREEN, True)
    text(detail, 899, top + 43, 16, MUTED, width=299, leading=26)
c.showPage()

start('Live prototype evidence · Kochi', 'Dry ground. Interrupted supply.', f"Selected scenario: {state['ocean_surge_m']:.2f} m surge · {state['river_inflow_m3s']:.0f} m³/s river inflow · {state['hours_to_landfall']:.0f} h to peak")
text(hospital['name'], 64, 225, 24, GREEN, True, width=515, leading=34)
for top, value, label in [(327, f"{hospital['water_depth_m']:.2f} m", 'Estimated depth at hospital'), (413, f"{hospital['runtime_hours_remaining']} h", 'Modeled generator reserve'), (499, str(hospital['icu_patients']), 'Demonstration ICU-bed capacity')]:
    text(value, 64, top, 36, INK, True)
    text(label, 249, top + 13, 16, MUTED, width=298)
screenshot('dependency.png', 730, 211, 400, 421, source_crop=(515, 201, 570, 600))
text('Demonstration assumptions; this is not a live facility-status report.', 64, 614, 13, MUTED, width=550)
c.showPage()

start('Logistics that distinguish cargo', 'Protect the resupply window.', 'Departure deadline = modeled clearance breach time − route travel allowance.')
for i, route in enumerate(routes):
    x = 64 + i * 585
    box(x, 216, 567, 347, HexColor('#ffffff'), HexColor('#dce5d8'))
    title = 'Medical oxygen' if route['cargo_type'] == 'LIQUID_MEDICAL_OXYGEN' else 'Diesel fuel'
    text(title, x + 24, 242, 26, GREEN, True)
    deadline = route['departure_window_remaining_min']
    text('Open through peak' if deadline is None else f'{deadline:g} min', x + 24, 308, 40, INK, True)
    text('No predicted breach in horizon' if deadline is None else 'Estimated latest departure from run start', x + 24, 365, 16, MUTED, width=500)
    text(route['choke_point_name'], x + 24, 414, 17, INK, True, width=500, leading=26)
    text(f"Assumed clearance: {route['critical_clearance_depth_m']:.2f} m\nTransit allowance: {route['nominal_travel_time_min']:g} min", x + 24, 487, 16, MUTED, width=500, leading=26)
text('These are screening estimates, not live navigation or dispatch authorization.', 64, 599, 17, MUTED)
c.showPage()

start('Evidence → review → delivery', 'A clear message, with a verifiable trail.', 'Every draft records its scenario, actual engine mode, and evidence limitations.')
screenshot('advisory.png', 64, 211, 678, 423, source_crop=(390, 70, 820, 512))
for top, title, detail in [(220, 'Grounded draft', 'Recommendations are linked to the run identifier. Offline drafting is explicitly labeled.'), (352, 'Immutable evidence', 'Checksummed drafts and delivery receipts persist independently. Repeated requests share one receipt.'), (500, 'Reviewed test delivery', 'Download the brief. Deliver to the in-app inbox. Another browser session has a separate inbox.')]:
    text(title, 789, top, 22, GREEN, True, width=421)
    text(detail, 789, top + 40, 16, MUTED, width=412, leading=27)
c.showPage()

start('Architecture and provider modes', 'A public prototype. A reproducible backend.', 'The repository includes the full Python server and the hosted runtime adapter.')
columns = [(64, 'Browser workspace', ['React + Vite + Leaflet', 'Responsive dashboard', 'Scenario sharing and JSON export', 'Advisory review and brief download']), (456, 'Hosted adapter', ['Public Sites deployment', 'D1 records scoped by session', 'Hydro / grid / logistics parity', 'Test inbox only on the public demo']), (848, 'Python backend', ['FastAPI + NetworkX + NumPy', 'SQLite persistence + Docker', 'Diagnostic APIs + event streaming', 'Optional authenticated Earth Engine'])]
for x, title, lines in columns:
    box(x, 224, 368, 295, HexColor('#ffffff'), HexColor('#dce5d8'))
    text(title, x + 22, 248, 23, GREEN, True, width=322)
    for i, line in enumerate(lines):
        text(line, x + 22, 314 + i * 43, 15, INK, width=322)
box(64, 552, 1152, 78, LIME)
text('Providers stay explicit', 87, 569, 18, INK, True)
text('Open-Meteo forecast context · optional Gemini drafting · satellite observations require configuration', 87, 599, 15, INK, width=1100)
c.showPage()

start('Verification and next step', 'Tested behavior. Honest scope.', 'Engineering checks establish repeatable prototype behavior, not field accuracy.')
stats = [('58', 'Backend tests passed'), ('6', 'Hosted API tests passed'), ('100', 'Cross-runtime parity cases'), ('4', 'Sample coastal corridors')]
for i, (number, label) in enumerate(stats):
    x = 64 + i * 293
    box(x, 218, 272, 143, HexColor('#ffffff'), HexColor('#dce5d8'))
    text(number, x + 22, 239, 45, GREEN, True)
    text(label, x + 22, 309, 14, MUTED, width=230)
text('Also verified', 64, 400, 23, GREEN, True)
text('Public desktop and mobile flow; downloads and receipts; session isolation; provider-outage behavior; Docker build and container runtime in GitHub Actions.', 64, 447, 18, INK, width=520, leading=30)
text('Next: local partner validation', 681, 400, 23, GREEN, True)
text('Replace sample topology with maintained asset data. Calibrate hydraulic assumptions. Validate radar candidates and road conditions with local partners.', 681, 447, 18, INK, width=515, leading=30)
text('No independent field validation, official warnings, confirmed medical status, or financial transfers are claimed.', 64, 614, 14, MUTED)
c.showPage()

start('Explore the working prototype', 'Earlier action starts with clarity.', dark=True)
text('Built for communities.\nDesigned for connected preparedness.', 64, 222, 35, PAPER, True, width=815, leading=50)
text('Public prototype', 64, 397, 16, LIME, True)
text(public.replace('https://', ''), 64, 435, 21, PAPER, width=910)
c.linkURL(public, (64, 245, 1010, 295), relative=0, thickness=0)
text('Repository + submission release', 64, 503, 16, LIME, True)
text('github.com/j33v4nz/ggl', 64, 541, 24, PAPER)
c.linkURL('https://github.com/j33v4nz/ggl', (64, 134, 750, 183), relative=0, thickness=0)
qr = QrCodeWidget(public)
x1, y1, x2, y2 = qr.getBounds()
drawing = Drawing(190, 190, transform=[190 / (x2 - x1), 0, 0, 190 / (y2 - y1), 0, 0])
drawing.add(qr)
box(993, 356, 223, 223, HexColor('#ffffff'))
renderPDF.draw(drawing, c, 1009, HEIGHT - 562)
text('SCAN TO EXPLORE', 1006, 598, 12, LIME, True)
c.showPage()
c.save()
assert PDF.stat().st_size < 5_000_000, f'Deck exceeds 5 MB: {PDF.stat().st_size}'
public_dir = ROOT / 'frontend/public'
public_dir.mkdir(exist_ok=True)
shutil.copyfile(PDF, public_dir / 'presentation.pdf')
print(f'PDF ready: {PDF}; {PAGE} slides; {PDF.stat().st_size:,} bytes (< 5 MB).')
