"""Record a narrated demo of the public prototype with Chromium and FFmpeg.

Developer tools: playwright, edge-tts, ffmpeg, Chromium. Generated narration is
sent to the voice service; only the public pitch text is submitted.
"""
import argparse
import asyncio
import json
import subprocess
import time
from pathlib import Path

import edge_tts
from playwright.sync_api import sync_playwright, expect

BASE = 'https://chronos-coastal.jeevangeorge2030i.chatgpt.site'
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'submission'
TEMP = ROOT / 'artifacts' / 'demo'
SCENES = [
    ('The hidden dependency', 'A hospital can stay dry and still lose power. Chronos Coastal helps preparedness teams see the hidden dependencies between coastal flooding, electricity, critical care, and the time left to resupply.', 'A dry hospital can still lose power.'),
    ('01 · Explore the impact', 'This is the working public prototype. We begin in Chennai, with four coastal corridors available. The summary connects exposed infrastructure to power interruptions, critical care capacity, and the earliest resupply window. Every result is labeled as a scenario estimate.', 'One scenario. A connected view of essential services.'),
    ('02 · Compare scenarios', 'Choose baseline conditions, then increase the stress. The simulation recalculates asset depths, upstream power failures, and route windows. Rainfall runoff is an explicit optional assumption. The comparison helps teams ask better questions before conditions become critical.', 'Change the conditions. Trace the consequences.'),
    ('03 · Follow the dependency', 'Now switch to Kochi. This hospital is dry in the modeled scenario, yet its upstream electricity supply is interrupted. Open the asset detail to see the distinction, along with backup generator reserves. A flood map alone would miss this service dependency.', 'Dry ground does not guarantee power continuity.'),
    ('04 · Protect access', 'Oxygen and diesel deliveries have different assumed clearance limits and travel times. These route cards show the estimated latest departure, the choke point, and the peak depth. An open route has no predicted breach within the modeled horizon.', 'Separate oxygen and diesel resupply windows.'),
    ('05 · Prepare a clear advisory', 'Prepare an advisory from this exact scenario. The draft includes the run identifier and recommended actions. Without an API key, this demo uses clearly labeled rule-based drafting and synthetic inspection. The backend can also use configured Gemini inference.', 'Evidence → reviewable draft → action.'),
    ('06 · Verify delivery', 'Download the brief and send the reviewed draft to the in-app test inbox. A receipt confirms what happened. This does not contact an authority. The draft and receipt persist, and another browser session has its own inbox.', 'A real demo receipt. A clearly labeled test inbox.'),
    ('07 · Know the evidence', 'The data sources view distinguishes live weather forecasts, optional satellite observations, and model assumptions. No unavailable observations are invented. Hydrology, grid, and logistics outputs are checked against the Python engine across one hundred scenarios.', 'Forecast, observation, and assumption stay distinct.'),
    ('Earlier action starts with clarity', 'Chronos Coastal is a working preparedness prototype, with four corridors, a public demo, a reproducible repository, and tested evidence flows. The next step is local data calibration and partner validation. Explore the prototype using the link on screen.', 'Built for communities. Designed for earlier action.'),
]


def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(path)], text=True))


async def narrate():
    TEMP.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(3)
    async def one(index, scene):
        path = TEMP / f'voice-{index:02d}.mp3'
        if path.exists() and path.stat().st_size > 1000:
            return
        async with semaphore:
            await edge_tts.Communicate(scene[1], voice='en-IN-NeerjaNeural', rate='+12%').save(str(path))
    await asyncio.gather(*(one(i, scene) for i, scene in enumerate(SCENES)))
    OUT.mkdir(exist_ok=True)
    (OUT / 'demo-narration.md').write_text('# Chronos Coastal demo narration\n\n' + '\n\n'.join(f'## {title}\n\n{text}' for title, text, _ in SCENES) + '\n')
    print('Narration generated:', round(sum(duration(TEMP / f'voice-{i:02d}.mp3') for i in range(len(SCENES))), 1), 'seconds', flush=True)


