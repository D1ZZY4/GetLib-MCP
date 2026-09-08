# Infrastructure, Architecture, Flows, and Engineering Blueprint

Dokumen ini mendefinisikan architecture, routing, application flow, MCP integration, infrastructure boundary, dependency direction, maintenance strategy, testing strategy, security model, dan engineering rules yang wajib diterapkan pada application.

Seluruh implementation HARUS mengikuti specification ini.

Seluruh perubahan HARUS mempertahankan boundary dan dependency direction yang didefinisikan di dalam dokumen ini.

Seluruh architecture decision HARUS mempertimbangkan maintainability, correctness, security, observability, performance, testability, extensibility, dan operational reliability.

---

# 1. Application Architecture

Application HARUS diperlakukan sebagai gabungan dari Web Application, Application Layer, Domain Layer, Infrastructure Layer, dan MCP Protocol Layer.

Architecture utama HARUS mengikuti boundary:

```text
Web Application
      ↓
Application Layer
      ↓
Domain Layer
      ↓
Infrastructure Layer
```

MCP HARUS menjadi protocol interface terhadap application capability:

```text
MCP Client
      ↓
MCP Transport
      ↓
MCP Protocol
      ↓
Authentication
      ↓
Authorization
      ↓
MCP Registry
      ↓
Tool / Resource / Prompt
      ↓
Application Layer
      ↓
Domain Layer
      ↓
Infrastructure Layer
```

Setiap layer HARUS memiliki responsibility yang eksplisit.

Web Application bertanggung jawab terhadap presentation, interaction, navigation, client state, dan UI composition.

Application Layer bertanggung jawab terhadap use case dan orchestration.

Domain Layer bertanggung jawab terhadap business rules dan domain invariants.

Infrastructure Layer bertanggung jawab terhadap technical implementation seperti database, cache, HTTP, external providers, filesystem, dan observability.

MCP Layer bertanggung jawab terhadap protocol adaptation.

### Rules

* **WAJIB** memisahkan routing, frontend, application, domain, infrastructure, dan MCP protocol concerns.
* **WAJIB** mempertahankan dependency direction yang konsisten.
* **WAJIB** menjaga setiap layer tetap berada dalam responsibility-nya.
* **DILARANG** menempatkan business logic pada routing layer.
* **DILARANG** menempatkan business logic pada frontend.
* **DILARANG** menempatkan business logic pada MCP transport.
* **DILARANG** membuat MCP tool menjadi pengganti application service.
* **DILARANG** membuat infrastructure menjadi business policy layer.
* **WAJIB** menggunakan shared application capability ketika Web dan MCP membutuhkan behavior yang sama.
* **WAJIB** menjaga architecture tetap independent terhadap perubahan interface.

---

# 2. Root Application and Dashboard

Root route:

```text
/
```

HARUS menjadi Dashboard Overview.

Root dashboard HARUS menjadi operational entry point application.

Dashboard Overview HARUS memberikan informasi mengenai keadaan application secara keseluruhan.

Minimum conceptual areas:

```text
Dashboard
├── System status
├── MCP summary
├── Usage
├── Recent activity
├── Attention required
└── Quick actions
```

System status dapat mencakup:

```text
MCP server
API
Database
Cache
External sources
```

MCP summary dapat mencakup:

```text
Active servers
Available tools
Resources
Prompts
Connected clients
```

Usage dapat mencakup:

```text
Requests
Success rate
Error rate
Latency
```

Quick actions dapat mengarah ke operation yang paling sering digunakan seperti discovery, source management, MCP testing, dan log inspection.

Root dashboard HARUS menjawab:

> "Apa kondisi sistem saya sekarang?"

Root dashboard TIDAK BOLEH hanya berfungsi sebagai navigation directory.

Route berikut TIDAK BOLEH menjadi duplicate route apabila tidak memiliki semantic responsibility yang berbeda:

```text
/dashboard
```

Dashboard root HARUS menjadi source of presentation untuk overall application state.

### Rules

* **WAJIB** menggunakan `/` sebagai operational dashboard jika application menggunakan dashboard-first experience.
* **WAJIB** menampilkan system health dan operational context yang relevan.
* **DILARANG** membuat root dashboard menjadi sekadar welcome page.
* **DILARANG** membuat duplicate dashboard route tanpa semantic purpose.
* **WAJIB** mengambil dashboard data melalui application/API boundary.
* **DILARANG** membuat dashboard component mengakses database atau external provider secara langsung.

---

# 3. Primary Application Routes

Primary application routes HARUS memiliki semantic responsibility yang jelas:

```text
/
├── discover
├── install
├── sources
├── statistics
│
├── mcp
│   ├── servers
│   ├── tools
│   ├── resources
│   ├── prompts
│   ├── clients
│   ├── playground
│   ├── logs
│   └── health
│
└── settings
    ├── general
    ├── security
    └── account
```

Semantic responsibility:

```text
/                  → Dashboard Overview
/discover          → Library / Documentation Discovery
/install           → Installation Assistant
/sources           → Source Management
/statistics        → Usage / Performance Analytics

/mcp               → MCP Control Center
/mcp/servers       → MCP Server Management
/mcp/tools         → MCP Tool Catalog
/mcp/resources     → MCP Resource Catalog
/mcp/prompts       → MCP Prompt Catalog
/mcp/clients       → Connected MCP Client Management
/mcp/playground    → MCP Capability Testing
/mcp/logs          → MCP Request Observability
/mcp/health        → MCP Operational Health

/settings          → Application Settings
```

`/mcp` HARUS menjadi dashboard/control center untuk MCP.

`/api/mcp` HARUS diperlakukan sebagai MCP protocol boundary.

`/api/management/*` HARUS diperlakukan sebagai application management API.

### Rules

* **WAJIB** memberikan semantic meaning pada setiap top-level route.
* **WAJIB** menghindari route duplication.
* **WAJIB** menjaga browser routes dan protocol endpoints sebagai boundary yang berbeda.
* **DILARANG** memperlakukan management API sebagai MCP protocol.
* **DILARANG** membuat route hanya karena sebuah component membutuhkan URL.
* **WAJIB** menambahkan route hanya ketika route tersebut memiliki clear responsibility.

---

# 4. Discover

Route:

```text
/discover
```

HARUS menjadi user-facing discovery interface.

Discovery HARUS mendukung konsep seperti:

```text
Search
Filters
Library catalog
Version
Source
Framework
Language
Popularity
```

Discovery harus berfokus terhadap pencarian dan eksplorasi resource atau library.

Discovery tidak boleh menjadi installation workflow.

Discovery tidak boleh menjalankan provider-specific logic secara langsung dari frontend.

Flow konseptual:

```text
User
 ↓
Discover UI
 ↓
Search API
 ↓
Application Service
 ↓
Search Domain
 ↓
Infrastructure Providers
 ↓
Normalized Results
 ↓
Discover UI
```

### Rules

* **WAJIB** memisahkan search behavior dari presentation.
* **WAJIB** menggunakan application capability untuk search.
* **DILARANG** menempatkan ranking atau provider routing pada React component.
* **DILARANG** melakukan direct external fetch dari discovery UI.
* **WAJIB** melakukan result normalization sebelum hasil dikonsumsi frontend.

---

# 5. Install

Route:

```text
/install
```

HARUS menangani installation/setup workflow.

Installation assistant dapat menghasilkan:

```text
Install instructions
MCP configuration
Client configuration
CLI commands
Framework-specific setup
```

Client configuration dapat mencakup:

```text
Claude Code
Cursor
VS Code
OpenCode
Codex
Custom MCP clients
```

Discovery dan installation HARUS dipisahkan.

```text
Discover
    = menemukan

Install
    = menggunakan
```

Discovery menghasilkan candidate.

Installation mengubah candidate menjadi usable configuration atau setup instructions.

### Rules

