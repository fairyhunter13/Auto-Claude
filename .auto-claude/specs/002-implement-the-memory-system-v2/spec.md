# Specification: Implement the Memory System V2

## Overview

Memory System V2 is a comprehensive enhancement to Auto Claude's memory infrastructure that transforms the current single-provider, implementation-only memory system into a multi-provider, cross-phase intelligent memory layer. This upgrade enables Graphiti knowledge graph integration across all four entry points (Roadmap, Ideation, Spec Creation, Implementation), supports multiple LLM and embedding providers (OpenAI, Anthropic+Voyage, Azure OpenAI, Ollama), and implements 15 learning feedback loops for continuous improvement. The system provides semantic search capabilities to leverage historical learnings, patterns, and outcomes across specs while maintaining graceful fallback to file-based storage.

## Workflow Type

**Type**: feature

**Rationale**: This is a major new feature implementation that extends the existing memory system with multi-provider support and cross-phase integration. While it builds on existing `graphiti_memory.py` and `graphiti_config.py`, it represents significant new functionality rather than a refactor.

## Task Scope

### Services Involved
- **auto-claude** (primary) - Core Python framework with memory integration
- **auto-claude-ui** (integration) - Electron UI for provider configuration
- **FalkorDB** (infrastructure) - Graph database backend via Docker

### This Task Will:
- [ ] Implement multi-provider factory pattern for Graphiti (OpenAI, Anthropic, Azure, Ollama)
- [ ] Create Historical Context phase in spec_runner.py for semantic search during spec creation
- [ ] Add Graph Hints retrieval to Ideation and Roadmap runners
- [ ] Implement 15 learning feedback loops (task outcomes, QA results, patterns, gotchas)
- [ ] Add provider configuration UI in Electron app (AppSettings.tsx)
- [ ] Create conditional provider field display based on selected LLM/Embedder
- [ ] Add connection test handlers for Ollama and FalkorDB
- [ ] Update all 7 ideation prompts with Graph Hints sections
- [ ] Implement project-level group_id for cross-spec learning
- [ ] Add embedding dimension validation across providers
- [ ] Create graphiti_providers.py with factory functions

### Out of Scope:
- Changing core implementation agent behavior (coder sessions already use memory)
- Creating new graph database alternatives to FalkorDB
- Real-time streaming of memory updates
- Memory data migration tools
- Multi-tenant isolation (single project focus)

## Service Context

### Auto-Claude (Python Backend)

**Tech Stack:**
- Language: Python 3.11+
- Framework: Claude Code SDK, asyncio
- Key directories: `auto-claude/`, `auto-claude/prompts/`

**Entry Point:** `auto-claude/spec_runner.py`, `auto-claude/ideation_runner.py`, `auto-claude/roadmap_runner.py`

**How to Run:**
```bash
source .venv/bin/activate
python auto-claude/spec_runner.py --task "Your task"
python auto-claude/ideation_runner.py
python auto-claude/roadmap_runner.py
```

### Auto-Claude-UI (Electron Frontend)

**Tech Stack:**
- Language: TypeScript
- Framework: Electron, React, TailwindCSS
- Key directories: `auto-claude-ui/src/renderer/components/`, `auto-claude-ui/src/shared/`

**Entry Point:** `auto-claude-ui/src/main/main.ts`

**How to Run:**
```bash
cd auto-claude-ui
pnpm install
pnpm dev
```

### FalkorDB (Infrastructure)

**Tech Stack:**
- Database: FalkorDB (graph database)
- Protocol: Redis

**How to Run:**
```bash
docker-compose up -d falkordb
```

**Port:** 6380 (mapped from internal 6379)

