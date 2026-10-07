# Example failure artifacts

These files show what the test suite saves when a test fails.

They come from one test that **fails on purpose**. It opens the results page for an attempt that scored 100, then checks for a score of 70. The app is working correctly; the test's expectation is deliberately wrong. That is why the screenshot looks normal: the page shows the right score, just not the one the test asked for. In a real failure, the screenshot usually shows the problem itself, such as an error message or a missing button.

To produce these files yourself:

```bash
cd frontend
E2E_DEMO_FAILURE=1 npx playwright test --project=mocked demo-failure
```

## What each file shows

| File | In plain words |
|---|---|
| `screenshot.png` | A picture of the page when the test gave up. It shows a score of 100 and the "Best" label, while the test wanted 70. |
| `error-context.md` | The check that failed: the test expected `"70"` and the page had `"100"`. Below that is a text version of the page (headings, buttons and text), so you can read what was on screen without the picture. |
| `api-calls.json` | Every request the page sent to the server, with the server's reply. `GET /submissions/1` asked for attempt 1, and the server replied with a score of 100 (`"rating": "best"`). The server said 100 and the page showed 100, so the app is right and the test's expectation is wrong. |
| `trace.zip` | A full recording of the test run: every step, a snapshot of the page before and after each step, network traffic and console messages. Don't unzip it; open it in Playwright's trace viewer (below). |

To open the trace, run this from the `frontend` folder, where Playwright is installed:

```bash
cd frontend
npx playwright show-trace ../docs/failure-example/trace.zip
```

You can also drag `trace.zip` onto https://trace.playwright.dev. The file is read in your browser and isn't uploaded.

## How these files are used together

1. Read `error-context.md` to see what the test expected and what it found.
2. Check `api-calls.json` to see whether the server sent the right data. This tells a server problem apart from an app problem.
3. If it's still unclear, open `trace.zip` and replay the test up to the moment it failed.
4. Glance at `screenshot.png` for a quick visual check.

There is a longer guide in [../TESTING.md](../TESTING.md#how-i-debug-one).