* **WAJIB** memisahkan discovery lifecycle dari installation lifecycle.
* **WAJIB** menggunakan typed configuration contract.
* **DILARANG** menduplikasi source metadata hanya untuk installation UI.
* **WAJIB** menghasilkan configuration berdasarkan canonical application data.
* **DILARANG** hardcode client-specific behavior di page component.

---

# 6. Sources

Route:

```text
/sources
```

HARUS menjadi Source Management interface.

Source management bertanggung jawab terhadap:

```text
Active sources
Disabled sources
Source health
Source priority
Source type
Last sync
Add/Edit source
```

Source dapat mencakup:

```text
MDN
GitHub
Official Documentation
Package Registry
Changelog
Custom Source
```

Source merupakan data acquisition concern.

Source BUKAN MCP primitive.

Conceptual flow:

```text
Source Configuration
       ↓
Source Adapter
       ↓
External Provider
       ↓
Normalized Source Data
       ↓
Application Layer
       ↓
Consumers
```

### Rules

* **WAJIB** mengisolasi source-specific behavior.
* **WAJIB** memiliki explicit source identity.
* **WAJIB** memiliki source health state.
* **WAJIB** memiliki source priority policy apabila routing memerlukan priority.
* **DILARANG** menempatkan provider-specific code pada MCP tool.
* **DILARANG** menganggap source sebagai MCP tool/resource secara otomatis.
* **WAJIB** menganggap external source content sebagai untrusted input.

---

# 7. Statistics

Route:

```text
/statistics
```

HARUS menjadi analytics dan observability presentation layer.

Metrics dapat mencakup:

```text
Request volume
Tool usage
Search usage
Resolve usage
Fetch usage
Cache hit rate
Cache miss rate
Average latency
P95 latency
P99 latency
Error rate
Source popularity
Library popularity
```

Logical sections dapat berupa:

```text
Overview
Requests
Tools
Sources
Performance
Errors
```

Tidak seluruh section harus menjadi independent route.

Statistics HARUS menggunakan centralized observability data.

Statistics TIDAK BOLEH menghitung critical metrics dari frontend-only state.

### Rules

* **WAJIB** menggunakan server-side authoritative telemetry.
* **WAJIB** membedakan usage analytics dari operational health.
* **WAJIB** menggunakan consistent metric definitions.
* **DILARANG** membuat setiap feature menghitung metric yang sama secara berbeda.
* **DILARANG** menjadikan chart component sebagai metric calculation layer.

---

# 8. MCP Control Center

Route:

```text
/mcp
```

HARUS menjadi MCP operational control center.

MCP overview HARUS dapat memberikan informasi tentang:

```text
Server status
Connected clients
Registered tools
Registered resources
Registered prompts
Request throughput
Error rate
Recent tool calls
Recent MCP errors
Transport status
```

MCP control center HARUS menjadi pusat observability dan management MCP.

### Rules

* **WAJIB** menampilkan current MCP operational state.
* **WAJIB** mendapatkan capability data dari MCP registry atau authoritative backend source.
* **DILARANG** membuat frontend menjadi source of truth untuk MCP capabilities.
* **WAJIB** membedakan operational state dari static metadata.
* **DILARANG** mengubah MCP runtime state tanpa melalui authorized backend boundary.

---

# 9. MCP Servers

Route:

```text
/mcp/servers
```

HARUS menjadi server registry management interface.

Server list dapat menampilkan:

```text
Server status
Endpoint
Transport
Capabilities
Version
Health
Last request
Client count
Enable/disable
```

Detail server:

```text
/mcp/servers/[serverId]
```

HARUS menjadi server-specific operational view.

Detail dapat mencakup:

```text
Overview
Capabilities
Tools
Resources
Prompts
Clients
Configuration
Logs
Health
Metrics
```

Satu MCP server dapat menyediakan banyak capabilities.

Server metadata HARUS mempunyai canonical identity.

### Rules

* **WAJIB** menggunakan server registry sebagai canonical capability source.
* **WAJIB** menjaga server identifier tetap stable.
* **WAJIB** memisahkan server configuration dari transient runtime state.
* **DILARANG** membuat server UI menyimpan canonical registry state sebagai local-only state.
* **WAJIB** memvalidasi server configuration sebelum activation.
* **WAJIB** menampilkan operational status berdasarkan authoritative runtime state.

---

# 10. MCP Tools

Route:

```text
/mcp/tools
```

HARUS menjadi tool catalog.

Tool metadata dapat mencakup:

```text
Tool name
Description
Input schema
Output schema
Source domain
Permission
Usage
Success rate
Latency
Status
```

Detail tool:

```text
/mcp/tools/[toolName]
```

dapat mencakup:

```text
Tool overview
Schema
Arguments
Examples
Recent calls
Metrics
Errors
Permissions
```

Tool catalog BUKAN implementation registry UI.

Implementation HARUS tetap berada pada MCP server layer.

### Rules

* **WAJIB** memiliki unique tool identifier.
* **WAJIB** memiliki input schema.
* **WAJIB** memiliki output contract.
* **WAJIB** memiliki description yang akurat.
* **WAJIB** menampilkan permissions yang berlaku ketika applicable.
* **DILARANG** menjadikan tool page sebagai source of truth untuk tool implementation.
* **DILARANG** mencampurkan tool execution code dengan UI component.

---

# 11. MCP Resources

Route:

```text
/mcp/resources
```

HARUS menjadi resource catalog.

Resource metadata dapat mencakup:

```text
Resource URI
Description
Mime type
Source
Availability
Access count
```

Detail:

```text
/mcp/resources/[resourceId]
```

Resource URI HARUS memiliki deterministic semantics.

### Rules

* **WAJIB** menggunakan canonical resource identity.
* **WAJIB** memvalidasi resource identifier.
* **WAJIB** menerapkan authorization sesuai sensitivity.
* **DILARANG** menempatkan resource retrieval business logic pada UI.
* **DILARANG** mengubah resource identifier tanpa migration consideration.

---

# 12. MCP Prompts

Route:

```text
/mcp/prompts
```

HARUS menjadi prompt catalog.

Prompt metadata dapat mencakup:

```text
Name
Description
Arguments
Usage
Version
Status
```

Detail:

```text
/mcp/prompts/[promptName]
```

Prompt HARUS memiliki stable identity.

Prompt HARUS dipisahkan dari tool execution.

### Rules

* **WAJIB** memberikan identifier yang stable.
* **WAJIB** memiliki explicit argument contract apabila prompt membutuhkan input.
* **WAJIB** mempertahankan separation antara prompt generation dan tool execution.
* **DILARANG** menggunakan prompt layer sebagai tempat business logic tersembunyi.
* **DILARANG** membuat prompt execution memiliki unauthorized side effects.

---

# 13. MCP Clients

Route:

```text
/mcp/clients
```

HARUS menyediakan visibility terhadap connected clients.

Client information dapat mencakup:

```text
Client name
Client version
Protocol version
Transport
Connection status
Last seen
Capabilities
Requests
```

Contoh consumer:

```text
Claude Code
Cursor
VS Code
OpenCode
Custom MCP Client
```

MCP client capability negotiation harus diperlakukan sebagai protocol concern.

### Rules

* **WAJIB** mencatat client identity ketika protocol memungkinkan.
* **WAJIB** menyimpan protocol version apabila tersedia.
* **WAJIB** memisahkan connection state dari client metadata.
* **DILARANG** mengasumsikan client capability berdasarkan client name saja.
* **WAJIB** menggunakan negotiated capability state sebagai authoritative behavior input.

---

# 14. MCP Playground

Route:

```text
/mcp/playground
```

HARUS menyediakan environment untuk menguji MCP capability.

Flow:

```text
Select Server
      ↓
Select Tool
      ↓
Resolve Schema
      ↓
Generate Input
      ↓
Execute
      ↓
Show Request
      ↓
Show Response
      ↓
Show Timing
      ↓
Show Logs
```

Playground harus memberikan visibility terhadap:

```text
Request
Arguments
Response
Execution duration
Status
Errors
Logs
```

Playground secara konseptual merupakan internal inspection/testing interface.