def card(closing=False):
    return f'''<!doctype html><html><head><style>body{{margin:0;background:#f6f7f3;color:#203b3a;font-family:Arial,sans-serif;width:1920px;height:1080px;overflow:hidden}}.content{{margin:110px 135px}}.brand{{font-size:28px;letter-spacing:5px;color:#427d64}}h1{{font-size:110px;line-height:1.08;letter-spacing:-5px;margin:100px 0 35px;max-width:1550px}}p{{font-size:31px;line-height:1.5;color:#62786b;max-width:1250px}}.pill{{border:1px solid #cadcc5;border-radius:30px;padding:15px 25px;display:inline-block;font-size:21px;color:#4d765c;margin-top:25px}}.link{{font-size:26px;letter-spacing:0;color:#247c69;margin-top:55px}}.line{{position:absolute;right:-160px;top:100px;width:650px;height:650px;border:2px solid #dce7d4;border-radius:50%;z-index:-1;box-shadow:0 0 0 70px #edf2e8,0 0 0 140px #f1f5ed}}footer{{position:absolute;left:135px;bottom:55px;color:#78916f;font-size:20px;letter-spacing:2px}}</style></head><body><div class="line"></div><div class="content"><div class="brand">CHRONOS / COASTAL</div><h1>{'Earlier action<br>starts with clarity.' if closing else 'A dry hospital.<br>A hidden power risk.'}</h1><p>{'Four corridors. Connected infrastructure. Evidence-linked advisories.' if closing else 'A preparedness workspace connecting coastal flooding to power, critical care, and resupply access.'}</p><div class="pill">{'58 backend tests · 100 parity cases · verified public browser flow' if closing else 'WORKING PUBLIC PROTOTYPE · SCREENING MODEL'}</div><div class="link">{BASE.replace('https://','')}</div></div><footer>{'github.com/j33v4nz/ggl' if closing else 'SCENARIO → DEPENDENCIES → EARLY ACTION'}</footer></body></html>'''


