# deep-research

A minimal deep research agent built as a learning exercise for LangGraph. It iteratively searches the web via Gemini's grounding API, reflects on results, and produces a cited markdown answer.

---

## Deployment

The app is containerised with Docker and deployed via a blue-green strategy: the new container is started alongside the current one, and once healthy, the upstream proxy is switched over to it and the old container is stopped — giving zero downtime and an instant rollback path.

---

## Acknowledgement

Learnt from and inspired by **[gemini-fullstack-langgraph-quickstart](https://github.com/google-gemini/gemini-fullstack-langgraph-quickstart)** by the Google Gemini team.