**IMPORTANT Port Note:** FalkorDB's default internal port is 6379 (Redis standard). This project maps it to external port 6380 via docker-compose.yml to avoid conflicts with local Redis. The existing `graphiti_config.py` uses 6380 as default, which is correct for this project's docker-compose setup.

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `auto-claude/graphiti_config.py` | auto-claude | Add provider selection enums, per-provider validation, new env vars |
| `auto-claude/graphiti_memory.py` | auto-claude | Multi-provider initialization via factory, project-level group_id |
| `auto-claude/graphiti_providers.py` (NEW) | auto-claude | Factory functions for LLM clients and embedders by provider |
| `auto-claude/spec_runner.py` | auto-claude | Add Historical Context phase, integrate graph hints |
| `auto-claude/ideation_runner.py` | auto-claude | Add parallel Graph Hints retrieval phase |
| `auto-claude/roadmap_runner.py` | auto-claude | Add lightweight graph hints integration |
| `auto-claude/context.py` | auto-claude | Enhance semantic search with historical hints |
| `auto-claude/memory.py` | auto-claude | Ensure lite mode fallback works alongside Graphiti |
| `auto-claude/prompts/ideation_*.md` (7 files) | auto-claude | Add Graph Hints sections to all ideation prompts |
| `auto-claude/prompts/spec_writer.md` | auto-claude | Add historical_context.json reading |
| `auto-claude-ui/src/renderer/components/AppSettings.tsx` | auto-claude-ui | Add Graphiti Memory configuration section |
| `auto-claude-ui/src/shared/types.ts` | auto-claude-ui | Add GraphitiUISettings interface |
| `auto-claude-ui/src/main/settings-store.ts` | auto-claude-ui | Add Graphiti settings handling |
| `auto-claude-ui/src/main/ipc-handlers.ts` | auto-claude-ui | Add connection test handlers |
| `.env.example` | config | Add all provider environment variables |
| `requirements.txt` | config | Add optional provider extras |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `auto-claude/graphiti_memory.py` | Existing Graphiti initialization, async patterns |
| `auto-claude/graphiti_config.py` | Configuration dataclass pattern, env var loading |
| `auto-claude/linear_config.py` | Similar config pattern for external service |
| `auto-claude/spec_runner.py` | Phase orchestration pattern |
| `auto-claude/ideation_runner.py` | Parallel agent execution pattern |
| `auto-claude/recovery.py` | Memory file storage patterns |
| `auto-claude-ui/src/renderer/components/AppSettings.tsx` | Settings UI patterns |
| `auto-claude/research.json` | Provider API patterns from research |

## Patterns to Follow

### Provider Factory Pattern

From research.json - verified provider configurations:

```python
# Factory pattern for LLM clients
def create_llm_client(provider: str, config: GraphitiConfig):
    if provider == "openai":
        from graphiti_core.llm_client.openai_client import OpenAIClient
        return OpenAIClient(config=LLMConfig(api_key=config.openai_api_key))
    elif provider == "anthropic":
        from graphiti_core.llm_client.anthropic_client import AnthropicClient
        return AnthropicClient(config=LLMConfig(api_key=config.anthropic_api_key, model=config.anthropic_model))
    elif provider == "azure_openai":
        from openai import AsyncOpenAI
        from graphiti_core.llm_client.azure_openai_client import AzureOpenAILLMClient
        azure_client = AsyncOpenAI(base_url=config.azure_openai_base_url, api_key=config.azure_openai_api_key)
        return AzureOpenAILLMClient(azure_client=azure_client, config=LLMConfig(model=config.azure_openai_llm_deployment, small_model=config.azure_openai_llm_deployment))
    elif provider == "ollama":
        from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
        return OpenAIGenericClient(config=LLMConfig(api_key='ollama', model=config.ollama_llm_model, small_model=config.ollama_llm_model, base_url=config.ollama_base_url))
```

**Key Points:**
- Use lazy imports to avoid ImportError when provider not installed
- Ollama requires dummy API key 'ollama'
- Anthropic requires separate embedder (Voyage or OpenAI)

### Embedder Factory Pattern

From research.json - verified embedder configurations:

```python
# Factory pattern for embedders
def create_embedder(provider: str, config: GraphitiConfig):
    if provider == "openai":
        from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
        return OpenAIEmbedder(config=OpenAIEmbedderConfig(api_key=config.openai_api_key))
    elif provider == "voyage":
        from graphiti_core.embedder.voyage import VoyageEmbedder, VoyageAIConfig
        return VoyageEmbedder(config=VoyageAIConfig(api_key=config.voyage_api_key, embedding_model=config.voyage_embedding_model))
    elif provider == "azure_openai":
        from openai import AsyncOpenAI
        from graphiti_core.embedder.azure_openai import AzureOpenAIEmbedderClient
        azure_client = AsyncOpenAI(base_url=config.azure_openai_base_url, api_key=config.azure_openai_api_key)
        return AzureOpenAIEmbedderClient(azure_client=azure_client, model=config.azure_openai_embedding_deployment)
    elif provider == "ollama":
        from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
        return OpenAIEmbedder(config=OpenAIEmbedderConfig(
            api_key='ollama',
            embedding_model=config.ollama_embedding_model,
            embedding_dim=config.ollama_embedding_dim,
            base_url=config.ollama_base_url
        ))
```

**Embedder Key Points:**
- Ollama uses OpenAIEmbedder with OpenAI-compatible API (not a dedicated embedder class)
- Voyage AI requires separate package/API key from Anthropic
- Embedding dimension must be set explicitly for Ollama (varies by model)

**Cross-Encoder Note (Optional):**
For Ollama setup, a cross-encoder/reranker can be added using:
```python
from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient
cross_encoder = OpenAIRerankerClient(client=llm_client, config=llm_config)
```
This is optional but improves search result quality. Other providers use built-in reranking.