def record():
    OUT.mkdir(exist_ok=True)
    TEMP.mkdir(parents=True, exist_ok=True)
    timeline = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1920, 'height': 1080}, record_video_dir=str(TEMP), record_video_size={'width': 1920, 'height': 1080}, accept_downloads=True)
        page = context.new_page()
        start = time.monotonic()
        page.set_content(card())

        def caption(index):
            page.evaluate('''([title, text]) => {
              document.getElementById('demo-caption')?.remove();
              const box = document.createElement('div'); box.id = 'demo-caption';
              Object.assign(box.style, {position:'fixed',left:'110px',right:'35px',bottom:'20px',zIndex:'2147483647',background:'#173b36f2',border:'1px solid #527b63',borderRadius:'12px',padding:'20px 27px',color:'#eef5e7',fontFamily:'Arial,sans-serif',pointerEvents:'none',boxShadow:'0 8px 35px #173b3626'});
              const label=document.createElement('div'); label.textContent=title.toUpperCase(); Object.assign(label.style,{fontSize:'12px',letterSpacing:'2px',color:'#b7d79f',marginBottom:'8px'});
              const line=document.createElement('div'); line.textContent=text; Object.assign(line.style,{fontSize:'25px',lineHeight:'1.35'});
              box.append(label,line);document.body.append(box);
            }''', [SCENES[index][0], SCENES[index][2]])

        def scene(index, action):
            scene_start = time.monotonic() - start
            timeline.append({'index': index, 'start': scene_start, 'title': SCENES[index][0]})
            action()
            elapsed = time.monotonic() - start - scene_start
            hold = max(1.5, duration(TEMP / f'voice-{index:02d}.mp3') + 2 - elapsed)
            page.wait_for_timeout(hold * 1000)
            print('Recorded:', SCENES[index][0], flush=True)

        scene(0, lambda: None)
        def overview():
            page.goto(BASE, wait_until='domcontentloaded')
            expect(page.get_by_role('button', name='Run impact simulation')).to_be_enabled(timeout=20000)
            page.wait_for_timeout(1200)
            caption(1)
        scene(1, overview)
        def comparison():
            caption(2)
            page.get_by_role('button', name='Baseline', exact=True).click()
            expect(page.get_by_role('button', name='Run impact simulation')).to_be_enabled()
            page.wait_for_timeout(4000)
            page.get_by_role('button', name='Severe', exact=True).click()
            expect(page.get_by_role('button', name='Run impact simulation')).to_be_enabled()
            page.wait_for_timeout(3000)
            page.get_by_label('Include rainfall runoff').check()
            page.get_by_role('button', name='Run impact simulation').click()
            expect(page.get_by_role('button', name='Run impact simulation')).to_be_enabled()
        scene(2, comparison)
        def hospital():
            caption(3)
            page.get_by_label('Include rainfall runoff').uncheck()
            page.get_by_label('Select coastal corridor').select_option('kochi')
            expect(page.get_by_role('button', name='Run impact simulation')).to_be_enabled()
            page.wait_for_timeout(2200)
            page.locator('.hospital-card').first.scroll_into_view_if_needed()
            page.wait_for_timeout(3000)
            page.locator('.hospital-card').first.click()
            expect(page.get_by_role('dialog')).to_be_visible()
        scene(3, hospital)
        def routes():
            page.get_by_label('Close dialog').click()
            caption(4)
            page.locator('.resupply-panel').scroll_into_view_if_needed()
            expect(page.locator('.route-card')).to_have_count(2)
        scene(4, routes)
        def advisory():
            page.get_by_role('button', name='Prepare advisory', exact=True).click()
            caption(5)
            page.wait_for_timeout(2000)
            page.get_by_role('button', name='Generate draft', exact=True).click()
            expect(page.locator('.draft-document')).to_be_visible(timeout=45000)
            page.locator('.draft-document').screenshot(path=str(TEMP / 'draft.png'))
        scene(5, advisory)
        def receipt():
            caption(6)
            with page.expect_download() as downloaded:
                page.get_by_role('link', name='Download brief').click()
            downloaded.value.save_as(str(OUT / 'sample-advisory.txt'))
            page.wait_for_timeout(2000)
            page.get_by_role('button', name='Send to test inbox', exact=True).click()
            expect(page.locator('.delivery-confirmation')).to_be_visible()
            page.locator('.delivery-confirmation').scroll_into_view_if_needed()
            page.wait_for_timeout(3500)
            page.get_by_label('Close dialog').click()
            page.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Advisories', exact=True).click()
            page.evaluate('window.scrollTo(0,0)')
        scene(6, receipt)
        def sources():
            caption(7)
            page.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Data sources', exact=True).click()
            page.evaluate('window.scrollTo(0,0)')
            expect(page.get_by_text('Model assumptions', exact=True)).to_be_visible()
        scene(7, sources)
        scene(8, lambda: page.set_content(card(closing=True)))
        total = time.monotonic() - start
        video = page.video
        context.close()
        source = Path(video.path())
        browser.close()
    (TEMP / 'timeline.json').write_text(json.dumps({'scenes': timeline, 'duration': total, 'raw_video': str(source)}, indent=2))
    print('Raw recording complete:', source, flush=True)


def render():
    data = json.loads((TEMP / 'timeline.json').read_text())
    inputs = ['ffmpeg', '-y', '-i', data['raw_video']]
    filters = []
    for scene in data['scenes']:
        i = scene['index']
        inputs += ['-i', str(TEMP / f'voice-{i:02d}.mp3')]
        delay = int((scene['start'] + .7) * 1000)
        filters.append(f'[{i+1}:a]adelay={delay}|{delay},volume=1.05[a{i}]')
    labels = ''.join(f'[a{i}]' for i in range(len(SCENES)))
    filters.append(f'{labels}amix=inputs={len(SCENES)}:duration=longest:normalize=0,apad[audio]')
    inputs += ['-filter_complex', ';'.join(filters), '-map', '0:v', '-map', '[audio]', '-t', str(data['duration']), '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', str(OUT / 'chronos-coastal-demo.mp4')]
    subprocess.run(inputs, check=True)
    print('Final video:', OUT / 'chronos-coastal-demo.mp4', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('step', choices=['narrate', 'record', 'render'])
    step = parser.parse_args().step
    if step == 'narrate': asyncio.run(narrate())
    elif step == 'record': record()
    else: render()
