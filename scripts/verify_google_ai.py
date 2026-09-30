"""Verify live Google AI through the public dashboard without accepting secrets.

Requires a Gemini key configured in the hosting runtime. Checks first-visit
session initialization, visible model attribution, and downloaded evidence.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = 'https://chronos-coastal.jeevangeorge2030i.chatgpt.site'
out = Path('artifacts/google-ai')
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base, wait_until='domcontentloaded')
    expect(page.get_by_role('button', name='Run impact simulation')).to_be_enabled(timeout=30000)
    status = page.request.get(base + '/api/operations/status').json()
    assert status['gemini_configured']
    page.get_by_role('button', name='Prepare advisory', exact=True).click()
    with page.expect_response(lambda response: response.url.endswith('/api/operations/advisories'), timeout=60000) as response:
        page.get_by_role('button', name='Generate draft', exact=True).click()
    result = response.value.json()
    (out / 'advisory.json').write_text(json.dumps(result, indent=2))
    summary = {'http_status': response.value.status, 'engine_mode': result.get('engine_mode'), 'model': result.get('model'), 'notice': result.get('notice'), 'advisory_id': result.get('advisory_id')}
    print(json.dumps(summary), flush=True)
    assert response.value.status == 200
    assert result['engine_mode'] == 'gemini_live', 'The public draft fell back to rules.'
    expect(page.locator('.draft-document')).to_be_visible()
    expect(page.locator('.draft-meta')).to_contain_text(status['gemini_model'])
    page.screenshot(path=str(out / 'live-gemini.png'))
    with page.expect_download() as download:
        page.get_by_role('link', name='Download brief').click()
    download.value.save_as(str(out / 'live-gemini-advisory.txt'))
    assert 'Mode: gemini_live' in (out / 'live-gemini-advisory.txt').read_text()
    assert not errors, errors
    print('PASS: public Gemini generation, visible model label, and evidence export', flush=True)
    browser.close()
