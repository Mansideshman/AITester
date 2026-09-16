# DeepEval

LLM evaluation tests using [DeepEval](https://github.com/confident-ai/deepeval) (v4.x), judged
by a free-tier [Groq](https://groq.com) model via LiteLLM — no OpenAI cost required.

See [Notes.md](Notes.md) for setup background and prerequisites.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U deepeval litellm "click<8.4.0"
```

## Configure the judge model (Groq, free tier)

```bash
export GROQ_API_KEY=gsk_...
deepeval set-litellm --model groq/qwen/qwen3.8-27b --save dotenv:.env.local
```

Put `GROQ_API_KEY` in a local `.env` (gitignored) rather than exporting it in shell history.

**Model note:** `groq/openai/gpt-oss-120b` looks like the obvious pick but fails under Groq's
strict JSON-schema mode — it drops the required `reason` field on "yes" verdicts, so every
metric errors out with `json_validate_failed`. `groq/qwen/qwen3.8-27b` follows DeepEval's
structured-output schema correctly and is what these tests are configured against.

Check the live model list any time Groq changes their lineup:
```bash
curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY" \
  | python3 -c "import json,sys; [print(m['id']) for m in json.load(sys.stdin)['data']]"
```

## Run tests

```bash
source .venv/bin/activate
deepeval test run test_01_Answer_Relevancy.py
```

## Files

- `test_01_Answer_Relevancy.py` — sanity-check test using `AnswerRelevancyMetric`.
- `Notes.md` — setup notes, prerequisites, alternative judge-model options (OpenAI, free
  NVIDIA/AMD APIs).

## Gitignored (never commit)

`.env`, `.env.local`, `.venv/`, `venv/`, `__pycache__/`, `.pytest_cache/`, `.deepeval/` —
covered by [.gitignore](.gitignore).