### Async Context Pattern

From graphiti_memory.py:

```python
async def _ensure_initialized(self) -> bool:
    if self._initialized:
        return True
    if not self._available:
        return False
    return await self.initialize()
```

**Key Points:**
- Always check initialization before operations
- Return early if not available
- Graceful degradation pattern

### Parallel Query Pattern

From ideation_runner.py parallelism approach:

```python
async def phase_graph_hints_all(self) -> dict[str, IdeationHints]:
    """Query graph hints for all 7 ideation types in parallel."""
    queries = {
        "low_hanging_fruit": "patterns quick wins improvements",
        "ui_ux": "user interface accessibility patterns",
        # ... more queries
    }

    tasks = [
        self._query_graph_hints(ideation_type, query)
        for ideation_type, query in queries.items()
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)
    # Handle results...
```

**Key Points:**
- Use asyncio.gather for parallel execution
- Handle exceptions individually
- Token budget per query (500t for hints)

## Requirements

### Functional Requirements

1. **Multi-Provider LLM Support**
   - Description: Support OpenAI, Anthropic, Azure OpenAI, and Ollama as LLM providers for Graphiti
   - Acceptance: Provider can be selected via GRAPHITI_LLM_PROVIDER env var; each provider initializes correctly

2. **Multi-Provider Embedder Support**
   - Description: Support OpenAI, Azure OpenAI, Voyage AI, and Ollama as embedding providers
   - Acceptance: Provider can be selected via GRAPHITI_EMBEDDER_PROVIDER env var; embeddings generated correctly

3. **Historical Context Phase**
   - Description: Add new phase in spec_runner.py between requirements and context that queries Graphiti for similar past tasks
   - Acceptance: historical_context.json created with relevant patterns, gotchas, and outcomes (max 2000 tokens)

4. **Graph Hints for Ideation**
   - Description: Add parallel graph hints retrieval for all 7 ideation types
   - Acceptance: Each ideation agent receives relevant graph hints (max 500t each); parallel execution preserved

5. **Graph Hints for Roadmap**
   - Description: Add lightweight graph hints to roadmap discovery phase
   - Acceptance: Roadmap agent receives existing feature patterns and constraints

6. **Provider Configuration UI**
   - Description: Add Graphiti Memory section in AppSettings.tsx with conditional provider fields
   - Acceptance: User can select providers and enter credentials; fields show/hide based on selection

7. **Connection Testing**
   - Description: Add test connection buttons for FalkorDB and Ollama
   - Acceptance: User receives clear success/failure feedback when testing connections

8. **Learning Feedback Loops**
   - Description: Implement 15 learning loops per PRD (task outcomes, QA results, patterns, gotchas, etc.)
   - Acceptance: Each phase writes learnings to Graphiti; subsequent phases can query them

9. **Project-Level Group ID**
   - Description: Use project root as group_id instead of spec name for cross-spec learning
   - Acceptance: Queries across all specs in project return relevant results

10. **Embedding Dimension Validation**
    - Description: Validate embedding dimensions match between providers
    - Acceptance: Clear error if dimension mismatch detected; auto-configure when possible

### Edge Cases

1. **Provider Not Installed** - Return graceful error with install instructions
2. **FalkorDB Unavailable** - Fall back to file-based memory with warning
3. **API Key Invalid** - Clear error message, don't cache failed config
4. **Ollama Not Running** - Detect and suggest starting service
5. **Embedding Dimension Mismatch** - Error on initialization, not during use
6. **Empty Graph Results** - Return empty hints, don't fail
7. **Rate Limits** - Implement exponential backoff for cloud providers

## Implementation Notes

### DO
- Follow the existing pattern in `graphiti_memory.py` for async operations
- Use factory pattern for provider instantiation (lazy imports)
- Preserve parallel execution in ideation_runner.py
- Use environment variables for all credentials (never hardcode)
- Implement graceful degradation when Graphiti unavailable
- Test each provider combination independently
- Add comprehensive logging at INFO level for provider operations

### DON'T
- Don't break existing file-based memory fallback
- Don't make Graphiti required - it must remain optional
- Don't store credentials in state files
- Don't change embedding dimensions mid-session
- Don't block on Graphiti failures - log and continue
- Don't create new dependencies for providers not being used

### Embedding Dimensions Reference

**CRITICAL**: Embedding dimensions vary by provider and model. Mixing dimensions causes errors.

| Provider | Model | Dimensions |
|----------|-------|------------|
| OpenAI | text-embedding-3-small | 1536 |
| OpenAI | text-embedding-3-large | 3072 |
| Voyage AI | voyage-3 / voyage-3.5 | 1024 |
| Voyage AI | voyage-3-lite / voyage-3.5-lite | 512 |
| Ollama | nomic-embed-text | 768 |
| Ollama | mxbai-embed-large | 1024 |
| Ollama | all-minilm | 384 |