### Rules

* **WAJIB** mengambil tool schema secara dynamic dari authoritative registry.
* **WAJIB** memvalidasi input menggunakan schema yang sama dengan production execution.
* **WAJIB** menampilkan execution result secara structured.
* **DILARANG** membuat playground memiliki implementation logic yang berbeda dari production MCP execution.
* **DILARANG** membuat playground menjadi security bypass.
* **WAJIB** menerapkan authentication dan authorization yang sama atau lebih ketat daripada production execution.

---

# 15. MCP Logs

Route:

```text
/mcp/logs
```

HARUS menjadi structured observability interface.

Filter minimum dapat mencakup:

```text
Time
Client
Tool
Method
Status
Duration
Error
Protocol version
Transport
```

Detail:

```text
/mcp/logs/[requestId]
```

dapat mencakup:

```text
Request metadata
Authentication context
MCP method
Arguments
Execution stages
Response
Latency
Error
Stack trace
```

Sensitive data HARUS selalu disanitasi.

### Rules

* **WAJIB** menggunakan structured logging.
* **WAJIB** menyediakan correlation/request identifier.
* **WAJIB** melakukan redaction terhadap credentials dan sensitive fields.
* **DILARANG** menyimpan raw authorization header.
* **DILARANG** menyimpan access token.
* **DILARANG** menyimpan password.
* **DILARANG** menganggap browser console sebagai observability system.
* **WAJIB** mempertahankan traceability dari request menuju execution stages.

---

# 16. MCP Health

Route:

```text
/mcp/health
```

HARUS menjadi operational health interface.

Health checks dapat mencakup:

```text
MCP endpoint
Database
Cache
External HTTP
GitHub
Documentation sources
Search engine
Package registry
```

Status minimal:

```text
Healthy
Degraded
Unavailable
```

Metadata dapat mencakup:

```text
Last check
Latency
Error
```

Health HARUS dipisahkan dari statistics.

### Rules

* **WAJIB** melakukan health check terhadap dependency yang benar-benar diperlukan.
* **WAJIB** memiliki timeout.
* **WAJIB** membedakan application failure dan dependency failure ketika memungkinkan.
* **WAJIB** mencegah sensitive information leakage.
* **DILARANG** menjalankan expensive operation pada health endpoint tanpa alasan operasional yang jelas.
* **WAJIB** menyediakan deterministic health semantics.

---

# 17. Settings

Route:

```text
/settings
├── profile
├── general
├── security
├── access
├── mcp
└── advanced
```

Settings HARUS dikelompokkan berdasarkan responsibility.

Tidak semua setting membutuhkan route terpisah.

Settings dengan semantic relationship yang kuat dapat menggunakan tab atau subsection.

### Rules

* **WAJIB** memisahkan configuration concerns berdasarkan ownership.
* **WAJIB** menjaga security settings sebagai protected operations.
* **DILARANG** membuat settings menjadi tempat arbitrary feature flags tanpa ownership.
* **WAJIB** menyimpan authoritative configuration pada backend.
* **DILARANG** menjadikan local browser storage sebagai source of truth untuk critical configuration.

---

# 18. API Architecture

API harus dipisahkan berdasarkan responsibility.

MCP protocol:

```text
/api/mcp
```

Management API:

```text
/api/management/*
```

System API:

```text
/api/system/*
```

Conceptual API structure:

```text
app/api/
├── mcp/
│   └── route.ts
│
├── management/
│   ├── servers/
│   ├── tools/
│   ├── resources/
│   ├── prompts/
│   ├── clients/
│   ├── logs/
│   └── health/
│
└── system/
    └── health/
```

Management API digunakan oleh dashboard.

MCP endpoint digunakan oleh MCP clients.

### Rules

* **WAJIB** menjaga MCP protocol endpoint berbeda dari management API.
* **WAJIB** mempertahankan explicit API contracts.
* **WAJIB** melakukan validation pada API boundary.
* **WAJIB** melakukan authentication dan authorization pada protected endpoint.
* **DILARANG** menempatkan business logic kompleks pada route handler.
* **DILARANG** membuat management endpoint bergantung pada browser-only state.

---

# 19. Routing Boundary

Route handler HARUS mengikuti flow:

```text
Request
   ↓
Route
   ↓
Boundary Validation
   ↓
Authentication
   ↓
Authorization
   ↓
Application Service
   ↓
Result Mapping
   ↓
Response
```

Route handler HARUS tetap tipis.

Route handler TIDAK BOLEH menjadi tempat:

```text
Search algorithm
Ranking
Business rules
Database orchestration
Provider routing
Cache strategy
MCP capability logic
```

### Rules

* **WAJIB** menjaga route handler fokus terhadap transport.
* **WAJIB** memindahkan reusable behavior ke application layer.
* **DILARANG** membuat route menjadi service container.
* **DILARANG** melakukan arbitrary direct infrastructure access dari routes.
* **WAJIB** melakukan error mapping pada boundary.

---

# 20. Frontend Architecture

Frontend HARUS bertanggung jawab terhadap:

```text
Presentation
Interaction
Navigation
Client state
Loading state
Error state
Composition
```

Frontend TIDAK BOLEH bertanggung jawab terhadap:

```text
Database access
Provider access
Domain rules
MCP transport
Server authorization
Infrastructure management
```

Frontend flow:

```text
Browser
   ↓
Next.js Route
   ↓
Feature
   ↓
Client Service
   ↓
API Boundary
   ↓
Application
```

### Rules

* **WAJIB** menjaga frontend independent terhadap database implementation.
* **WAJIB** menjaga frontend independent terhadap external providers.
* **DILARANG** melakukan direct database calls dari frontend.
* **DILARANG** melakukan direct provider fetch jika operation membutuhkan server credentials atau business rules.
* **WAJIB** menggunakan API/application contract.
* **WAJIB** menjaga feature boundary.
* **DILARANG** mengimpor backend runtime-only module ke client bundle.

---

# 21. Application Service

Application service HARUS menjadi pusat use case.

Contoh capability:

```text
Search
Resolve
Documentation
Audit
Compatibility
Migration
Best Practices
```

Application service bertanggung jawab terhadap orchestration.

Contoh:

```text
Search Request
     ↓
SearchApplicationService
     ↓
Intent
     ↓
Routing
     ↓
Retrieval
     ↓
Ranking
     ↓
Normalization
     ↓
Result
```

Application service TIDAK BOLEH mengetahui presentation details.

Application service TIDAK BOLEH bergantung pada MCP transport.

### Rules

* **WAJIB** menjadikan reusable use case sebagai application service.
* **WAJIB** menjaga service independent terhadap UI.
* **WAJIB** menjaga service independent terhadap protocol implementation.
* **DILARANG** menduplikasi use case antara Web dan MCP.
* **WAJIB** menggunakan domain rules ketika decision merupakan business concern.

---

# 22. Domain Layer

Domain layer HARUS menjadi pemilik business rules.

Domain dapat mencakup:

```text
Library
Documentation
Search
Sources
MCP
```

Domain TIDAK BOLEH mengetahui:

```text
React
Next.js
Browser
HTTP
MCP transport
JSON-RPC implementation
Database client
External provider SDK
```

### Rules

* **WAJIB** menyimpan business invariants pada domain boundary.
* **WAJIB** membuat domain testable tanpa UI.
* **WAJIB** menjaga domain independent dari concrete infrastructure.
* **DILARANG** membuat business rules tersebar pada UI, route, atau MCP tool.
* **DILARANG** menggunakan protocol objects sebagai domain model.
* **DILARANG** menggunakan database entities sebagai domain contract tanpa explicit boundary.

---

# 23. Infrastructure Layer

Infrastructure bertanggung jawab terhadap technical implementation:

```text
Database
Cache
HTTP
GitHub
Documentation Providers
Registries
Search Providers
Filesystem
Logging
Metrics
Tracing
```

Infrastructure HARUS menyembunyikan provider-specific implementation detail.

