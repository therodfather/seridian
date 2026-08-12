# Seridian Roadmap

## Current Status (August 2026)

### Completed ✅

#### Core Platform
- [x] Next.js 16 App Router setup
- [x] ConvexDB backend with 20+ tables
- [x] Authentication (pubkey + password)
- [x] Dashboard layout with sidebar, status bar
- [x] Dark theme with cyan accents

#### Business Operations
- [x] Client management (CRUD)
- [x] Deal pipeline / kanban
- [x] Proposals (multi-step form)
- [x] Bookings (multi-step form)
- [x] Email templates (multi-step form)
- [x] File manager (grid/list, preview, upload)
- [x] Settings page with user management

#### Communication
- [x] Real-time chat (Convex)
- [x] Chat layout (3-panel)
- [x] Message input with rich text

#### Integrations
- [x] Linear sync (teams, projects, issues)
- [x] GitHub sync (issues, PRs)

#### File System
- [x] Convex file storage
- [x] File type detection & icons
- [x] ODT editor (TipTap + odf-kit)
- [x] Local-first editing (IndexedDB cache)

#### Memory System (Hindsight Clone)
- [x] Memory banks (per-agent or shared)
- [x] Entity recognition (people, orgs, concepts)
- [x] Knowledge graph (semantic, temporal, causal links)
- [x] TEMPR 4-way search (semantic, keyword, graph, temporal)
- [x] Observation consolidation with evidence tracking
- [x] Mission/directives/disposition configuration
- [x] Wiki pages (company-wide knowledge base)
- [x] Second Brain (private per-user memory)

#### Android App
- [x] Kotlin Multiplatform chat module
- [x] Android chat app with Convex

---

## Gaps & TODOs 🚧

### Priority 1: Critical

#### 1. Memory System - LLM Integration
**Status:** Not started
**Description:** The memory system currently uses simple regex-based entity extraction and Jaccard similarity. Needs LLM integration for:
- [ ] Rich fact extraction (emotions, reasoning, context)
- [ ] Semantic embeddings (instead of token overlap)
- [ ] Cross-encoder reranking for recall
- [ ] Natural language entity extraction
- [ ] Automatic observation generation from facts

**Implementation:**
- Add OpenAI/Anthropic API route for embeddings
- Replace Jaccard similarity with cosine similarity on embeddings
- Add LLM-powered entity extraction in `retain()` mutation
- Add cross-encoder reranking in `recall()` query

#### 2. File Upload & Storage
**Status:** Broken (HTTP actions not enabled)
**Description:** Convex HTTP actions are not enabled, so file uploads fail. The `generateUploadUrl` mutation works but actual storage fails.

**Fix required:**
- Enable HTTP actions in Convex dashboard
- OR use client-side file upload to Convex storage directly
- Test upload/download flow end-to-end

#### 3. Second Brain - Per-User Isolation
**Status:** Partially implemented
**Description:** The SecondBrain component exists but needs:
- [ ] Proper user authentication (currently hardcoded "dee")
- [ ] Per-user memory bank isolation
- [ ] User-specific entity resolution
- [ ] Privacy controls (who can see what)

**Implementation:**
- Add auth context to SecondBrain
- Filter memory banks by `createdBy` matching current user
- Add privacy flags to memories

### Priority 2: Important

