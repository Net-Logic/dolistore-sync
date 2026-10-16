import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BANNER_FILE, BANNER_URL, bannerDataUri, bannerPreflight, checkBannerImage } from '../src/layout/banner.mjs'

// No real fetch in the tests: every network answer is mocked
const png = readFileSync(BANNER_FILE)
const answer = (status, contentType, body = png) => async (url) => {
  assert.equal(url, BANNER_URL)
  return { status, contentType, body }
}
const down = async () => {
  throw new Error('getaddrinfo ENOTFOUND cdn.jsdelivr.net')
}

test('the banner asset is the 675x130 PNG of the layout', () => {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  assert.equal(png.readUInt32BE(16), 675)
  assert.equal(png.readUInt32BE(20), 130)
  assert.equal(bannerDataUri(), `data:image/png;base64,${png.toString('base64')}`)
})

test('image check: HTTP 200 with an image passes', async () => {
  assert.equal(await checkBannerImage({ fetch: answer(200, 'image/png') }), null)
  assert.equal(await bannerPreflight({ layout: 'netlogic', dryRun: false, fetch: answer(200, 'image/png') }), null)
})

test('image check: a 404, an HTML page and a network error are problems', async () => {
  assert.equal(await checkBannerImage({ fetch: answer(404, 'text/plain', Buffer.from('Not found')) }), 'HTTP 404')
  assert.equal(await checkBannerImage({ fetch: answer(200, 'text/html; charset=utf-8', Buffer.from('<html>')) }), 'not an image (content type text/html; charset=utf-8)')
  assert.match(await checkBannerImage({ fetch: answer(200, 'image/png', Buffer.from('<html><body>error</body></html>')) }), /^not an image \(content type image\/png, but the body/)
  assert.equal(await checkBannerImage({ fetch: down }), 'could not fetch it: getaddrinfo ENOTFOUND cdn.jsdelivr.net')
})

test('a real submit is refused when the image is not served', async () => {
  for (const [fetch, reason] of [[answer(404, 'text/plain'), /\(HTTP 404\)/], [answer(200, 'text/html'), /not an image/], [down, /could not fetch it/]]) {
    await assert.rejects(bannerPreflight({ layout: 'netlogic', dryRun: false, fetch }), (error) => {
      assert.match(error.message, /^Real submit refused: the Net Logic banner image of the layout is not available at https:\/\/cdn\.jsdelivr\.net\/gh\/Net-Logic\/dolistore-sync@v0\.5\.0\/assets\/netlogic-banner\.png /)
      assert.match(error.message, reason)
      return true
    })
  }
})

test('a dry run gets the problem back, to report it as an error once done', async () => {
  for (const fetch of [answer(404, 'text/plain'), answer(200, 'text/html'), down]) {
    assert.match(await bannerPreflight({ layout: 'netlogic', dryRun: true, fetch }), /^the Net Logic banner image of the layout is not available at /)
  }
})

test('no layout, no image check', async () => {
  const never = async () => assert.fail('fetched')
  assert.equal(await bannerPreflight({ layout: undefined, dryRun: false, fetch: never }), null)
})