Flow:

```text
Application
   ↓
Infrastructure Contract
   ↓
Concrete Provider
```

Provider dapat diganti tanpa memaksa perubahan terhadap domain logic.

### Rules

* **WAJIB** mengisolasi external integration.
* **WAJIB** mengisolasi database access.
* **WAJIB** mengisolasi caching.
* **WAJIB** mengisolasi observability implementation.
* **DILARANG** menyebarkan provider-specific behavior ke domain.
* **DILARANG** menjadikan infrastructure sebagai tempat business decisions.

---

# 24. MCP Protocol Architecture

MCP HARUS diperlakukan sebagai interface terhadap application capability.

Flow:

```text
MCP Client
    ↓
Transport
    ↓
Protocol
    ↓
Authentication
    ↓
Authorization
    ↓
Registry
    ↓
Capability
    ↓
Application Service
    ↓
Domain
    ↓
Infrastructure
```

MCP protocol layer HARUS menjadi adapter.

MCP TIDAK BOLEH menjadi business layer.

### Rules

* **WAJIB** memisahkan protocol dari application logic.
* **WAJIB** memisahkan transport dari capability implementation.
* **WAJIB** memisahkan registry dari business logic.
* **DILARANG** membuat MCP protocol menjadi database access layer.
* **DILARANG** membuat MCP transport mengetahui provider implementation.
* **WAJIB** menjaga MCP implementation dapat digunakan oleh lebih dari satu client.

---

# 25. MCP Transport

Transport bertanggung jawab terhadap:

```text
Connection lifecycle
Protocol messages
Request handling
Response handling
Session behavior
Transport-specific concerns
```

Transport modern dapat menggunakan:

```text
Streamable HTTP
stdio
```

sesuai deployment model.

Transport HARUS tetap protocol-focused.

### Rules

* **WAJIB** memisahkan HTTP transport dan stdio transport.
* **WAJIB** menjaga transport independent terhadap domain.
* **WAJIB** menangani malformed request secara aman.
* **WAJIB** menerapkan timeout dan lifecycle policy yang sesuai.
* **DILARANG** menempatkan search, ranking, database, atau provider logic pada transport.
* **WAJIB** mempertahankan protocol semantics secara konsisten di seluruh transport.

---

# 26. MCP Registry

Registry HARUS menjadi canonical source untuk MCP capabilities.

Registry mencakup:

```text
Tools
Resources
Prompts
```

Registry flow:

```text
Capability Registration
        ↓
Validation
        ↓
Registry
        ↓
Deterministic Lookup
        ↓
Execution
```

Registry HARUS bersifat deterministic.

Duplicate registration HARUS memiliki explicit failure atau conflict behavior.

### Rules

* **WAJIB** menggunakan registry sebagai source of truth.
* **WAJIB** melakukan deterministic registration.
* **WAJIB** melakukan deterministic lookup.
* **WAJIB** mendeteksi capability collision.
* **DILARANG** membuat frontend menjadi registry source of truth.
* **DILARANG** melakukan registration melalui route implementation.
* **DILARANG** menyimpan business rules di registry.

---

# 27. MCP Tool Boundary

Tool execution HARUS mengikuti:

```text
MCP Input
    ↓
Input Validation
    ↓
Authorization
    ↓
Application Service
    ↓
Result Transformation
    ↓
MCP Output
```

Contoh:

```text
MCP input
    ↓
search tool
    ↓
SearchApplicationService
    ↓
Search Domain
    ↓
Infrastructure
    ↓
Application Result
    ↓
MCP Result
```

Tool HARUS tetap tipis.

### Rules

* **WAJIB** melakukan input validation.
* **WAJIB** melakukan authorization.
* **WAJIB** memanggil application service untuk reusable use case.
* **WAJIB** melakukan result transformation pada protocol boundary.
* **DILARANG** melakukan direct arbitrary database logic pada tool.
* **DILARANG** menempatkan search algorithm pada tool.
* **DILARANG** menempatkan cache orchestration pada tool.
* **DILARANG** menduplikasi business logic antar tools.

---

# 28. MCP Resource Boundary

Resource handler HARUS mengikuti:

```text
MCP Resource Request
       ↓
Identifier Validation
       ↓
Authorization
       ↓
Application / Data Boundary
       ↓
Result Transformation
       ↓
MCP Resource
```

Resource HARUS memiliki deterministic URI.

### Rules

* **WAJIB** memvalidasi resource identifier.
* **WAJIB** menggunakan application/data boundary.
* **WAJIB** menerapkan authorization.
* **DILARANG** menempatkan reusable business logic pada resource handler.
* **DILARANG** membocorkan database representation secara langsung.

---

# 29. MCP Prompt Boundary

Prompt handler HARUS menangani prompt generation.

Prompt HARUS memiliki:

```text
Stable identifier
Description
Arguments
Generation contract
```

Prompt HARUS tetap terpisah dari tools dan resources.

### Rules

* **WAJIB** memiliki explicit prompt contract.
* **WAJIB** memvalidasi prompt arguments.
* **WAJIB** menjaga prompt generation deterministic jika semantics membutuhkan determinism.
* **DILARANG** melakukan unauthorized side effects.
* **DILARANG** menyimpan business rules tersembunyi pada prompt template.

---

# 30. Authentication and Authorization Flow

Security flow HARUS mengikuti:

```text
Request
 ↓
Transport
 ↓
Origin / Host Validation
 ↓
Authentication
 ↓
Authorization
 ↓
Rate Limit
 ↓
Schema Validation
 ↓
Application Capability
```

Authentication HARUS menentukan identity.

Authorization HARUS menentukan permission.

UI permission check hanya untuk UX.

Backend authorization HARUS menjadi authoritative security boundary.

### Rules

* **WAJIB** melakukan authentication sebelum protected operation.
* **WAJIB** melakukan authorization sebelum execution.
* **WAJIB** memusatkan credential verification.
* **WAJIB** memusatkan authorization policy.
* **DILARANG** mempercayai frontend permission state.
* **DILARANG** membuat convenience path yang bypass authorization.
* **WAJIB** menerapkan fail-closed behavior untuk security-sensitive operations.

---

# 31. Security Architecture

Semua external input HARUS dianggap untrusted.

Input dapat berasal dari:

```text
Browser
MCP Client
External API
URL
Filesystem
Environment
```

Security controls harus mencakup:

```text
Authentication
Authorization
Input validation
SSRF protection
Path traversal protection
Secret management
Rate limiting
Redaction
Origin validation
Host validation
```

### Rules

* **WAJIB** memvalidasi user-controlled URL.
* **WAJIB** menerapkan SSRF mitigation pada remote fetch.
* **WAJIB** mencegah path traversal.
* **WAJIB** menjaga secrets di server-side secure configuration.
* **DILARANG** menaruh secrets pada source code.
* **DILARANG** menulis secrets ke logs.
* **DILARANG** menggunakan debug mode sebagai security bypass.
* **WAJIB** menjaga internal diagnostics dari unauthorized access.

---

# 32. Data Flow

Data HARUS bergerak melalui explicit boundary.

External data:

```text
External Provider
      ↓
Infrastructure Adapter
      ↓
Normalization
      ↓
Application
      ↓
Domain
```

Output:

```text
Domain
   ↓
Application Result
   ↓
API / MCP Transformation
   ↓
Consumer
```

Database object TIDAK BOLEH langsung menjadi frontend model jika representation tersebut tidak sesuai.

MCP object TIDAK BOLEH menjadi domain model.

Provider response TIDAK BOLEH otomatis menjadi application contract.

### Rules

* **WAJIB** melakukan normalization pada external boundary.
* **WAJIB** melakukan transformation pada output boundary.
* **DILARANG** membocorkan provider-specific object ke domain.
* **DILARANG** membocorkan database-specific representation ke frontend.
* **DILARANG** membocorkan MCP-specific objects ke domain.

---

# 33. Search and Retrieval Pipeline

Search pipeline HARUS mempunyai execution stages yang jelas.