#### 4. Wiki - Real-time Collaboration
**Status:** Not started
**Description:** Wiki pages are single-editor. Need:
- [ ] Real-time collaborative editing (like Google Docs)
- [ ] Presence indicators (who's viewing/editing)
- [ ] Conflict resolution
- [ ] Version history / undo

**Implementation:**
- Use Convex `docPresence` table (already exists)
- Add collaborative editing via Y.js or similar
- Add page-level locking or OT

#### 5. Memory System - Graph Traversal
**Status:** Basic implementation
**Description:** Knowledge graph connections exist but traversal is limited. Need:
- [ ] Multi-hop reasoning (Alice → manager → team → projects)
- [ ] Graph scoring with entity overlap
- [ ] Causal chain tracing
- [ ] Graph visualization in UI

**Implementation:**
- Add graph traversal queries in `convex/memory.ts`
- Add graph visualization component
- Implement causal chain detection

#### 6. File Manager - ODT Export
**Status:** Partially implemented
**Description:** ODT editor saves to collaboration doc but doesn't export as ODT binary. Need:
- [ ] Convert TipTap JSON → ODT binary on save
- [ ] Re-upload ODT to Convex storage
- [ ] Download as proper .odt file

**Implementation:**
- Use `tiptapToOdt()` from odf-kit
- Add upload endpoint (requires HTTP actions)
- Update save handler

#### 7. Search - Global Search
**Status:** Not started
**Description:** No global search across all data. Need:
- [ ] Search across clients, deals, files, wiki, memories
- [ ] Keyboard shortcut (Cmd+K)
- [ ] Result ranking and filtering
- [ ] Recent searches

**Implementation:**
- Add search API route
- Implement cross-table search
- Add search UI component

### Priority 3: Nice to Have

#### 8. Memory System - Mental Models
**Status:** Schema exists, no UI
**Description:** Mental models (curated summaries) are defined in schema but not exposed. Need:
- [ ] UI to create/edit mental models
- [ ] Auto-suggest mental models from observations
- [ ] Use mental models in reflect queries

#### 9. Memory System - Disposition Traits
**Status:** Schema exists, not used
**Description:** Disposition (skepticism, literalism, empathy) is stored but not used in retrieval. Need:
- [ ] Apply disposition to recall scoring
- [ ] Configure disposition per bank
- [ ] Visualize disposition effects

#### 10. Analytics Dashboard
**Status:** Not started
**Description:** No analytics for memory system. Need:
- [ ] Memory growth over time
- [ ] Entity relationship visualization
- [ ] Consolidation stats
- [ ] Agent activity timeline

#### 11. API Documentation
**Status:** Basic (docs/API.md)
**Description:** API docs exist but need updating for memory system. Need:
- [ ] Memory system API reference
- [ ] Consolidation API reference
- [ ] Wiki API reference
- [ ] Example code for all endpoints

#### 12. Testing
**Status:** No tests
**Description:** No test framework configured. Need:
- [ ] Unit tests for memory module
- [ ] Integration tests for consolidation
- [ ] E2E tests for wiki
- [ ] Load tests for recall queries

---

## Technical Debt

### 1. Embeddings
- Current: Empty array `embedding: []`
- Needed: Vector embeddings for semantic search
- Options: OpenAI embeddings, Cohere, or local model

### 2. Temporal Parsing
- Current: Simple recency decay
- Needed: Natural language time parsing ("last spring", "in 2023")
- Options: chrono-node, custom parser

### 3. Entity Resolution
- Current: Fuzzy name matching
- Needed: Context-aware disambiguation
- Options: LLM-based resolution, co-occurrence patterns

### 4. Causal Detection
- Current: Keyword patterns
- Needed: LLM-based causal reasoning
- Options: Prompt engineering, fine-tuned model

---

## Architecture Decisions

### Memory System
- **Convex backend** — All memory operations are server-side
- **TEMPR search** — 4-way parallel retrieval with RRF fusion
- **Knowledge graph** — Entity, temporal, semantic, causal connections
- **Consolidation** — Auto-merge facts into observations with evidence tracking

### File System
- **Convex storage** — Files stored in Convex blob storage
- **Local-first** — IndexedDB cache for offline editing
- **ODT support** — TipTap + odf-kit for rich text editing

### Wiki
- **Memory bank backed** — Wiki pages stored in memoryBanks table
- **Markdown content** — Simple text content for now
- **Collaborative** — Future: real-time editing

---

## Dependencies Needed

### Memory System
- `openai` or `@anthropic-ai/sdk` — For LLM-powered extraction
- `@pinecone-database/pinecone` or `qdrant` — For vector search (optional)
- `chrono-node` — For temporal parsing

### File System
- HTTP actions enabled in Convex — For file upload

### Wiki
- `yjs` or `automerge` — For real-time collaboration
- `tiptap/extension-collaboration` — For collaborative editing

---

## Success Metrics

### Memory System
- [ ] Entity extraction accuracy > 80%
- [ ] Recall precision@10 > 0.7
- [ ] Consolidation reduces duplicate facts by > 50%
- [ ] Response time < 500ms for recall queries

### File System
- [ ] Upload success rate > 99%
- [ ] ODT round-trip fidelity > 90%
- [ ] Offline editing works for 24+ hours

### Wiki
- [ ] Page load time < 200ms
- [ ] Search results relevant (human eval)
- [ ] Collaborative editing without conflicts

---

## Timeline

### Phase 1: Core Memory (Weeks 1-2)
- LLM integration for entity extraction
- Embeddings for semantic search
- Fix file upload

### Phase 2: Rich Retrieval (Weeks 3-4)
- Cross-encoder reranking
- Graph traversal
- Temporal parsing

### Phase 3: Collaboration (Weeks 5-6)
- Real-time wiki editing
- Multi-user presence
- Conflict resolution

### Phase 4: Polish (Weeks 7-8)
- Analytics dashboard
- API documentation
- Testing

---

## Open Questions

1. **Embedding provider:** OpenAI vs Cohere vs local?
2. **Vector database:** Convex vector search vs external?
3. **LLM for extraction:** Which model for entity/fact extraction?
4. **Real-time collaboration:** Y.js vs Automerge vs custom?
5. **File storage:** Enable HTTP actions or use client-side upload?

---

*Last updated: August 12, 2026*
