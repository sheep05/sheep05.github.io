# Tests for sign-in and photo publishing

`github-auth.test.mjs` verifies owner sign-in and session protection; `integration.mjs` checks uploads, album edits, publication, and private-image access against a local server. `prepare-local-auth.mjs` creates a local-only sign-in fixture; setup commands are in `../FULL-APP.md`.


## Entrance and slow-connection regressions

Run `node --experimental-strip-types --test tests/collection-loading.test.mjs` for API deadlines, cancellation, retry, URL normalization, and anonymous public access.

For browser checks, build the public site with the backend URL set as described in `../WEBSITE-GUIDE.md`, then run `node tests/entrance-preview.mjs` and open `http://127.0.0.1:5180/`. This loopback-only server substitutes a local photo-service fixture; it never signs in or changes real photographs. It serves `outputs/github-pages/` by default (`TEST_BUILD=docs` tests the committed build).

Set a case with `mkdir -p work` followed by `printf CASE > work/entrance-mode`, then reload the browser:

| CASE | Expected result |
| --- | --- |
| `hang` | The room appears without waiting for photos. The collection shows a retry after eight seconds. |
| `error` | The room still opens; the collection offers retry after HTTP 503. |
| `healthy` | Three labelled sample albums appear. Switch to this case after an error and click **Retry photographs** without reloading: the albums return. |
| `slow-room` | The model is delayed 20 seconds. Click **Walk over to the desk** immediately: it says **Preparing your walk**, then plays the 9.5-second walk and opens the collection. |
| `broken-room` | A model 404 gives a still-image entrance and **Open the collection**. Navigation stays usable. |
| `reduced-motion` | Simulates the application’s reduced-motion media query. The still-image entrance must be labelled correctly and open the collection. |
| `hang-room` | A model request that never finishes falls back after 30 seconds. A queued walk proceeds to the collection. |

Also check a direct `/?view=collection` link, returning to **The studio**, clicking **The studio** while already there, and a browser with reduced motion enabled. Reduced motion deliberately uses the still-image entrance. On a real iPad/iPhone, check portrait and landscape layout and tapping the walk control.

## Static publication

Run `npm run test:publish` for privacy, image copying, stable exports, removal, and failure preservation. Run `npm run build:pages && npm run verify:published` to ensure visitor assets are local. The GitHub entry now bundles a snapshot: the earlier API loading fixtures above apply to the retired live-fetch mode, not normal GitHub browsing. For a current browser check, set the local fixture to `hang`; the snapshot gallery and photo files must still display without a working `/api/public` endpoint.