```text
Input
   ↓
Normalization
   ↓
Intent
   ↓
Routing
   ↓
Candidate Collection
   ↓
Fetching
   ↓
Parsing
   ↓
Filtering
   ↓
Ranking
   ↓
Deduplication
   ↓
Quality
   ↓
Result Normalization
```

Setiap stage HARUS mempunyai responsibility yang jelas.

Search pipeline HARUS dapat digunakan melalui:

```text
Dashboard
MCP
API
CLI
Background Jobs
```

tanpa duplicate implementation.

### Rules

* **WAJIB** memisahkan intent detection dari retrieval.
* **WAJIB** memisahkan candidate collection dari ranking.
* **WAJIB** memisahkan ranking dari deduplication.
* **WAJIB** melakukan result normalization.
* **DILARANG** membuat MCP tool mengimplementasikan seluruh pipeline.
* **DILARANG** membuat frontend memiliki search pipeline sendiri.
* **WAJIB** melakukan observability pada performance-sensitive stages.

---

# 34. External Provider Architecture

Setiap provider HARUS memiliki adapter boundary.

Adapter bertanggung jawab terhadap:

```text
Provider request
Provider response
Provider-specific parsing
Provider-specific error
Provider-specific limits
Provider-specific behavior
```

Application layer hanya boleh mengetahui contract yang diperlukan.

### Rules

* **WAJIB** mengisolasi provider implementation.
* **WAJIB** menormalisasi provider response.
* **WAJIB** menangani provider failure.
* **WAJIB** menyediakan fallback ketika requirement application membutuhkannya.
* **DILARANG** menyebarkan provider-specific branching.
* **DILARANG** membuat provider SDK menjadi application-wide dependency tanpa abstraction ketika portability dibutuhkan.

---

# 35. HTTP and Network Architecture

Setiap external network request HARUS memiliki:

```text
Timeout
Error handling
Response validation
Size limit
Retry policy when applicable
Backoff when applicable
Redirect policy
Concurrency control
```

Retry HARUS memperhatikan idempotency.

Circuit breaker dapat digunakan untuk dependency yang memiliki prolonged failure risk.

### Rules

* **WAJIB** menentukan timeout.
* **WAJIB** membatasi retry.
* **WAJIB** menggunakan backoff ketika retry dilakukan.
* **WAJIB** memeriksa idempotency sebelum retrying side-effect operation.
* **WAJIB** membatasi response size.
* **WAJIB** memvalidasi content type.
* **WAJIB** menangani malformed response.
* **DILARANG** melakukan unbounded retry.
* **DILARANG** melakukan unbounded concurrency.
* **WAJIB** melindungi user-controlled URL dari SSRF.

---

# 36. Database Architecture

Database access HARUS berada pada infrastructure boundary.

Database flow:

```text
Application
    ↓
Repository / Data Access Boundary
    ↓
Database
```

Transactions HARUS mempunyai explicit scope.

Query ownership HARUS jelas.

### Rules

* **WAJIB** mengisolasi raw database access.
* **WAJIB** menggunakan transactions ketika consistency membutuhkan transaction.
* **WAJIB** menghindari N+1 query.
* **WAJIB** membuat index berdasarkan actual query behavior.
* **WAJIB** memvalidasi migration.
* **WAJIB** menjaga database credentials tetap private.
* **DILARANG** melakukan raw query dari arbitrary UI module.
* **DILARANG** mengirim database entity mentah ke external consumer.
* **WAJIB** melakukan error translation pada database boundary.

---

# 37. Cache Architecture

Cache HARUS menjadi optimization layer.

Cache key harus deterministic.

Cache harus memiliki:

```text
Ownership
Key strategy
TTL
Invalidation strategy
Failure behavior
Cleanup strategy
```

Cache TIDAK BOLEH menjadi accidental source of truth.

### Rules

* **WAJIB** memiliki explicit cache ownership.
* **WAJIB** memiliki deterministic key.
* **WAJIB** menentukan expiration.
* **WAJIB** menentukan invalidation strategy.
* **WAJIB** menghindari unbounded memory growth.
* **WAJIB** menangani cache failure.
* **DILARANG** menyimpan authoritative business state hanya di volatile cache.
* **WAJIB** menggunakan negative cache hanya dengan explicit semantics.
* **WAJIB** melakukan cleanup terhadap persistent cache.

---

# 38. Error Handling

Error harus memiliki semantic category:

```text
Validation Error
Authentication Error
Authorization Error
Domain Error
External Provider Error
Infrastructure Error
Unexpected Error
```

Error mapping HARUS dilakukan pada boundary yang sesuai.

Internal implementation detail TIDAK BOLEH dikirim ke untrusted consumer.

### Rules

* **WAJIB** menggunakan consistent error model.
* **WAJIB** membedakan retryable dan non-retryable error.
* **WAJIB** mempertahankan correlation context.
* **DILARANG** mengirim stack trace kepada untrusted client.
* **DILARANG** swallowing errors tanpa alasan yang valid.
* **DILARANG** menggunakan generic error response untuk semua error internal tanpa preserving observability context.
* **WAJIB** melakukan safe error transformation pada API/MCP boundary.

---

# 39. Logging Architecture

Logging HARUS centralized dan structured.

Context yang relevan:

```text
requestId
clientId
toolName
method
duration
status
provider
error
```

Logging HARUS memberikan context yang cukup untuk debugging.

Sensitive information HARUS di-redact.

### Rules

* **WAJIB** menggunakan centralized logger.
* **WAJIB** menggunakan structured log fields.
* **WAJIB** menggunakan request/correlation identifier.
* **WAJIB** melakukan redaction terhadap sensitive values.
* **DILARANG** menggunakan `console.log` sebagai application logging strategy.
* **DILARANG** mencatat authorization headers.
* **DILARANG** mencatat access tokens.
* **DILARANG** mencatat passwords.
* **WAJIB** mempertahankan production-safe logging levels.

---

# 40. Metrics and Observability

Observability HARUS mencakup operation penting.

Metrics dapat mencakup:

```text
Request count
Success rate
Error rate
Latency
P95
P99
Cache hit rate
Cache miss rate
Tool usage
Source usage
Provider failures
```

MCP execution HARUS dapat ditelusuri.

External provider execution HARUS dapat diobservasi.

Cache behavior HARUS dapat diukur ketika relevan.

### Rules

* **WAJIB** menggunakan centralized metrics.
* **WAJIB** menggunakan semantic metric naming.
* **WAJIB** mengukur latency pada meaningful boundaries.
* **WAJIB** menyediakan error metrics.
* **WAJIB** menyediakan enough telemetry untuk root cause analysis.
* **DILARANG** mengumpulkan telemetry tanpa mempertimbangkan privacy dan security.
* **WAJIB** memisahkan operational metrics dari business analytics.

---

# 41. Health and Readiness

Health checks HARUS mempunyai deterministic semantics.

Conceptual distinction:

```text
Liveness
    = process/service masih hidup

Readiness
    = service siap menerima workload
```

Dependency health dapat mencakup:

```text
Database
Cache
External Providers
MCP runtime
```

### Rules

* **WAJIB** menggunakan timeout pada health checks.
* **WAJIB** membedakan liveness dan readiness ketika deployment membutuhkan.
* **WAJIB** mencegah health endpoint membocorkan sensitive data.
* **DILARANG** menjalankan workload mahal dari health endpoint tanpa alasan.
* **WAJIB** membedakan service failure dari dependency degradation ketika memungkinkan.

---

# 42. Configuration Architecture

Configuration HARUS centralized dan typed.

Configuration dapat berasal dari:

```text
Environment
Runtime configuration
Application configuration
Feature flags
MCP configuration
Provider configuration
```

Environment variable HARUS divalidasi.

Critical configuration HARUS fail fast ketika invalid.

### Rules