**Dimension Validation Strategy:**
1. Store expected dimension in `graphiti_config.py` per provider/model
2. Validate on initialization by checking first embedding result
3. Fail fast with clear error message if mismatch detected
4. Auto-configure for known models when dimension not explicitly set

## Development Environment

### Start Services

```bash
# Start FalkorDB
docker-compose up -d falkordb

# Start Ollama (if using local LLM/embeddings)
ollama serve

# Pull Ollama models (if needed)
ollama pull nomic-embed-text
ollama pull deepseek-r1:7b

# Activate Python environment
source .venv/bin/activate
```

### Service URLs
- FalkorDB: redis://localhost:6380
- Ollama: http://localhost:11434

### Required Environment Variables

```bash
# Core
GRAPHITI_ENABLED=true
GRAPHITI_LLM_PROVIDER=openai|azure_openai|anthropic|ollama
GRAPHITI_EMBEDDER_PROVIDER=openai|azure_openai|voyage|ollama

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic (LLM only - needs separate embedder)
ANTHROPIC_API_KEY=sk-ant-...
GRAPHITI_ANTHROPIC_MODEL=claude-sonnet-4-5-latest

# Azure OpenAI
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_BASE_URL=https://{resource}.openai.azure.com/openai/v1/
AZURE_OPENAI_LLM_DEPLOYMENT=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# Voyage AI (embeddings only)
VOYAGE_API_KEY=...
VOYAGE_EMBEDDING_MODEL=voyage-3

# Ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_LLM_MODEL=deepseek-r1:7b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_EMBEDDING_DIM=768

# FalkorDB
GRAPHITI_FALKORDB_HOST=localhost
GRAPHITI_FALKORDB_PORT=6380
GRAPHITI_FALKORDB_PASSWORD=  # Optional, empty for local dev
GRAPHITI_DATABASE=auto_build_memory
```

## Success Criteria

The task is complete when:

1. [ ] Multi-provider factory (graphiti_providers.py) creates correct clients for all 4 LLM providers
2. [ ] Multi-provider factory creates correct embedders for all 4 embedding providers
3. [ ] Historical Context phase generates historical_context.json with semantic search results
4. [ ] Ideation runner queries graph hints in parallel (performance preserved)
5. [ ] Roadmap runner integrates lightweight graph hints
6. [ ] UI shows provider selection dropdowns with conditional fields
7. [ ] Connection test buttons work for FalkorDB and Ollama
8. [ ] All 7 ideation prompts include Graph Hints sections
9. [ ] Project-level group_id enables cross-spec queries
10. [ ] File-based fallback still works when Graphiti disabled
11. [ ] No console errors in normal operation
12. [ ] Existing tests still pass
13. [ ] New provider combinations tested manually

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Provider Factory Tests | `tests/test_graphiti_providers.py` | Each provider creates correct client type |
| Config Validation Tests | `tests/test_graphiti_config.py` | Provider-specific validation works |
| Embedding Dimension Tests | `tests/test_graphiti_providers.py` | Dimension mismatch detected |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Graphiti + FalkorDB | graphiti_memory ↔ FalkorDB | Data persists and queries return results |
| Historical Context | spec_runner ↔ Graphiti | Phase generates JSON with relevant results |
| Ideation Graph Hints | ideation_runner ↔ Graphiti | Parallel queries complete under 2s |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| OpenAI Provider | 1. Set OPENAI_API_KEY 2. Run spec_runner | Historical context populated |
| Ollama Provider | 1. Start Ollama 2. Set env vars 3. Run ideation | Graph hints retrieved locally |
| Provider Switch | 1. Use OpenAI 2. Switch to Anthropic | No data loss, queries work |
| Fallback Mode | 1. Disable Graphiti 2. Run spec_runner | File-based memory used |

### Browser Verification (UI)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| AppSettings | Electron app → Settings | Graphiti section visible |
| Provider Dropdowns | Settings → Graphiti Memory | LLM/Embedder selects work |
| Conditional Fields | Settings → Select Anthropic | Voyage fields appear |
| Connection Test | Settings → Test Connection | Success/failure feedback |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Graph exists | `docker exec ... redis-cli GRAPH.LIST` | `auto_build_memory` listed |
| Episodes stored | Graph query for Episodes | Session insights present |
| Group ID correct | Query by project group_id | Cross-spec results returned |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] Database state verified
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns
- [ ] No security vulnerabilities introduced (credentials handled correctly)
- [ ] Performance: Ideation graph hints < 2s total
- [ ] Graceful degradation verified (Graphiti off, provider unavailable)
