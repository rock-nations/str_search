# Example failure artifacts

These files come from a real failing run of the opt-in demo test, which expects a score of 70 on a submission that scored 100:

```bash
cd frontend
E2E_DEMO_FAILURE=1 npx playwright test --project=mocked demo-failure
```

| File | What it shows |
|---|---|
| `screenshot.png` | The results page at the moment of failure: 100, Best |
| `error-context.md` | The failed assertion (`expected "70"`, `received "100"`) and an accessibility snapshot of the page |
| `api-calls.json` | Every API call the page made, with bodies. `GET /submissions/1` returned `rating: best`, so the expectation is wrong, not the app |
| `trace.zip` | Full replay. Open it with `npx playwright show-trace docs/failure-example/trace.zip` |

The debugging walkthrough is in [../TESTING.md](../TESTING.md#how-i-debug-one).