* **WAJIB** memiliki single configuration access boundary.
* **WAJIB** melakukan schema validation terhadap environment.
* **DILARANG** menyebarkan arbitrary `process.env` access.
* **WAJIB** memisahkan secret configuration dari public configuration.
* **WAJIB** memiliki explicit default atau explicit failure behavior.
* **WAJIB** memberikan lifecycle terhadap feature flags.
* **DILARANG** menyimpan production secrets di source repository.

---

# 43. Dependency Direction

Dependency HARUS mengalir dari outer layer menuju inner capability.

Web:

```text
App
 ↓
Web
 ↓
Application
 ↓
Domain
 ↓
Infrastructure
```

MCP:

```text
MCP
 ↓
Application
 ↓
Domain
 ↓
Infrastructure
```

Inner layer TIDAK BOLEH mengetahui outer implementation.

### Rules

* **WAJIB** menjaga dependency direction satu arah.
* **WAJIB** mencegah circular dependency.
* **DILARANG** domain mengimpor frontend.
* **DILARANG** application mengimpor UI.
* **DILARANG** infrastructure mengimpor frontend.
* **DILARANG** MCP transport mengimpor frontend.
* **DILARANG** shared UI mengimpor feature business implementation.
* **WAJIB** menggunakan dependency inversion bila domain/application membutuhkan external implementation.

---

# 44. Module Ownership

Setiap module HARUS memiliki owner responsibility yang jelas.

Ownership berdasarkan semantic responsibility, bukan file extension.

Contoh:

```text
UI concern
    → Web

Business use case
    → Application

Business rule
    → Domain

Technical integration
    → Infrastructure

Protocol adaptation
    → MCP
```

### Rules

* **WAJIB** menentukan ownership sebelum membuat module.
* **WAJIB** menempatkan feature-specific logic pada feature owner.
* **WAJIB** menempatkan technical implementation pada infrastructure owner.
* **WAJIB** menempatkan protocol adaptation pada protocol boundary.
* **DILARANG** memindahkan module menjadi shared hanya karena dipakai lebih dari satu tempat.
* **DILARANG** membuat shared module menjadi dumping ground.

---

# 45. Utilities and Shared Code

Utility HARUS tetap generic.

Utility TIDAK BOLEH menyembunyikan business rules.

Jika utility mulai mengetahui domain-specific concepts seperti:

```text
Project
Library
MCP
Search
Analytics
Database
User
```

ownership harus dievaluasi kembali.

### Rules

* **WAJIB** mempertahankan utility tetap generic.
* **WAJIB** memindahkan domain-specific behavior ke owner yang tepat.
* **DILARANG** menggunakan `utils` sebagai tempat menyimpan logic yang belum memiliki architecture boundary.
* **DILARANG** membuat `helpers`, `misc`, atau `common` menjadi dumping ground.
* **WAJIB** menjaga shared code memiliki semantic reason untuk menjadi shared.

---

# 46. Type and Contract Architecture

Public boundaries HARUS mempunyai explicit contract.

Contract dapat mencakup:

```text
API input
API output
Application input
Application output
Domain model
MCP input
MCP output
Configuration
Provider response
```

External data HARUS divalidasi sebelum dipercaya sebagai typed data.

### Rules

* **WAJIB** menggunakan strong typing.
* **WAJIB** menghindari `any`.
* **WAJIB** melakukan validation terhadap external data.
* **DILARANG** menggunakan type assertion untuk menyembunyikan uncertainty.
* **DILARANG** menduplikasi type definition yang merepresentasikan contract yang sama.
* **WAJIB** melakukan type transformation pada boundary.

---

# 47. Dead Code and Duplicate Code

Dead code HARUS dihapus.

Termasuk:

```text
Unused imports
Unused functions
Unused types
Unused constants
Unused exports
Unused routes
Unused flags
Unused configuration
Obsolete compatibility code
```

Duplicate code HARUS diidentifikasi dan dihapus ketika semantic behavior memang sama.

### Rules

* **WAJIB** menghapus dead code.
* **WAJIB** menghapus duplicate business logic.
* **WAJIB** menghapus duplicate validation logic.
* **WAJIB** menghapus duplicate API behavior.
* **WAJIB** menghapus duplicate MCP behavior.
* **DILARANG** mempertahankan code hanya sebagai backup.
* **DILARANG** membuat abstraction hanya untuk menghilangkan accidental duplication.
* **WAJIB** mempertahankan abstraction berdasarkan semantic ownership dan actual reuse.

---

# 48. Testing Architecture

Testing HARUS mengikuti layer architecture.

Domain:

```text
Unit Tests
```

Application:

```text
Unit Tests
Integration Tests
```

Infrastructure:

```text
Integration Tests
Provider Tests
```

MCP:

```text
Tool Tests
Resource Tests
Prompt Tests
Registry Tests
Transport Tests
Integration Tests
```

Frontend:

```text
Component Tests
Feature Tests
End-to-End Tests
```

Critical workflow HARUS memiliki end-to-end coverage.

### Rules

* **WAJIB** menguji domain logic secara independent.
* **WAJIB** menguji application service.
* **WAJIB** menguji infrastructure boundary yang penting.
* **WAJIB** menguji MCP primitives.
* **WAJIB** menguji transport behavior.
* **WAJIB** menguji authentication dan authorization.
* **WAJIB** menguji critical frontend workflows.
* **WAJIB** membuat regression test untuk defect penting.
* **DILARANG** menghapus test hanya untuk membuat build pass.
* **DILARANG** memverifikasi implementation detail yang tidak relevan terhadap behavior.

---

# 49. Maintenance Flow

Maintenance HARUS diarahkan berdasarkan root cause dan architecture boundary.

UI bug:

```text
Bug
 ↓
Web Feature
 ↓
Component / Hook
 ↓
Frontend Test
```

Business logic bug:

```text
Bug
 ↓
Application / Domain
 ↓
Unit Test
 ↓
Integration Test
```

MCP protocol bug:

```text
Bug
 ↓
MCP Transport / Registry / Adapter
 ↓
Protocol Test
```

External provider bug:

```text
Bug
 ↓
Infrastructure Provider Adapter
 ↓
Provider Test
 ↓
Integration Test
```

Perubahan HARUS dilakukan pada layer yang memiliki responsibility terhadap defect.

### Rules

* **WAJIB** mencari root cause.
* **WAJIB** memperbaiki defect pada layer yang tepat.
* **DILARANG** memperbaiki backend defect dengan frontend workaround jika root cause berada di backend.
* **DILARANG** memperbaiki MCP protocol problem dengan business logic duplication.
* **WAJIB** melakukan regression validation setelah maintenance.
* **WAJIB** mempertahankan behavior yang tidak terkait dengan perubahan.

---

# 50. Refactoring Flow

Refactoring HARUS mengikuti:

```text
Inspect
    ↓
Understand
    ↓
Identify Ownership
    ↓
Define Boundary
    ↓
Refactor
    ↓
Validate
    ↓
Re-audit
```

Refactoring harus meningkatkan:

```text
Boundary clarity
Maintainability
Testability
Correctness
Complexity
Duplication
```

### Rules

* **WAJIB** memahami behavior existing sebelum refactoring.
* **WAJIB** menentukan ownership sebelum memindahkan code.
* **WAJIB** memvalidasi behavior setelah refactoring.
* **DILARANG** melakukan rewrite hanya untuk perubahan kosmetik.
* **DILARANG** memindahkan code tanpa memahami dependency.
* **DILARANG** membuat abstraction sebelum memahami actual responsibility.
* **WAJIB** menghapus obsolete compatibility layer setelah migration selesai.

---

# 51. Repository Inspection

Repository inspection HARUS mencakup context yang dapat memengaruhi behavior.

Minimal secara konseptual:

```text
Source code
Tests
Package manifests
Runtime configuration
Build configuration
Database schema
Environment configuration
CI configuration
Documentation
```

Decision tidak boleh dibuat berdasarkan partial inspection ketika file yang belum diperiksa dapat mengubah kesimpulan.

### Rules

