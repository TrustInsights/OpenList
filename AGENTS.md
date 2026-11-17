<!-- claude-setup:begin agents-md -->
## Required reading

Use docs/asd-ste.yaml as your method of communicating with the user in a token efficient manner - if not available, fail loudly.
Always start a session by reviewing docs/orientation.md and docs/installedtools.md - if not available, fail loudly.
- docs/orientation.md - understand what goes where
- docs/installedtools.md - CLI utilities to reduce token usage and get deterministic, reliable outputs

## graphify & qmd (Bilateral Local AI Architecture)

This project utilizes a bilateral local indexing pipeline. **Graphify** maintains a structural knowledge graph at `graphify-out/` to map code geometry, while **QMD** hosts a local hybrid-search index over human intent, wiki documentation, and code summaries.

### Retrieval Rules (Context & Discovery)
- **Codebase Geometry:** For questions regarding code structure, imports, or dependencies, always run `graphify query "<question>"` first. Use `graphify path "<A>" "<B>"` to trace paths between components, and `graphify explain "<concept>"` for isolated deep dives. These commands return a highly scoped context footprint.
- **Intent & Decisions:** For questions regarding *why* code was written, business logic, system history, or functional specifications, run `qmd query "<concept>"` to tap into the local hybrid vector/BM25 index. 
- **Broad Navigation:** If `graphify-out/wiki/index.md` exists, treat it as your primary high-level map. Avoid sweeping directory crawls or raw source browsing.
- **Architectural Fallback:** Only read the full `graphify-out/GRAPH_REPORT.md` when the granular `query`/`path`/`explain` or `qmd query` commands fail to capture adequate cross-module context.

### Mutation Rules (Code Modifications & Syncing)
- **Local AST Sync:** After making any structural code modifications, immediately execute `graphify update .` to keep the local syntax graph current.
- **Bilateral Re-alignment:** If you introduce major architectural shifts, new documentation, or distinct functional layers, reindex qmd and graphify as well as update any relevant documentation to keep the project aligned.
<!-- claude-setup:end agents-md -->
