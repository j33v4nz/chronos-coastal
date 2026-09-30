"""Exercise the visible public demo and save evidence for submission materials."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument("--base", default="https://chronos-coastal.jeevangeorge2030i.chatgpt.site")
parser.add_argument("--out", default="artifacts/browser")
args = parser.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)


def wait_run(page, action):
    with page.expect_response(lambda response: response.url.endswith('/api/operations/simulate') and response.request.method == 'POST') as result:
        action()
    response = result.value
    assert response.status == 200
    expect(page.get_by_role('button', name='Run impact simulation')).to_be_enabled()
    return response.json()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={"width": 1600, "height": 1000}, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(args.base, wait_until='domcontentloaded')
    expect(page.get_by_role('button', name='Run impact simulation')).to_be_enabled(timeout=20000)
    expect(page.locator('.coast-marker')).to_have_count(9)
    expect(page.locator('.route-card')).to_have_count(2)
    page.wait_for_timeout(2000)
    page.screenshot(path=str(out / 'desktop.png'), full_page=True)
    initial = page.locator('.metric-value').all_inner_texts()
    baseline = wait_run(page, lambda: page.get_by_role('button', name='Baseline', exact=True).click())
    severe = wait_run(page, lambda: page.get_by_role('button', name='Severe', exact=True).click())
    assert severe['hydro']['flooded_asset_count'] >= baseline['hydro']['flooded_asset_count']
    assert severe['grid']['tripped_substation_count'] >= baseline['grid']['tripped_substation_count']
    for cid in ['mumbai', 'odisha', 'kochi']:
        scenario = wait_run(page, lambda cid=cid: page.get_by_label('Select coastal corridor').select_option(cid))
        assert scenario['corridor_id'] == cid
        assert scenario['hours_to_landfall'] == 6
        assert page.locator('.coast-marker').count() == len(scenario['hydro']['assets'])
    assert scenario['grid']['hospitals'][0]['is_dry_but_outaged']
    page.screenshot(path=str(out / 'kochi.png'), full_page=True)
    page.locator('.hospital-card').first.click()
    expect(page.get_by_role('dialog')).to_be_visible()
    expect(page.get_by_text('This hospital is dry in the scenario', exact=False)).to_be_visible()
    page.screenshot(path=str(out / 'dependency.png'))
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).not_to_be_visible()
    page.locator('.resupply-panel').scroll_into_view_if_needed()
    page.screenshot(path=str(out / 'routes.png'))
    with page.expect_download() as exported:
        page.get_by_role('button', name='Export scenario').click()
    exported.value.save_as(str(out / 'scenario.json'))
    assert json.loads((out / 'scenario.json').read_text())['snapshot_id'] == scenario['snapshot_id']
    page.get_by_role('button', name='Prepare advisory', exact=True).click()
    page.get_by_role('button', name='Generate draft', exact=True).click()
    expect(page.locator('.draft-document')).to_be_visible(timeout=45000)
    page.screenshot(path=str(out / 'advisory.png'))
    with page.expect_download() as exported:
        page.get_by_role('link', name='Download brief').click()
    exported.value.save_as(str(out / 'advisory.txt'))
    assert scenario['snapshot_id'] in (out / 'advisory.txt').read_text()
    page.get_by_role('button', name='Send to test inbox', exact=True).click()
    expect(page.locator('.delivery-confirmation')).to_be_visible()
    expect(page.get_by_role('button', name='Receipt recorded')).to_be_disabled()
    page.screenshot(path=str(out / 'receipt.png'))
    page.get_by_label('Close dialog').click()
    page.get_by_role('button', name='Advisories', exact=True).click()
    expect(page.locator('.delivery-row').first).to_be_visible()
    count = page.locator('.delivery-row').count()
    page.reload()
    page.get_by_role('button', name='Advisories', exact=True).click()
    expect(page.locator('.delivery-row')).to_have_count(count)
    page.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Data sources', exact=True).click()
    expect(page.get_by_text('Model assumptions', exact=True)).to_be_visible()
    page.screenshot(path=str(out / 'sources.png'), full_page=True)
    assert errors == [], errors

    mobile = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = mobile.new_page()
    page.goto(args.base, wait_until='domcontentloaded')
    expect(page.locator('.route-card')).to_have_count(2, timeout=20000)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile layout overflows'
    page.screenshot(path=str(out / 'mobile.png'), full_page=True)
    page.get_by_role('button', name='Open navigation').click()
    page.get_by_role('button', name='Advisories', exact=True).click()
    expect(page.get_by_text('No advisories delivered yet')).to_be_visible()
    mobile.close()

    # Forecast and tile outages leave the independently runnable scenario usable.
    offline = browser.new_context(viewport={"width": 1440, "height": 900})
    page = offline.new_page()
    page.route('**/api/operations/weather/**', lambda route: route.abort())
    page.route('**/*.tile.openstreetmap.fr/**', lambda route: route.abort())
    page.goto(args.base, wait_until='domcontentloaded')
    expect(page.locator('.weather-source')).to_contain_text('Forecast unavailable', timeout=20000)
    wait_run(page, lambda: page.get_by_role('button', name='Severe', exact=True).click())
    expect(page.locator('.coast-marker')).to_have_count(9)
    page.screenshot(path=str(out / 'provider-outage.png'), full_page=True)
    browser.close()
    (out / 'verification.json').write_text(json.dumps({"base": args.base, "passed": True, "javascript_errors": errors, "initial_metrics": initial, "checks": ['desktop', 'mobile', 'four corridors', 'preset comparison', 'dry hospital cascade', 'route details', 'scenario export', 'draft generation', 'brief download', 'test dispatch', 'inbox persistence', 'session isolation', 'provider outage']}, indent=2) + '\n')
    print('PASS: public browser flow, mobile layout, evidence downloads, receipts, session isolation and provider outage.')