* **WAJIB** memahami existing architecture sebelum structural changes.
* **WAJIB** membaca file yang relevan terhadap behavior yang akan diubah.
* **WAJIB** memeriksa tests sebelum mengubah behavior penting.
* **WAJIB** memeriksa dependency dan runtime compatibility sebelum migration.
* **DILARANG** mengasumsikan API, dependency, type, route, atau configuration tanpa verification.
* **DILARANG** menganggap partial source inspection sebagai complete context.

---

# 52. Runtime Lifecycle

Application initialization HARUS deterministic.

Conceptual flow:

```text
Load Configuration
       ↓
Validate Configuration
       ↓
Initialize Infrastructure
       ↓
Initialize Application Services
       ↓
Load MCP Registry
       ↓
Initialize MCP Transport
       ↓
Ready
```

Startup failure HARUS fail clearly.

Partial initialization HARUS ditangani dengan aman.

Resource cleanup HARUS tersedia untuk shutdown.

### Rules

* **WAJIB** memusatkan initialization.
* **WAJIB** menentukan initialization order.
* **WAJIB** memvalidasi critical configuration sebelum startup selesai.
* **WAJIB** menangani partial startup failure.
* **WAJIB** menyediakan shutdown cleanup.
* **DILARANG** membuat implicit initialization dari arbitrary imports.
* **DILARANG** membuat initialization order bergantung pada module import side effect.

---

# 53. Background Work

Background tasks HARUS mempunyai explicit lifecycle.

Minimum concerns:

```text
Lifecycle
Retry
Cancellation
Concurrency
Observability
Cleanup
Idempotency
```

### Rules

* **WAJIB** membatasi concurrency.
* **WAJIB** memiliki retry policy ketika diperlukan.
* **WAJIB** memastikan retry tidak menghasilkan duplicate side effects.
* **WAJIB** menyediakan cancellation behavior untuk long-running jobs.
* **WAJIB** menyediakan observability.
* **WAJIB** membersihkan resource.
* **DILARANG** membuat background task dengan unbounded memory atau concurrency.
* **WAJIB** memperhitungkan duplicate execution.

---

# 54. Performance

Performance optimization HARUS berdasarkan measurement atau evidence.

Area optimization dapat mencakup:

```text
Caching
Memoization
Concurrency
Parallelism
Batching
Prefetching
Streaming
```

Optimization TIDAK BOLEH mengorbankan correctness.

### Rules

* **WAJIB** mengukur performance sebelum melakukan optimization yang signifikan.
* **WAJIB** menghindari unnecessary network calls.
* **WAJIB** menghindari unnecessary database queries.
* **WAJIB** mencegah duplicate expensive computation.
* **WAJIB** membatasi concurrency.
* **WAJIB** membatasi memory growth.
* **DILARANG** melakukan micro-optimization tanpa measurable benefit.
* **DILARANG** mengorbankan correctness untuk performance yang belum terbukti diperlukan.

---

# 55. Resource Safety

Resource lifecycle HARUS jelas.

Resources mencakup:

```text
Database connections
HTTP connections
File handles
Streams
Timers
Temporary files
Temporary directories
Buffers
Background tasks
```

Cleanup HARUS terjadi pada:

```text
Success
Failure
Cancellation
Shutdown
```

### Rules

* **WAJIB** memastikan resource cleanup.
* **WAJIB** menangani cleanup pada exception path.
* **WAJIB** menangani cancellation.
* **WAJIB** mencegah file descriptor leak.
* **WAJIB** mencegah unbounded memory growth.
* **DILARANG** meninggalkan timer atau interval tanpa lifecycle ownership.
* **DILARANG** membuat temporary resource tanpa cleanup strategy.

---

# 56. Backward Compatibility

Public contract HARUS dianggap stable sampai breaking change memang direncanakan.

Public contract dapat berupa:

```text
API
MCP tool name
MCP tool schema
MCP resource URI
MCP prompt identifier
Configuration contract
```

Breaking change HARUS dilakukan secara intentional.

### Rules

* **WAJIB** mengidentifikasi public contract sebelum perubahan.
* **WAJIB** mempertimbangkan backward compatibility.
* **WAJIB** memberikan migration strategy ketika diperlukan.
* **DILARANG** mengubah MCP tool name secara diam-diam.
* **DILARANG** mengubah MCP input schema secara incompatible tanpa migration strategy.
* **WAJIB** menghapus deprecated contract setelah migration lifecycle selesai.
* **DILARANG** mempertahankan compatibility layer tanpa removal criteria.

---

# 57. Serialization

Serialization HARUS berada pada boundary yang sesuai.

Boundary dapat berupa:

```text
Database serialization
API serialization
MCP serialization
External provider serialization
```

Domain model HARUS tidak terikat terhadap serialization format.

### Rules

* **WAJIB** melakukan serialization pada boundary.
* **WAJIB** memvalidasi serialized external data.
* **DILARANG** menjadikan MCP response object sebagai domain object.
* **DILARANG** menjadikan database row sebagai public API contract secara otomatis.
* **WAJIB** menangani serialization failure secara explicit.

---

# 58. Initialization and Registry Lifecycle

MCP registry lifecycle HARUS deterministic.

Conceptual lifecycle:

```text
Configuration
    ↓
Capability Discovery
    ↓
Schema Validation
    ↓
Registration
    ↓
Registry Ready
    ↓
Transport Ready
```

Registry TIDAK BOLEH tersedia dalam partially initialized state untuk production traffic.

### Rules

* **WAJIB** memastikan registry fully initialized sebelum traffic diterima.
* **WAJIB** fail startup ketika critical capability registration gagal.
* **WAJIB** melakukan capability collision detection.
* **DILARANG** melakukan lazy registration tanpa lifecycle policy yang jelas.
* **WAJIB** menjaga registry state consistent selama runtime.

---

# 59. Data Consistency

Application HARUS menentukan ownership authoritative data.

Contoh:

```text
Database
    = persistent source of truth

Cache
    = optimization

Registry
    = runtime capability source

Observability
    = operational telemetry
```

Data copy HARUS memiliki explicit reason.

### Rules

* **WAJIB** menentukan authoritative source setiap data class.
* **WAJIB** menentukan consistency model.
* **WAJIB** menentukan invalidation behavior.
* **DILARANG** membuat cache menjadi accidental source of truth.
* **DILARANG** membuat frontend state menjadi authoritative backend data.
* **WAJIB** mencegah conflicting sources of truth.

---

# 60. API and MCP Contract Evolution

API dan MCP contract HARUS diperlakukan sebagai external interface.

Contract evolution HARUS mempertimbangkan:

```text
Consumers
Backward compatibility
Versioning
Migration
Deprecation
Documentation
Testing
```

### Rules

* **WAJIB** menguji public contract setelah perubahan.
* **WAJIB** menjaga backward compatibility ketika required.
* **WAJIB** mendokumentasikan breaking change.
* **WAJIB** menyediakan migration path ketika consumer impact significant.
* **DILARANG** mengubah contract secara accidental.
* **WAJIB** melakukan integration test terhadap public protocol behavior.

---

# 61. Architecture Validation

Architecture HARUS dapat diverifikasi secara otomatis atau manual.

Validation areas:

```text
Dependency direction
Circular dependency
Boundary violation
Forbidden imports
Dead modules
Duplicate behavior
Protocol leakage
Infrastructure leakage
UI leakage
```

### Rules

* **WAJIB** mendeteksi circular dependency.
* **WAJIB** mendeteksi forbidden imports.
* **WAJIB** mendeteksi architecture boundary violation.
* **WAJIB** memeriksa unused exports dan modules.
* **WAJIB** memeriksa protocol leakage.
* **WAJIB** memeriksa infrastructure leakage.
* **WAJIB** memeriksa duplicate implementation.
* **DILARANG** menganggap successful compilation sebagai bukti architecture correctness.

---

# 62. Build and Type Safety

Project HARUS mempertahankan:

```text
Type Safety
Lint Correctness
Test Correctness
Build Correctness
```

