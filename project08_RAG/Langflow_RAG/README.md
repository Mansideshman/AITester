# Langflow RAG

Two exported [Langflow](https://www.langflow.org/) flow definitions for a naive
Retrieval-Augmented Generation pipeline, plus a sample question set used to exercise them.

## Flows

Both flows wire the same basic pipeline: `File` → `SplitText` → `OpenAIEmbeddings` →
`Chroma` → (`ChatInput` + `Prompt Template` + retrieved context) → `OpenAIModel` →
`ParserComponent` → `ChatOutput`.

- **`AI_3X_Naive RAG.json`** — the baseline flow (9 components): a single chunking and
  embedding path into one Chroma collection.
- **`AI_3X_Naive RAG_Imporve_Chunk.json`** — a variant (13 components) that adds a second
  `OpenAIEmbeddings` → `Chroma` → `ParserComponent` branch to compare chunking strategies
  side by side.

## Test data

`VWO_Test_Cases_500.csv` — ~500 VWO test cases (`Scenario`, `Test Case ID`, `Test Case`,
`Expected Result`, `Actual Result`, `Remarks`) used as sample query/context material when
exercising the flows.

## Running these flows

Import the desired `.json` file into a running Langflow instance (**Flows → Import**),
then supply an OpenAI API key on the `OpenAIEmbeddings` / `OpenAIModel` components. See
[`project_07_AI_Agents_LangFlow/README.md`](../../project_07_AI_Agents_LangFlow/README.md)
for instructions on running Langflow itself (Docker, persistent storage) and calling a
flow's REST endpoint.