Validation minimum:

```text
Typecheck
Lint
Tests
Production Build
```

Validation tambahan harus dilakukan sesuai perubahan.

### Rules

* **WAJIB** menyelesaikan type errors.
* **WAJIB** menyelesaikan lint errors.
* **WAJIB** menyelesaikan relevant test failures.
* **WAJIB** menyelesaikan production build failures.
* **DILARANG** men-disable lint hanya untuk menghindari failure.
* **DILARANG** meng-disable typecheck untuk menghindari failure.
* **DILARANG** menghapus test untuk membuat validation pass.
* **DILARANG** mengubah validation criteria agar implementation terlihat berhasil.

---

# 63. Autonomous Engineering Loop

Setiap engineering change HARUS mengikuti loop:

```text
Inspect
    ↓
Understand
    ↓
Implement
    ↓
Typecheck
    ↓
Lint
    ↓
Test
    ↓
Build
    ↓
Diagnose
    ↓
Fix
    ↓
Revalidate
    ↓
Re-audit
```

Loop TIDAK BOLEH berhenti hanya karena implementation telah ditulis.

Setiap validation failure HARUS dianalisis dan diperbaiki.

Setiap structural change HARUS diikuti re-validation.

### Rules

* **WAJIB** melakukan iterative validation.
* **WAJIB** memperbaiki failure sebelum completion.
* **WAJIB** melakukan re-audit setelah fix.
* **WAJIB** memeriksa regression.
* **DILARANG** berhenti setelah first-pass implementation.
* **DILARANG** menganggap task complete sebelum verification.
* **DILARANG** bypass validation untuk mempercepat completion.
* **WAJIB** mempertahankan loop sampai defined completion criteria terpenuhi.

---

# 64. Final Engineering Flow

Application harus mempunyai dua major execution flow.

Web:

```text
Browser
   ↓
Next.js Route
   ↓
Web Feature
   ↓
API / Application Boundary
   ↓
Application Service
   ↓
Domain
   ↓
Infrastructure
   ↓
Database / External Provider
```

MCP:

```text
MCP Client
   ↓
MCP Transport
   ↓
MCP Protocol
   ↓
Authentication
   ↓
Authorization
   ↓
MCP Registry
   ↓
Tool / Resource / Prompt
   ↓
Application Service
   ↓
Domain
   ↓
Infrastructure
   ↓
Database / External Provider
```

Kedua flow HARUS dapat berbagi application capability ketika use case-nya identik.

Business logic TIDAK BOLEH diduplikasi hanya karena entry point berbeda.

---

# 65. Example: Search Execution Flow

Web:

```text
/discover
   ↓
Discover Page
   ↓
useLibrarySearch()
   ↓
Discover Service
   ↓
Search Application Service
   ↓
Search Domain
   ↓
Intent
   ↓
Routing
   ↓
Provider Adapters
   ↓
Fetch
   ↓
Parse
   ↓
Rank
   ↓
Deduplicate
   ↓
Normalize
   ↓
Discover Result
```

MCP:

```text
MCP Client
   ↓
POST /api/mcp
   ↓
MCP Transport
   ↓
tools/call
   ↓
Tool Registry
   ↓
search tool
   ↓
Search Application Service
   ↓
Search Domain
   ↓
Intent
   ↓
Routing
   ↓
Provider Adapters
   ↓
Fetch
   ↓
Parse
   ↓
Rank
   ↓
Deduplicate
   ↓
Normalize
   ↓
MCP Result
```

Perbedaan hanya berada pada interface dan protocol adapter.

Core application capability HARUS tetap shared.

---

# 66. Example: MCP Tool Responsibility

Tool:

```text
search.tool
```

HARUS memiliki responsibility:

```text
Receive MCP input
Validate schema
Authorize
Call application service
Transform result
Return MCP response
```

Search implementation:

```text
SearchApplicationService
```

HARUS memiliki responsibility:

```text
Execute search use case
Coordinate domain and infrastructure
```

Search domain:

```text
SearchDomain
```

HARUS memiliki responsibility:

```text
Intent
Routing
Ranking
Deduplication
Quality
```

Infrastructure:

```text
Source adapters
HTTP
Cache
Database
```

HARUS memiliki responsibility:

```text
Technical implementation
```

Boundary HARUS tetap terpisah.

---

# 67. Maintenance and Change Impact

Perubahan harus meminimalkan blast radius.

UI-only change:

```text
Web
```

Business rule change:

```text
Application / Domain
```

Provider change:

```text
Infrastructure
```

MCP protocol change:

```text
MCP Layer
```

Database implementation change:

```text
Infrastructure
```

Observability change:

```text
Observability Infrastructure
```

### Rules

* **WAJIB** memperkirakan affected boundary sebelum perubahan.
* **WAJIB** membatasi perubahan pada layer yang relevan.
* **DILARANG** mengubah unrelated layer tanpa technical reason.
* **WAJIB** melakukan regression verification terhadap consumer yang terdampak.
* **WAJIB** menjaga blast radius tetap minimal.

---

# 68. Production Readiness

Application hanya dapat dianggap production-ready apabila:

```text
Architecture valid
Typecheck passes
Lint passes
Tests pass
Build passes
Security boundaries valid
Authentication valid
Authorization valid
Observability functional
Health checks functional
Critical external dependencies handled
MCP transport validated
MCP capabilities validated
No known dead code
No known duplicate implementation
No known critical architecture violation
```

Production readiness TIDAK BOLEH ditentukan hanya berdasarkan visual output.

---

# 69. Final Architecture Blueprint

Final architecture HARUS dapat direpresentasikan sebagai:

```text
                         ┌───────────────────┐
                         │     Web App       │
                         │     /web          │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   Application     │
                         │     Services      │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │      Domain       │
                         │  Business Rules   │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │  Infrastructure   │
                         │ DB / API / Cache  │
                         └───────────────────┘
                                   ▲
                                   │
                         ┌─────────┴─────────┐
                         │    MCP Server     │
                         │ Transport/Adapter │
                         └───────────────────┘
```

Web flow:

```text
Browser
   ↓
Route
   ↓
Feature
   ↓
Application
   ↓
Domain
   ↓
Infrastructure
```

MCP flow:

```text
MCP Client
   ↓
Transport
   ↓
Protocol
   ↓
Auth
   ↓
Authorization
   ↓
Registry
   ↓
Capability
   ↓
Application
   ↓
Domain
   ↓
Infrastructure
```

Routing responsibility:

```text
app
    = routing and request composition
```

Frontend responsibility:

```text
web
    = presentation and interaction
```

Application responsibility:

```text
application
    = use cases and orchestration
```

Domain responsibility:

```text
domain
    = business rules and invariants
```

Infrastructure responsibility:

```text
infrastructure
    = technical implementations and external systems
```

MCP responsibility:

```text
server/mcp
    = MCP protocol, transport, registry, and protocol adapters
```

Final principle:

**Routing bukan business layer. Frontend bukan business layer. MCP bukan business layer. Infrastructure bukan business policy layer. Application layer menjadi pusat use case. Domain layer menjadi pemilik business rules. MCP menjadi protocol adapter menuju application capability.**

Architecture HARUS mempertahankan prinsip tersebut pada seluruh feature, endpoint, tool, resource, prompt, provider, database operation, dan future extension.

Setiap feature baru HARUS masuk melalui boundary yang tepat.

Setiap integration baru HARUS memiliki ownership yang jelas.

Setiap protocol baru HARUS menjadi adapter, bukan menggandakan business logic.

Setiap perubahan HARUS dapat diverifikasi melalui typecheck, lint, test, build, security validation, dan architecture validation.

Tujuan akhir architecture adalah menghasilkan application yang:

```text
Modular
Maintainable
Testable
Secure
Observable
Performant
Predictable
Extensible
```

dengan dependency yang jelas, single source of truth yang terkontrol, business logic yang tidak terduplikasi, dan boundary yang tetap stabil ketika application berkembang.
