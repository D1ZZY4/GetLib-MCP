# Infrastructure, Architecture, Flows, and Engineering Blueprint

Dokumen ini mendefinisikan architecture, routing, application flow,
MCP integration, infrastructure boundary, database architecture,
environment strategy, deployment model, authentication, authorization,
observability, maintenance strategy, testing strategy, dependency direction,
dan engineering rules yang wajib diterapkan pada application.

Seluruh implementation HARUS mengikuti specification ini.
Seluruh perubahan HARUS mempertahankan boundary dan dependency direction
yang didefinisikan di dalam dokumen ini.

Seluruh architecture decision HARUS mempertimbangkan maintainability,
correctness, security, observability, performance, testability,
extensibility, deployment reliability, dan operational simplicity.

---

# 1. Application Architecture

Application harus diperlakukan sebagai satu system yang memiliki beberapa
interface dan layer dengan responsibility yang berbeda.

Application utama terdiri dari:

```text
Web Application
Application Layer
Domain Layer
Infrastructure Layer
MCP Server / Protocol Layer
Database Layer
Observability Layer
Configuration Layer
```

Architecture utama HARUS mengikuti boundary:

```text
Web Application
      ↓
Application Layer
      ↓
Domain Layer
      ↓
Infrastructure Layer
      ↓
Supabase PostgreSQL
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
      ↓
Supabase PostgreSQL / External Providers
```

Web dan MCP harus dapat menggunakan application capability yang sama ketika
keduanya menjalankan use case yang sama.

Database merupakan infrastructure dependency dan HARUS diperlakukan sebagai
persistent source of truth untuk production data.

### Rules

- **WAJIB** memisahkan routing, frontend, application, domain, infrastructure, database, dan MCP protocol concerns.
- **WAJIB** mempertahankan dependency direction yang konsisten.
- **WAJIB** menjaga setiap layer tetap berada dalam responsibility-nya.
- **DILARANG** menempatkan business logic pada routing layer.
- **DILARANG** menempatkan business logic pada frontend.
- **DILARANG** menempatkan business logic pada MCP transport.
- **DILARANG** membuat MCP tool menjadi pengganti application service.
- **DILARANG** membuat infrastructure menjadi business policy layer.
- **WAJIB** menggunakan shared application capability ketika Web dan MCP membutuhkan behavior yang sama.
- **WAJIB** menggunakan Supabase PostgreSQL sebagai production database.
- **WAJIB** menjaga architecture independent terhadap interface tertentu.

---

# 2. Control Plane Model

Application harus diperlakukan sebagai control plane yang menyediakan
visibility, configuration, discovery, execution, dan observability terhadap
MCP capability serta supporting services.

Control plane memiliki dua kelompok concern utama:

```text
Management
    ↓
Configuration / Discovery / Monitoring / Administration

Execution
    ↓
MCP protocol / Tools / Resources / Prompts / Application capabilities
```

Dashboard mengelola dan mengobservasi system.

MCP server menyediakan capability kepada MCP clients.

Keduanya HARUS menggunakan backend capability yang sama jika semantics
operation-nya identik.

### Rules

- **WAJIB** memisahkan management concern dan execution concern.
- **WAJIB** membuat dashboard menjadi control surface, bukan source of truth.
- **WAJIB** menjadikan backend state sebagai authoritative state.
- **DILARANG** menyimpan configuration penting hanya di browser.
- **DILARANG** membuat UI menjadi runtime registry.

---

# 3. Root Application and Dashboard

Root route:

```text
/
```

HARUS menjadi Dashboard Overview.

Root dashboard HARUS menjadi operational entry point application.

Dashboard harus memberikan gambaran kondisi system secara keseluruhan.

Conceptual areas:

```text
Dashboard
├── System status
├── MCP summary
├── Database status
├── External dependency status
├── Usage
├── Recent activity
├── Attention required
└── Quick actions
```

System status dapat mencakup:

```text
MCP runtime
API
Supabase database
Cache
External sources
Authentication
```

MCP summary dapat mencakup:

```text
Registered servers
Registered tools
Registered resources
Registered prompts
Connected clients
```

Usage dapat mencakup:

```text
Requests
Success rate
Error rate
Latency
Database operations
Cache behavior
```

Root dashboard harus menjawab:

> "Apa kondisi sistem saya sekarang?"

Root dashboard bukan sitemap yang diberi kartu dan chart.

### Rules

- **WAJIB** menggunakan `/` sebagai operational dashboard.
- **WAJIB** menampilkan system status yang relevan.
- **WAJIB** menampilkan database status ketika database-backed capability digunakan.
- **WAJIB** menampilkan critical warnings yang membutuhkan tindakan.
- **DILARANG** membuat root dashboard menjadi sekadar welcome page.
- **DILARANG** membuat duplicate dashboard route tanpa semantic purpose.
- **DILARANG** mengambil data dashboard langsung dari database client pada UI.

---

# 4. Primary Application Routes

Primary routes HARUS memiliki semantic responsibility yang jelas.

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
```

Recommended semantics:

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
/mcp/clients       → MCP Client Management
/mcp/playground    → MCP Capability Testing
/mcp/logs          → MCP Request Observability
/mcp/health        → MCP Operational Health

/settings          → Application Settings
```

Authentication route:

```text
/signin
```

Additional authentication routes dapat dibuat hanya jika functionality tersebut
memang diperlukan.

### Rules

- **WAJIB** memberi semantic meaning pada setiap route.
- **WAJIB** menghindari duplicate route.
- **WAJIB** memisahkan browser route dari protocol endpoint.
- **DILARANG** membuat route hanya karena sebuah component membutuhkan URL.
- **WAJIB** menggunakan canonical route definitions pada navigation dan links.

---

# 5. Discover

Route:

```text
/discover
```

HARUS menjadi user-facing discovery interface.

Discovery dapat mencakup:

```text
Search
Filters
Library catalog
Version
Source
Framework
Language
Popularity
Availability
```

Discovery berfungsi menemukan candidate data.

Discovery tidak bertanggung jawab terhadap installation.

Flow:

```text
User
 ↓
Discover UI
 ↓
Discover API
 ↓
Application Service
 ↓
Search / Retrieval Domain
 ↓
Source Infrastructure
 ↓
Normalized Result
 ↓
Discover UI
```

### Rules

- **WAJIB** memisahkan search behavior dari presentation.
- **WAJIB** menggunakan application capability untuk search.
- **DILARANG** menempatkan ranking atau provider routing pada React component.
- **DILARANG** melakukan direct external fetch dari discovery UI.
- **WAJIB** melakukan result normalization sebelum hasil dikonsumsi frontend.

---

# 6. Install

Route:

```text
/install
```

HARUS menangani installation dan setup workflow.

Installation dapat menghasilkan:

```text
Install instructions
MCP configuration
Client configuration
CLI commands
Framework-specific setup
```

Client target dapat mencakup:

```text
Claude Code
Cursor
VS Code
OpenCode
Codex
Custom MCP clients
```

Discovery dan installation HARUS tetap berbeda.

```text
Discover
    = menemukan

Install
    = menggunakan
```

### Rules

- **WAJIB** memisahkan discovery lifecycle dan installation lifecycle.
- **WAJIB** menggunakan canonical source metadata.
- **WAJIB** menggunakan typed configuration contract.
- **DILARANG** menduplikasi source metadata hanya untuk installation UI.
- **DILARANG** hardcode client-specific behavior pada page component.

---

# 7. Sources

Route:

```text
/sources
```

HARUS menjadi Source Management interface.

Source management mencakup:

```text
Active sources
Disabled sources
Source health
Source priority
Source type
Last sync
Add source
Edit source
Test source
```

Source merupakan data acquisition layer.

Source bukan MCP primitive.

Flow:

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

- **WAJIB** mengisolasi provider-specific behavior.
- **WAJIB** mempunyai explicit source identity.
- **WAJIB** mempunyai source health state.
- **WAJIB** memiliki source priority policy jika routing memerlukannya.
- **WAJIB** menyimpan source configuration pada backend ketika configuration tersebut bersifat authoritative.
- **DILARANG** menempatkan provider-specific implementation pada MCP tool.
- **DILARANG** menganggap source sebagai MCP primitive secara otomatis.
- **WAJIB** menganggap external source content sebagai untrusted input.

---

# 8. Statistics

Route:

```text
/statistics
```

HARUS menjadi analytics dan observability presentation layer.

Statistics dapat mencakup:

```text
Request volume
Tool usage
Search usage
Resolve usage
Fetch usage
Database query volume
Cache hit rate
Cache miss rate
Average latency
P95 latency
P99 latency
Error rate
Source popularity
Library popularity
```

Logical sections:

```text
Overview
Requests
Tools
Sources
Database
Performance
Errors
```

Statistics HARUS menggunakan server-side authoritative telemetry.

### Rules

- **WAJIB** menggunakan centralized telemetry.
- **WAJIB** membedakan usage analytics dari operational health.
- **WAJIB** menggunakan consistent metric definitions.
- **DILARANG** membuat setiap feature menghitung metric yang sama secara berbeda.
- **DILARANG** menjadikan chart component sebagai metric calculation layer.

---

# 9. MCP Control Center

Route:

```text
/mcp
```

HARUS menjadi MCP operational control center.

MCP overview harus memberikan visibility terhadap:

```text
Server status
Connected clients
Registered tools
Registered resources
Registered prompts
Transport status
Database status
Request throughput
Error rate
Recent tool calls
Recent MCP errors
```

### Rules

- **WAJIB** menampilkan current MCP runtime state.
- **WAJIB** menggunakan registry sebagai authoritative capability source.
- **WAJIB** menggunakan backend state untuk runtime state.
- **DILARANG** membuat frontend menjadi source of truth untuk MCP capabilities.
- **DILARANG** mengubah runtime MCP state tanpa authorized backend operation.

---

# 10. MCP Servers

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

Detail:

```text
/mcp/servers/[serverId]
```

dapat mencakup:

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
Database dependencies
```

### Rules

- **WAJIB** menggunakan canonical server identity.
- **WAJIB** memisahkan persistent configuration dari runtime state.
- **WAJIB** memvalidasi configuration sebelum activation.
- **WAJIB** menampilkan health dari authoritative backend state.
- **DILARANG** menyimpan canonical server registry hanya pada local browser state.

---

# 11. MCP Tools

Route:

```text
/mcp/tools
```

HARUS menjadi tool catalog.

Metadata dapat mencakup:

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

Detail:

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
Implementation status
```

Tool catalog bukan tempat implementation MCP tool.

### Rules

- **WAJIB** memiliki unique identifier.
- **WAJIB** memiliki input schema.
- **WAJIB** memiliki output contract.
- **WAJIB** memiliki accurate description.
- **WAJIB** menggunakan registry sebagai canonical source.
- **DILARANG** mencampurkan tool execution code dengan UI component.
- **DILARANG** membuat dashboard metadata menjadi duplicate registry.

---

# 12. MCP Resources

Route:

```text
/mcp/resources
```

HARUS menjadi resource catalog.

Metadata dapat mencakup:

```text
Resource URI
Description
Mime type
Source
Availability
Access count
Permissions
```

Detail:

```text
/mcp/resources/[resourceId]
```

Resource URI HARUS mempunyai deterministic semantics.

### Rules

- **WAJIB** menggunakan canonical resource identity.
- **WAJIB** memvalidasi resource identifier.
- **WAJIB** menerapkan authorization.
- **DILARANG** menempatkan retrieval business logic pada UI.
- **DILARANG** membocorkan database representation secara langsung.

---

# 13. MCP Prompts

Route:

```text
/mcp/prompts
```

HARUS menjadi prompt catalog.

Metadata:

```text
Name
Description
Arguments
Usage
Version
Status
Permissions
```

Detail:

```text
/mcp/prompts/[promptName]
```

### Rules

- **WAJIB** mempunyai stable identifier.
- **WAJIB** mempunyai explicit argument contract jika diperlukan.
- **WAJIB** memisahkan prompt generation dari tool execution.
- **DILARANG** menggunakan prompt implementation sebagai business logic dumping ground.
- **DILARANG** melakukan unauthorized side effects.

---

# 14. MCP Clients

Route:

```text
/mcp/clients
```

HARUS memberikan visibility terhadap connected clients.

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
Authentication state
```

Detail:

```text
/mcp/clients/[clientId]
```

### Rules

- **WAJIB** mencatat client identity ketika tersedia.
- **WAJIB** menyimpan protocol version ketika tersedia.
- **WAJIB** memisahkan client metadata dari connection state.
- **DILARANG** menentukan capability hanya berdasarkan client name.
- **WAJIB** menggunakan negotiated capability state.

---

# 15. MCP Playground

Route:

```text
/mcp/playground
```

HARUS menyediakan capability testing interface.

Flow:

```text
Select Server
      ↓
Select Capability
      ↓
Resolve Schema
      ↓
Generate Input
      ↓
Validate Input
      ↓
Execute
      ↓
Capture Request
      ↓
Capture Response
      ↓
Capture Timing
      ↓
Capture Logs
```

Playground HARUS menggunakan execution path yang sama dengan production
capability sebisa mungkin.

### Rules

- **WAJIB** mengambil schema dari authoritative registry.
- **WAJIB** menggunakan validation contract yang sama dengan production.
- **WAJIB** menampilkan structured result.
- **WAJIB** menerapkan authentication dan authorization.
- **DILARANG** membuat playground menjadi security bypass.
- **DILARANG** menduplikasi tool implementation hanya untuk playground.

---

# 16. MCP Logs

Route:

```text
/mcp/logs
```

HARUS menjadi structured observability interface.

Filter:

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
Request ID
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
Database operations
External provider operations
```

Sensitive data HARUS disanitasi.

### Rules

- **WAJIB** menggunakan structured logging.
- **WAJIB** menyediakan request/correlation identifier.
- **WAJIB** melakukan redaction.
- **DILARANG** menyimpan raw authorization header.
- **DILARANG** menyimpan access token.
- **DILARANG** menyimpan password.
- **DILARANG** menganggap browser console sebagai observability system.
- **WAJIB** menjaga traceability sampai database/external provider operation ketika relevan.

---

# 17. MCP Health

Route:

```text
/mcp/health
```

HARUS menjadi operational health interface.

Health checks dapat mencakup:

```text
MCP endpoint
Application runtime
Supabase database
Cache
External HTTP
GitHub
Documentation sources
Search engine
Package registry
Authentication subsystem
```

Status:

```text
Healthy
Degraded
Unavailable
```

Metadata:

```text
Last check
Latency
Error
Dependency
```

### Rules

- **WAJIB** memberikan deterministic health semantics.
- **WAJIB** menggunakan timeout.
- **WAJIB** membedakan service failure dan dependency degradation ketika memungkinkan.
- **DILARANG** menjalankan workload mahal dari health endpoint tanpa alasan.
- **WAJIB** mencegah sensitive information leakage.

---

# 18. Settings and User Profile Architecture

Settings harus memiliki dua jenis concern:

```text
Application Configuration
User / Account Configuration
```

Application configuration dapat mencakup:

```text
General
Authentication
MCP
Database / Development
Advanced
```

User/account configuration mencakup identity dan preference user.

User settings HARUS dapat diakses melalui profile/avatar control pada dashboard
apabila setting tersebut tidak merupakan primary navigation concern.

Recommended profile menu:

```text
Profile
Account
Preferences
Development
Security
About
Sign out
```

Menu tersebut TIDAK WAJIB muncul pada primary sidebar navigation.

### Rules

- **WAJIB** memisahkan user profile dan application configuration.
- **WAJIB** menempatkan account-related controls pada profile/avatar menu.
- **WAJIB** melindungi configuration yang memengaruhi runtime.
- **DILARANG** menyimpan authoritative application settings hanya pada browser.
- **DILARANG** menampilkan sensitive configuration value secara mentah setelah disimpan.

---

# 19. Environment Model

Application HARUS membedakan runtime environment secara otomatis.

Minimal environment:

```text
Development
Production
```

Environment detection HARUS berasal dari runtime/deployment metadata dan tidak
boleh mengandalkan user untuk memilih environment secara manual pada setiap startup.

Conceptual model:

```text
Runtime
   ↓
Environment Detection
   ↓
Development OR Production
   ↓
Environment Policy
```

Development policy dapat menggunakan:

```text
Mock Database
```

atau:

```text
Real Development Supabase Database
```

Production policy HARUS selalu menggunakan:

```text
Real Supabase Database
```

### Rules

- **WAJIB** mendeteksi development dan production secara otomatis.
- **DILARANG** meminta user memilih environment secara manual untuk runtime normal.
- **WAJIB** menggunakan environment-aware configuration.
- **WAJIB** membuat production path tidak pernah jatuh ke mock database.
- **DILARANG** menggunakan mock data pada production.
- **WAJIB** memvalidasi environment policy saat startup.

---

# 20. Development Database Strategy

Development harus menyediakan dua database mode:

```text
Mock
Real Development Database
```

Mock mode digunakan untuk development cepat, UI work, offline development,
dan testing yang tidak membutuhkan persistent external state.

Real development database digunakan ketika development membutuhkan:

```text
Real persistence
Real schema
Real queries
Authentication integration
Migrations
RLS behavior
Integration testing
```

Real development database HARUS merupakan environment Supabase development
yang terpisah dari production data.

### Development Settings

Development controls HARUS tersedia pada page settings yang terkait development.

Contoh:

```text
Settings
└── Development
    ├── Database Mode
    │   ├── Mock
    │   └── Supabase Development
    ├── Environment Status
    ├── Seed / Reset
    ├── Diagnostics
    └── Runtime Information
```

Development page HARUS menampilkan mode aktif.

### Rules

- **WAJIB** menyediakan Mock dan Real Development Database mode.
- **WAJIB** memisahkan development Supabase project dari production database.
- **WAJIB** menampilkan active database mode secara jelas.
- **WAJIB** mencegah development configuration mengarah accidental ke production database.
- **WAJIB** menyediakan reset/seed behavior hanya untuk development.
- **DILARANG** menyediakan destructive reset controls pada production UI.

---

# 21. Production Database Strategy

Production HARUS menggunakan real Supabase PostgreSQL.

Database production HARUS menjadi authoritative persistent source of truth.

Production database HARUS digunakan untuk:

```text
Users
Authentication-related application state
Application configuration
MCP metadata
Source configuration
Logs / durable observability data when persistence is required
Statistics / aggregated metrics when persistence is required
```

Database access harus melalui server-side boundary.

Untuk serverless runtime, database connection strategy HARUS memperhitungkan
short-lived execution dan connection pooling. Supabase menyediakan Supavisor,
termasuk transaction pooling untuk serverless atau edge workloads. citeturn400343search0turn400343search4

### Rules

- **WAJIB** menggunakan Supabase PostgreSQL untuk production persistence.
- **DILARANG** menggunakan mock database pada production.
- **DILARANG** menggunakan local filesystem sebagai production database.
- **WAJIB** menggunakan connection strategy yang sesuai dengan serverless runtime.
- **WAJIB** menjaga database credentials server-side.
- **WAJIB** menerapkan migration strategy.
- **WAJIB** memisahkan development dan production database.

---

# 22. Supabase Integration

Supabase digunakan sebagai database platform utama.

Supabase menyediakan full PostgreSQL database dan dapat digunakan melalui
Data API, client libraries, dan connection pooling. Untuk application traffic
dari serverless atau edge functions, transaction-mode pooling ditujukan untuk
banyak koneksi transient. citeturn400343search0turn400343search6

Application HARUS memilih connection method berdasarkan runtime.

Conceptual model:

```text
Development
    ↓
Supabase Development Project

Production
    ↓
Supabase Production Project
```

Supabase configuration HARUS terisolasi per environment.

### Rules

- **WAJIB** menggunakan Supabase sebagai persistent database platform.
- **WAJIB** mempunyai project/environment separation.
- **WAJIB** memilih connection method sesuai workload.
- **DILARANG** menggunakan production Supabase credentials pada development default path.
- **WAJIB** menggunakan secure server-side credentials untuk privileged operations.
- **WAJIB** menggunakan RLS atau equivalent authorization controls ketika data exposure melewati Supabase client/Data API.
- **WAJIB** menjaga schema dan migration tetap versioned.

---

# 23. Vercel Deployment Architecture

Application HARUS dirancang untuk native Vercel deployment.

Deployment model HARUS mempertimbangkan bahwa serverless execution bersifat
stateless dan runtime instance dapat dibuat, dibekukan, atau dihentikan.

Conceptual deployment:

```text
Git Repository
      ↓
Vercel Build
      ↓
Next.js Application
      ↓
Vercel Runtime
      ↓
Application / API / MCP Handler
      ↓
Supabase
```

Vercel dan Supabase dapat diintegrasikan melalui Vercel Marketplace; integrasi
tersebut dapat menyinkronkan environment variables ke project yang terhubung. citeturn400343search2

Application HARUS tetap memiliki typed environment validation walaupun variable
dapat disinkronkan secara otomatis.

### Rules

- **WAJIB** mendukung deployment langsung pada Vercel.
- **WAJIB** tidak bergantung pada persistent local process state.
- **WAJIB** tidak mengandalkan local filesystem sebagai durable production storage.
- **WAJIB** menyimpan persistent state pada Supabase atau external durable service.
- **WAJIB** menangani serverless lifecycle.
- **WAJIB** menggunakan environment-specific Vercel configuration.
- **DILARANG** menganggap satu runtime instance selalu hidup.
- **DILARANG** menyimpan state penting hanya pada process memory.

---

# 24. Environment Variable Architecture

Environment variable HARUS diakses melalui centralized typed configuration layer.

Application tidak boleh melakukan arbitrary environment access dari seluruh codebase.

Minimum configuration harus mencakup:

```text
GETLIB_AUTHENTICATICATION_ENABLE
GETLIB_DEFAULT_ACCOUNT
GETLIB_DEFAULT_PASS
```

Spelling variable HARUS dipertahankan persis sesuai contract application.

Additional variables dapat mencakup Supabase URL, publishable key, secret key,
database connection configuration, runtime flags, dan provider credentials.

### Rules

- **WAJIB** memusatkan environment parsing.
- **WAJIB** memvalidasi environment variables saat startup.
- **DILARANG** melakukan arbitrary direct environment access dari feature code.
- **WAJIB** membedakan public dan server-only variables.
- **DILARANG** mengekspos server secrets ke browser.
- **WAJIB** memiliki explicit default behavior untuk configuration yang memang mempunyai safe default.
- **WAJIB** menggunakan fail-fast behavior untuk required production secrets kecuali variable tersebut memang memiliki defined fallback contract.

---

# 25. Authentication Enable / Disable Model

Authentication dikendalikan oleh:

```text
GETLIB_AUTHENTICATICATION_ENABLE=true
```

atau:

```text
GETLIB_AUTHENTICATICATION_ENABLE=false
```

Ketika authentication enabled:

```text
User
 ↓
Authentication
 ↓
Session / Identity
 ↓
Authorization
 ↓
Application
```

Ketika authentication disabled:

```text
Request
 ↓
Authentication Bypass by Configuration
 ↓
Application
```

Authentication disabled TIDAK berarti security checks lain otomatis dinonaktifkan.
Authorization terhadap system capabilities, dangerous operations, management
operations, dan internal boundaries tetap HARUS diterapkan sesuai security model.

Authentication disabled berarti user tidak diwajibkan memiliki authenticated
account untuk menggunakan application interface sesuai policy.

### Rules

- **WAJIB** menentukan auth mode dari centralized configuration.
- **WAJIB** membedakan authentication dan authorization.
- **DILARANG** membuat auth-disabled mode menonaktifkan seluruh security controls.
- **WAJIB** memastikan behavior auth-enabled dan auth-disabled deterministic.
- **DILARANG** meminta login ketika authentication secara eksplisit disabled.
- **DILARANG** menganggap auth-disabled production sebagai secure default untuk public deployment tanpa explicit security policy.

---

# 26. Default Account Bootstrap

Production bootstrap account dikendalikan oleh:

```text
GETLIB_DEFAULT_ACCOUNT
GETLIB_DEFAULT_PASS
```

Fallback default account:

```text
awesomemcp@getlib-local.com
```

Fallback default password:

```text
getlib123
```

Ketika environment variable tidak diisi, application menggunakan fallback tersebut
untuk bootstrap account sesuai deployment policy.

Fallback credentials bersifat insecure dan HARUS dianggap sebagai emergency/bootstrap
default, bukan credential jangka panjang.

Dashboard HARUS menampilkan warning ketika fallback credentials sedang digunakan.

Warning harus menyatakan bahwa default credentials HARUS segera diubah.

### Rules

- **WAJIB** membaca `GETLIB_DEFAULT_ACCOUNT` dan `GETLIB_DEFAULT_PASS` dari centralized configuration.
- **WAJIB** menggunakan fallback account `awesomemcp@getlib-local.com` ketika variable kosong dan fallback behavior diizinkan oleh environment policy.
- **WAJIB** menggunakan fallback password `getlib123` ketika variable kosong dan fallback behavior diizinkan oleh environment policy.
- **WAJIB** memberikan warning yang jelas ketika fallback credentials aktif.
- **WAJIB** menyediakan mechanism untuk mengganti password bootstrap.
- **WAJIB** membatasi exposure terhadap default credentials.
- **DILARANG** menampilkan default password pada public UI tanpa authorization yang sesuai.
- **DILARANG** mencatat default password ke logs.

---

# 27. Development Account Model

Development authentication menggunakan demo identity:

```text
Account:
demo@getlibmcp.com

Password:
demo123
```

Development demo account tidak wajib disimpan pada production database.

Mock development mode dapat menggunakan demo identity secara deterministic.

Real development Supabase mode dapat menggunakan demo account yang di-seed ke
development database sesuai development initialization workflow.

### Rules

- **WAJIB** menggunakan `demo@getlibmcp.com` sebagai development demo account pada mock mode.
- **WAJIB** menggunakan `demo123` sebagai development demo password pada mock mode.
- **DILARANG** menggunakan development demo credentials pada production.
- **WAJIB** menjaga development identity terpisah dari production identity.
- **WAJIB** memastikan mock mode tidak bergantung pada production database.

---

# 28. Bootstrap Account Lifecycle

Bootstrap account flow harus mengikuti:

```text
Application Startup
      ↓
Detect Environment
      ↓
Load Auth Configuration
      ↓
Determine Auth Mode
      ↓
Determine Bootstrap Credentials
      ↓
Check Existing Account State
      ↓
Create / Ensure Bootstrap Account
      ↓
Record Bootstrap Status
      ↓
Display Warning if Default Credentials Active
```

Bootstrap process HARUS idempotent.

Jika account sudah ada, application tidak boleh membuat duplicate account.

Jika fallback credentials digunakan, dashboard harus dapat menunjukkan status:

```text
Default credentials active
```

Setelah credentials diubah, warning harus berubah sesuai state baru.

### Rules

- **WAJIB** membuat bootstrap operation idempotent.
- **WAJIB** mencegah duplicate account creation.
- **WAJIB** mendeteksi apakah bootstrap account sudah tersedia.
- **WAJIB** menyimpan status bootstrap secara authoritative.
- **DILARANG** menjalankan bootstrap pada setiap request.
- **WAJIB** menjalankan bootstrap pada initialization lifecycle yang sesuai.

---

# 29. Authentication Flow

Auth-enabled flow:

```text
Browser / MCP / API Client
          ↓
Transport
          ↓
Authentication
          ↓
Identity Resolution
          ↓
Session / Credential Validation
          ↓
Authorization
          ↓
Application Capability
```

Auth-disabled flow:

```text
Browser / MCP / API Client
          ↓
Transport
          ↓
Auth Configuration Check
          ↓
Authentication Skipped
          ↓
Configured Anonymous / Default Context
          ↓
Authorization by Policy
          ↓
Application Capability
```

Anonymous context HARUS memiliki identity semantics yang jelas jika audit,
permissions, rate limiting, atau observability membutuhkan identity.

### Rules

- **WAJIB** membuat auth mode explicit.
- **WAJIB** memvalidasi identity pada auth-enabled mode.
- **WAJIB** menggunakan anonymous context yang explicit pada auth-disabled mode jika diperlukan.
- **WAJIB** menjaga authorization terpisah dari authentication.
- **DILARANG** menggunakan fake authenticated user hanya untuk menghindari authorization checks.

---

# 30. User Settings and Account Controls

User/account settings harus berada pada profile/avatar menu dan bukan primary
navigation kecuali sebuah account feature benar-benar membutuhkan dedicated route.

Profile menu dapat berisi:

```text
Profile
Account
Preferences
Security
Development
About
Sign out
```

Profile page dapat mengatur:

```text
Display name
Email
Avatar
Default account context
```

Account page dapat mengatur:

```text
Authentication status
Password
Sessions
Account status
```

Development page dapat mengatur development runtime behavior sesuai environment.

### Rules

- **WAJIB** menempatkan account controls pada profile/avatar menu.
- **WAJIB** memisahkan personal preference dari application configuration.
- **WAJIB** memproteksi password change dan sensitive operations.
- **DILARANG** membuat password value readable kembali setelah disimpan.
- **DILARANG** menaruh production database reset controls pada user settings.

---

# 31. Management API Boundary

Management API HARUS digunakan oleh dashboard untuk configuration dan operational
management.

Conceptual structure:

```text
/api/management/
├── servers
├── tools
├── resources
├── prompts
├── clients
├── logs
├── health
├── settings
└── development
```

Management API harus menggunakan application services.

### Rules

- **WAJIB** memisahkan management API dari MCP protocol endpoint.
- **WAJIB** melakukan authentication dan authorization pada protected management endpoints.
- **WAJIB** menggunakan application service.
- **DILARANG** menempatkan business logic kompleks pada route handler.
- **DILARANG** membiarkan browser langsung mengakses Supabase privileged database credentials.

---

# 32. MCP Protocol Endpoint

MCP protocol endpoint:

```text
/api/mcp
```

HARUS menjadi protocol boundary.

Endpoint tersebut HARUS mendukung transport yang memang diimplementasikan oleh
application deployment model.

Supported transport set:

```text
Streamable HTTP
SSE
stdio
```

Setiap transport memiliki lifecycle dan execution characteristics sendiri.

### Rules

- **WAJIB** menjaga protocol endpoint terpisah dari management API.
- **WAJIB** mempertahankan protocol semantics lintas transport.
- **DILARANG** menduplikasi business logic untuk setiap transport.
- **WAJIB** menggunakan shared registry dan application capability.
- **DILARANG** menjadikan route path sebagai tool registry source of truth.

---

# 33. MCP Transport Architecture

Transport bertanggung jawab terhadap:

```text
Connection lifecycle
Protocol message handling
Request parsing
Response delivery
Session behavior
Transport-specific concerns
```

Transport implementations:

```text
transport/
├── http.ts
├── sse.ts
└── stdio.ts
```

Streamable HTTP digunakan untuk modern HTTP-based MCP serving.

SSE harus diperlakukan sebagai transport dengan connection lifecycle yang berbeda
dan tidak boleh dipaksa memiliki implementation assumptions yang sama dengan stdio.

Stdio digunakan untuk local process integration.

### Rules

- **WAJIB** memisahkan transport implementation.
- **WAJIB** menyediakan SSE transport ketika SSE compatibility memang merupakan supported requirement.
- **WAJIB** menjaga SSE session lifecycle secara explicit.
- **WAJIB** menjaga stdio bebas dari browser HTTP assumptions.
- **WAJIB** menjaga HTTP transport bebas dari process-stdin assumptions.
- **DILARANG** menaruh search, database, provider, atau business logic pada transport.
- **WAJIB** memastikan seluruh transport memanggil capability layer yang sama.

---

# 34. SSE Transport Flow

SSE transport harus mempunyai flow yang jelas:

```text
MCP Client
      ↓
SSE Connection
      ↓
Authentication
      ↓
Authorization
      ↓
Session / Connection Context
      ↓
MCP Message Handling
      ↓
Registry
      ↓
Application Capability
      ↓
SSE Event Stream
      ↓
MCP Client
```

SSE connection state HARUS dapat dilacak.

Connection termination HARUS melakukan cleanup.

SSE tidak boleh digunakan sebagai tempat menyimpan authoritative application state.

### Rules

- **WAJIB** mempunyai connection lifecycle management.
- **WAJIB** menangani client disconnect.
- **WAJIB** membersihkan session resources.
- **WAJIB** menerapkan authentication dan authorization sesuai policy.
- **WAJIB** memiliki timeout atau lifecycle strategy yang sesuai deployment environment.
- **DILARANG** mengandalkan in-memory connection state sebagai persistent source of truth.
- **WAJIB** mempertimbangkan stateless serverless execution ketika SSE di-deploy pada Vercel.

---

# 35. Streamable HTTP Transport Flow

Streamable HTTP flow:

```text
MCP Client
      ↓
HTTP Request
      ↓
Origin / Host Validation
      ↓
Authentication
      ↓
Authorization
      ↓
MCP Protocol Handling
      ↓
Registry
      ↓
Application Capability
      ↓
HTTP / Stream Response
      ↓
MCP Client
```

### Rules

- **WAJIB** menerapkan request validation.
- **WAJIB** menerapkan authentication/authorization sesuai policy.
- **WAJIB** menjaga protocol response format.
- **WAJIB** mempertimbangkan serverless execution lifecycle.
- **DILARANG** membuat HTTP route melakukan business orchestration sendiri.

---

# 36. stdio Transport Flow

stdio flow:

```text
Local MCP Client
      ↓
Process Spawn
      ↓
stdin
      ↓
MCP Protocol
      ↓
Registry
      ↓
Application Capability
      ↓
stdout
      ↓
Local MCP Client
```

Logging untuk stdio HARUS menggunakan channel yang tidak merusak protocol stream.

### Rules

- **WAJIB** menjaga stdout hanya untuk protocol output jika protocol implementation membutuhkannya.
- **WAJIB** mengarahkan diagnostics ke stderr atau dedicated logger ketika applicable.
- **DILARANG** mencetak debug output ke protocol stream.
- **WAJIB** menangani process shutdown dengan cleanup.

---

# 37. MCP Registry

Registry HARUS menjadi canonical source untuk:

```text
Tools
Resources
Prompts
```

Registry flow:

```text
Capability Definition
       ↓
Schema Validation
       ↓
Registration
       ↓
Collision Check
       ↓
Registry
       ↓
Deterministic Lookup
       ↓
Execution
```

Registry HARUS deterministic.

### Rules

- **WAJIB** menggunakan registry sebagai source of truth.
- **WAJIB** melakukan schema validation.
- **WAJIB** mendeteksi duplicate/collision.
- **WAJIB** menyediakan deterministic lookup.
- **DILARANG** melakukan registry mutation dari frontend.
- **DILARANG** membuat route filesystem menjadi registry source of truth.
- **DILARANG** menyimpan business rules pada registry.

---

# 38. MCP Capability Execution

Capability execution HARUS mengikuti:

```text
Request
   ↓
Authentication
   ↓
Authorization
   ↓
Schema Validation
   ↓
Registry Lookup
   ↓
Capability Adapter
   ↓
Application Service
   ↓
Domain
   ↓
Infrastructure
   ↓
Result
   ↓
Protocol Transformation
```

Capability adapter hanya menerjemahkan protocol input/output.

### Rules

- **WAJIB** memisahkan protocol adaptation dan application execution.
- **WAJIB** menggunakan application service untuk reusable use case.
- **DILARANG** menempatkan direct arbitrary DB access pada tool.
- **DILARANG** menduplikasi search, resolve, cache, atau provider logic pada tool.
- **WAJIB** mengembalikan contract yang sesuai protocol.

---

# 39. Application Service Layer

Application service merupakan pusat use case dan orchestration.

Capabilities dapat mencakup:

```text
Search
Resolve
Documentation
Audit
Compatibility
Migration
Best Practices
Library Discovery
Source Management
Statistics
MCP Management
```

Contoh flow:

```text
Request
   ↓
Application Service
   ↓
Validation
   ↓
Domain
   ↓
Repository / Provider
   ↓
Result
```

Application service dapat digunakan oleh:

```text
Web
API
MCP
CLI
Background Jobs
```

### Rules

- **WAJIB** menjadikan reusable use case sebagai application service.
- **WAJIB** menjaga service independent terhadap UI.
- **WAJIB** menjaga service independent terhadap MCP transport.
- **DILARANG** menduplikasi use case antar interface.
- **WAJIB** menggunakan domain rules untuk business decisions.

---

# 40. Domain Layer

Domain layer merupakan pemilik business rules dan invariants.

Domain dapat mencakup:

```text
Libraries
Documentation
Search
Sources
MCP
Accounts
Permissions
```

Domain tidak boleh mengetahui:

```text
React
Next.js
Browser
HTTP framework
MCP transport implementation
Supabase client implementation
External provider SDK
```

### Rules

- **WAJIB** menyimpan business invariants pada domain boundary.
- **WAJIB** membuat domain testable tanpa UI.
- **DILARANG** membuat domain bergantung pada concrete infrastructure implementation jika dependency inversion dibutuhkan.
- **DILARANG** menggunakan MCP objects sebagai domain model.
- **DILARANG** menggunakan raw database entities sebagai domain model tanpa explicit mapping.

---

# 41. Infrastructure Layer

Infrastructure bertanggung jawab terhadap technical implementation:

```text
Supabase
Database
Cache
HTTP
GitHub
Documentation Providers
Package Registries
Search Providers
Filesystem
Logging
Metrics
Tracing
```

Flow:

```text
Application
   ↓
Infrastructure Contract
   ↓
Concrete Implementation
```

Infrastructure harus mengisolasi provider-specific details.

### Rules

- **WAJIB** mengisolasi external integrations.
- **WAJIB** mengisolasi database access.
- **WAJIB** mengisolasi caching.
- **WAJIB** mengisolasi observability implementation.
- **DILARANG** menyebarkan provider-specific branching ke domain.
- **DILARANG** menjadikan infrastructure sebagai business policy layer.

---

# 42. Database Data Flow

Database harus menjadi bagian eksplisit dari semua flow yang memerlukan persistence.

Web flow:

```text
Browser
   ↓
Route
   ↓
Web Feature
   ↓
API / Application
   ↓
Application Service
   ↓
Domain
   ↓
Repository / Data Access
   ↓
Supabase PostgreSQL
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
Tool / Resource / Prompt
   ↓
Application Service
   ↓
Domain
   ↓
Repository / Data Access
   ↓
Supabase PostgreSQL
```

Database HARUS hanya diakses melalui server-side data boundary.

### Rules

- **WAJIB** memasukkan database access ke infrastructure/data boundary.
- **WAJIB** menggunakan Supabase untuk persistent production data.
- **DILARANG** membuat frontend melakukan privileged DB access.
- **DILARANG** membuat MCP protocol melakukan raw DB queries sebagai default behavior.
- **WAJIB** menggunakan repository/data access abstraction jika domain/application membutuhkan portability atau test isolation.

---

# 43. Repository and Data Access

Repository atau data access layer HARUS bertanggung jawab terhadap persistence
operations.

Conceptual flow:

```text
Application Service
      ↓
Repository Contract
      ↓
Supabase Implementation
      ↓
PostgreSQL
```

Repository tidak boleh menjadi business rule layer.

### Rules

- **WAJIB** memisahkan persistence logic dari business logic.
- **WAJIB** memvalidasi query result sesuai application contract.
- **WAJIB** menangani database errors.
- **WAJIB** menjaga query ownership.
- **DILARANG** menyebarkan raw SQL atau Supabase query builder operations pada arbitrary feature code.
- **DILARANG** mengirim database row mentah sebagai public API contract.

---

# 44. Database Schema and Migrations

Database schema HARUS versioned.

Migration HARUS menjadi satu-satunya mechanism untuk perubahan schema production
setelah database berada dalam managed lifecycle.

Migration harus menangani:

```text
Tables
Columns
Indexes
Constraints
Policies
Functions
Triggers
Seeds where applicable
```

### Rules

- **WAJIB** versioning migration.
- **WAJIB** menguji migration pada development database sebelum production.
- **WAJIB** mempertimbangkan backwards compatibility pada deployment yang membutuhkan.
- **DILARANG** mengubah production schema secara manual sebagai normal workflow.
- **DILARANG** mengandalkan dashboard-only database modifications tanpa migration record.
- **WAJIB** menjaga seed data development terpisah dari production data.

---

# 45. Database Security and RLS

Supabase PostgreSQL HARUS diperlakukan sebagai security boundary.

Jika data diakses melalui Supabase client/Data API, Row Level Security harus
diterapkan sesuai data ownership dan access policy. Supabase mendukung access
melalui Data API dan client libraries dengan RLS sebagai enforcement mechanism. citeturn400343search0turn400343search1

Privileged backend operation harus menggunakan server-side trusted context.

### Rules

- **WAJIB** menentukan data ownership.
- **WAJIB** menerapkan RLS atau equivalent enforcement pada data yang dapat diakses melalui public/client data path.
- **DILARANG** mengekspos privileged Supabase credentials ke browser.
- **WAJIB** memisahkan public/publishable credentials dari secret credentials.
- **WAJIB** melakukan authorization pada application boundary meskipun database policy juga ada.

---

# 46. Cache Architecture

Cache merupakan optimization layer.

Cache HARUS memiliki:

```text
Ownership
Key strategy
TTL
Invalidation
Failure behavior
Cleanup
```

Database tetap menjadi authoritative source untuk persistent state.

### Rules

- **WAJIB** menggunakan deterministic cache keys.
- **WAJIB** memiliki expiration strategy.
- **WAJIB** memiliki invalidation strategy.
- **WAJIB** menangani cache failure.
- **DILARANG** membuat cache menjadi accidental source of truth.
- **WAJIB** membatasi memory growth.

---

# 47. External Provider and HTTP Architecture

Setiap external HTTP dependency harus memiliki adapter.

External operation harus menangani:

```text
Timeout
Retry
Backoff
Redirect
Malformed response
Non-success response
Rate limiting
Response size
Concurrency
```

### Rules

- **WAJIB** menentukan timeout.
- **WAJIB** membatasi retry.
- **WAJIB** mempertimbangkan idempotency.
- **WAJIB** membatasi response size.
- **WAJIB** memvalidasi content type.
- **WAJIB** menangani malformed response.
- **DILARANG** melakukan unbounded retry.
- **DILARANG** melakukan unbounded concurrency.
- **WAJIB** menerapkan SSRF protection pada user-controlled URLs.

---

# 48. Search and Retrieval Pipeline

Search pipeline HARUS memiliki stage yang eksplisit:

```text
Input
   ↓
Normalization
   ↓
Intent Detection
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
Quality Evaluation
   ↓
Result Normalization
   ↓
Application Result
```

Search HARUS dapat digunakan melalui:

```text
Dashboard
MCP
API
CLI
Background Jobs
```

### Rules

- **WAJIB** memisahkan intent dari retrieval.
- **WAJIB** memisahkan retrieval dari ranking.
- **WAJIB** memisahkan ranking dari deduplication.
- **WAJIB** melakukan result normalization.
- **DILARANG** membuat tool MCP menjalankan seluruh search pipeline secara inline.
- **DILARANG** membuat frontend mempunyai search implementation terpisah.

---

# 49. Data Normalization and Transformation

External data harus dinormalisasi sebelum digunakan sebagai application contract.

Flow:

```text
External Data
    ↓
Validation
    ↓
Parsing
    ↓
Normalization
    ↓
Application Model
```

Output transformation:

```text
Domain/Application Result
    ↓
API / MCP Transformation
    ↓
Consumer Contract
```

### Rules

- **WAJIB** melakukan normalization pada external boundary.
- **WAJIB** melakukan transformation pada protocol boundary.
- **DILARANG** membocorkan provider-specific objects ke domain.
- **DILARANG** membocorkan database entities ke external consumer.
- **DILARANG** menjadikan protocol object sebagai internal domain representation.

---

# 50. HTTP Status and Application Result Semantics

HTTP status code HARUS merepresentasikan semantic outcome pada HTTP transport
layer. HTTP status TIDAK BOLEH diubah menjadi angka arbitrary hanya untuk
menggambarkan business state.

General semantics:

```text
200 OK
    Request berhasil diproses dan response tersedia.

201 Created
    Request berhasil membuat resource baru.

202 Accepted
    Request diterima untuk diproses secara asynchronous dan belum selesai.

204 No Content
    Request berhasil, tetapi response tidak memiliki body.

400 Bad Request
    Request malformed atau invalid pada protocol/request boundary.

401 Unauthorized
    Authentication diperlukan atau credential tidak valid.

403 Forbidden
    Identity dikenal tetapi tidak memiliki permission.

404 Not Found
    Resource yang diminta tidak ditemukan.

409 Conflict
    Operation bertabrakan dengan current state atau uniqueness constraint.

422 Unprocessable Content
    Input secara syntactic valid tetapi gagal semantic validation.

429 Too Many Requests
    Rate limit terlampaui.

500 Internal Server Error
    Unexpected internal failure.

502 Bad Gateway
    Dependency/provider upstream memberikan response invalid atau failure yang relevan sebagai gateway.

503 Service Unavailable
    Service atau dependency sementara tidak tersedia.

504 Gateway Timeout
    Dependency upstream melewati timeout.
```

Jika operation berhasil secara HTTP tetapi data result kosong, `200` tetap valid.
Contoh:

```json
{
  "data": [],
  "meta": {
    "total": 0
  }
}
```

HTTP `200` tidak berarti setiap field business data pasti berisi sesuatu.

Jika request berhasil diterima tetapi execution belum selesai, gunakan `202`.

`201` hanya digunakan ketika resource benar-benar created.

`207 Multi-Status` hanya digunakan untuk use case yang memang memiliki beberapa
sub-operation dengan independent outcome dan membutuhkan semantics multi-status.
Jangan menggunakan `207` hanya untuk mengganti `200` karena developer bingung
menggambarkan partial result.

Application-level result HARUS mempunyai structured semantics bila diperlukan:

```json
{
  "data": {},
  "error": null,
  "meta": {
    "requestId": "..."
  }
}
```

Untuk partial data yang tetap valid:

```json
{
  "data": {},
  "error": null,
  "meta": {
    "status": "partial",
    "warnings": []
  }
}
```

Business warning TIDAK BOLEH dipalsukan menjadi HTTP failure.

### Rules

- **WAJIB** menggunakan HTTP status berdasarkan semantic HTTP outcome.
- **DILARANG** menggunakan `201` hanya karena response berisi data.
- **DILARANG** menggunakan `202` untuk synchronous operation yang sudah selesai.
- **DILARANG** menggunakan `4xx` atau `5xx` hanya untuk business warning yang tidak merupakan request failure.
- **WAJIB** menggunakan `200` untuk successful empty result jika request berhasil.
- **WAJIB** menggunakan structured application metadata untuk warnings atau partial result jika diperlukan.
- **WAJIB** menggunakan `5xx` ketika server-side execution benar-benar gagal.
- **WAJIB** menggunakan `4xx` ketika client/request benar-benar menjadi penyebab failure.

---

# 51. Error Model

Error HARUS mempunyai semantic category:

```text
Validation Error
Authentication Error
Authorization Error
Domain Error
Not Found Error
Conflict Error
Rate Limit Error
External Provider Error
Database Error
Infrastructure Error
Unexpected Error
```

Error harus dipetakan ke protocol boundary.

Internal error detail tidak boleh dikirim mentah kepada untrusted client.

### Rules

- **WAJIB** menggunakan consistent error model.
- **WAJIB** membedakan retryable dan non-retryable error.
- **WAJIB** mempertahankan correlation context.
- **DILARANG** mengirim stack trace kepada untrusted consumer.
- **DILARANG** swallowing errors tanpa alasan valid.
- **WAJIB** melakukan safe error transformation pada API dan MCP boundary.

---

# 52. Logging Architecture

Logging HARUS centralized, structured, dan production-safe.

Context dapat mencakup:

```text
requestId
clientId
userId where permitted
transport
method
toolName
provider
database operation
duration
status
error
```

### Rules

- **WAJIB** menggunakan centralized logger.
- **WAJIB** menggunakan structured fields.
- **WAJIB** menggunakan request/correlation identifier.
- **WAJIB** melakukan redaction.
- **DILARANG** menggunakan `console.log` sebagai application logging strategy.
- **DILARANG** mencatat password.
- **DILARANG** mencatat access token.
- **DILARANG** mencatat raw authorization header.
- **DILARANG** mencatat secret environment value.

---

# 53. Metrics and Observability

Observability harus mencakup:

```text
Request count
Success rate
Error rate
Latency
P95
P99
Tool usage
Source usage
Database latency
Database error rate
Cache hit rate
Provider failure
Transport usage
Authentication failures
Authorization failures
```

Metrics HARUS dibedakan antara:

```text
Operational metrics
Business analytics
Security telemetry
```

### Rules

- **WAJIB** menggunakan centralized metrics.
- **WAJIB** menggunakan semantic metric naming.
- **WAJIB** mengukur latency pada meaningful boundaries.
- **WAJIB** menyediakan error metrics.
- **WAJIB** menyediakan sufficient telemetry untuk root cause analysis.
- **WAJIB** mempertimbangkan privacy.
- **DILARANG** mengumpulkan sensitive data yang tidak diperlukan.

---

# 54. Security Architecture

Security boundary HARUS berada di server-side.

Semua external input HARUS dianggap untrusted.

Input source dapat berupa:

```text
Browser
MCP Client
API Client
External API
URL
Filesystem
Environment
Database content
```

Security controls:

```text
Authentication
Authorization
Input validation
SSRF protection
Path traversal protection
Secret management
Rate limiting
Origin validation
Host validation
Redaction
Audit logging
```

### Rules

- **WAJIB** melakukan server-side security enforcement.
- **WAJIB** memvalidasi user-controlled URLs.
- **WAJIB** menerapkan SSRF mitigation.
- **WAJIB** mencegah path traversal.
- **WAJIB** menjaga secrets server-side.
- **DILARANG** menaruh secrets pada source code.
- **DILARANG** menggunakan frontend state sebagai security boundary.
- **WAJIB** menerapkan fail-closed behavior pada security-sensitive operations.

---

# 55. Database Failure and Recovery Flow

Database failure HARUS menghasilkan deterministic application behavior.

Flow:

```text
Application Request
      ↓
Database Operation
      ↓
Failure
      ↓
Classify Error
      ↓
Retry if Safe
      ↓
Fallback if Supported
      ↓
Structured Error
      ↓
Observability
```

Database timeout HARUS dapat dibedakan dari authentication failure dan business
validation failure.

### Rules

- **WAJIB** memiliki timeout policy.
- **WAJIB** melakukan bounded retry hanya jika operation aman.
- **WAJIB** mencatat database failure melalui observability.
- **DILARANG** mengubah database failure menjadi successful response hanya agar UI tidak error.
- **DILARANG** menggunakan stale cache sebagai silent replacement tanpa explicit semantics.

---

# 56. Supabase and Vercel Serverless Connection Strategy

Karena Vercel runtime dapat bersifat transient, database connection strategy harus
mempertimbangkan connection reuse, pooling, timeout, dan cleanup.

Supabase mendokumentasikan transaction-mode pooling sebagai pilihan untuk serverless
atau edge functions yang menggunakan banyak koneksi transient. citeturn400343search0

Supabase juga mendokumentasikan potensi masalah connection timeout jika client-side
persistent connections digunakan secara tidak tepat pada serverless functions. citeturn400343search4

### Rules

- **WAJIB** memilih connection strategy berdasarkan Vercel runtime characteristics.
- **WAJIB** menghindari persistent local connection assumptions.
- **WAJIB** menggunakan pooling strategy yang sesuai untuk serverless workload.
- **WAJIB** menangani stale connection dan timeout.
- **DILARANG** menganggap process reuse selalu tersedia.
- **WAJIB** melakukan connection cleanup sesuai runtime.

---

# 57. Vercel Environment Configuration Flow

Environment flow:

```text
Vercel Deployment
      ↓
Environment Metadata
      ↓
Development / Production Detection
      ↓
Environment Configuration
      ↓
Supabase Target Selection
      ↓
Authentication Policy
      ↓
Database Policy
      ↓
Application Runtime
```

Vercel environment variables dapat disediakan melalui deployment configuration
dan Supabase Vercel Marketplace integration dapat menyinkronkan variable yang
diperlukan ke project yang terhubung. citeturn400343search2

Application tetap HARUS memvalidasi environment setelah variable tersedia.

### Rules

- **WAJIB** melakukan runtime environment detection.
- **WAJIB** memetakan production deployment ke production Supabase configuration.
- **WAJIB** memetakan development ke development/mock policy.
- **DILARANG** meminta manual environment selection untuk normal startup.
- **WAJIB** fail clearly jika production configuration tidak valid dan tidak memiliki defined fallback.

---

# 58. Automatic Configuration and Environment UI

User tidak boleh diminta mengisi environment variable melalui shell untuk setiap
operational change jika application menyediakan management UI yang sesuai.

Conceptual model:

```text
User opens Settings
      ↓
Configuration UI
      ↓
Validate Value
      ↓
Persist Secure Configuration
      ↓
Update Runtime Configuration if Supported
      ↓
Show Status
      ↓
Audit / Observe Change
```

Untuk secret value, UI HARUS menggunakan write-only or masked semantics.

Environment variable bootstrap tetap dapat berasal dari deployment platform.
UI application settings tidak otomatis sama dengan process environment variable.
Jika configuration runtime membutuhkan restart/redeploy, UI harus menjelaskan status
tersebut.

### Rules

- **WAJIB** menyediakan automatic configuration discovery.
- **WAJIB** memisahkan secret configuration dari normal settings.
- **WAJIB** memvalidasi configuration sebelum persistence.
- **WAJIB** menunjukkan apakah perubahan langsung aktif atau membutuhkan restart/redeploy.
- **DILARANG** menampilkan secret value yang sudah tersimpan.
- **DILARANG** berpura-pura melakukan runtime update jika platform tidak mendukungnya.

---

# 59. Development Settings Page

Development settings hanya boleh tersedia ketika runtime benar-benar berada pada
development environment.

Recommended sections:

```text
Development
├── Environment
├── Database Mode
├── Mock Data
├── Real Supabase Development Database
├── Seed Data
├── Reset Data
├── Diagnostics
└── Runtime Information
```

Database mode:

```text
Mock
Supabase Development
```

Production HARUS menyembunyikan atau menonaktifkan destructive development controls.

### Rules

- **WAJIB** menampilkan active environment.
- **WAJIB** menampilkan active database mode.
- **WAJIB** memberikan clear indication ketika data adalah mock.
- **WAJIB** memisahkan mock dan real development state.
- **DILARANG** menyediakan reset mock/development database pada production.
- **WAJIB** mencegah accidental production targeting.

---

# 60. Database Mode Flow

Development:

```text
Environment Detection
      ↓
Development
      ↓
Database Mode
   ├── Mock
   │     ↓
   │  In-memory / deterministic mock repository
   │
   └── Real
         ↓
      Supabase Development
```

Production:

```text
Environment Detection
      ↓
Production
      ↓
Real Database Only
      ↓
Supabase Production
```

Tidak ada:

```text
Production
   ↓
Mock Database
```

### Rules

- **WAJIB** membuat production database mode fixed ke real database.
- **DILARANG** memungkinkan production memilih mock database.
- **WAJIB** membuat mock repository mengikuti application contract.
- **WAJIB** menjaga mock implementation tidak bocor ke production.

---

# 61. Full Web Request Flow

Contoh request dashboard yang membutuhkan database:

```text
Browser
   ↓
Next.js Route / Server Component
   ↓
Authentication Context
   ↓
Authorization
   ↓
Web Feature
   ↓
Application Service
   ↓
Domain Logic
   ↓
Repository
   ↓
Supabase PostgreSQL
   ↓
Repository Result
   ↓
Application Result
   ↓
API / Server Component Transformation
   ↓
Frontend UI
```

External provider dependency dapat masuk dari infrastructure layer:

```text
Domain / Application
      ↓
Provider Contract
      ↓
Provider Adapter
      ↓
GitHub / Docs / Registry / HTTP Provider
```

### Rules

- **WAJIB** menjaga flow tetap explicit.
- **WAJIB** melakukan authorization sebelum protected operation.
- **WAJIB** melakukan transformation pada output boundary.
- **DILARANG** melewati application layer tanpa technical reason yang jelas.

---

# 62. Full MCP Request Flow

Contoh tool request:

```text
MCP Client
   ↓
/api/mcp
   ↓
Transport
   ↓
Protocol Parser
   ↓
Origin / Host Validation
   ↓
Authentication
   ↓
Authorization
   ↓
Schema Validation
   ↓
MCP Registry
   ↓
Tool Adapter
   ↓
Application Service
   ↓
Domain
   ↓
Repository / Infrastructure
   ↓
Supabase PostgreSQL / External Provider
   ↓
Application Result
   ↓
MCP Result Transformation
   ↓
Transport
   ↓
MCP Client
```

### Rules

- **WAJIB** menggunakan satu application capability untuk equivalent Web/MCP use cases.
- **WAJIB** melakukan authorization sebelum execution.
- **WAJIB** melakukan protocol transformation pada boundary.
- **DILARANG** membuat MCP tool mengulang database/service logic.

---

# 63. Full MCP SSE Request and Session Flow

```text
MCP Client
   ↓
SSE Connect
   ↓
Authentication
   ↓
Authorization
   ↓
Connection Context
   ↓
MCP Request
   ↓
Registry
   ↓
Application Service
   ↓
Domain
   ↓
Database / External Provider
   ↓
MCP Event
   ↓
SSE Stream
   ↓
MCP Client
```

Connection close:

```text
Client Disconnect
      ↓
Detect Close
      ↓
Cancel Outstanding Work
      ↓
Release Resources
      ↓
Record Telemetry
      ↓
Close Context
```

### Rules

- **WAJIB** menangani client disconnect.
- **WAJIB** melakukan cleanup.
- **WAJIB** membatalkan long-running work ketika cancellation semantics memungkinkan.
- **DILARANG** menyimpan durable application state pada SSE session memory.

---

# 64. Full Application Initialization Flow

Startup flow HARUS mengikuti:

```text
Process Start
      ↓
Detect Runtime
      ↓
Detect Environment
      ↓
Load Environment Variables
      ↓
Validate Configuration
      ↓
Determine Database Mode
      ↓
Initialize Database / Mock Repository
      ↓
Initialize Infrastructure
      ↓
Initialize Application Services
      ↓
Load MCP Registry
      ↓
Initialize Transport
      ↓
Initialize Observability
      ↓
Bootstrap Account if Required
      ↓
Run Health Preconditions
      ↓
Ready
```

Production MUST fail startup if critical database configuration is invalid and
there is no explicitly defined safe fallback.

### Rules

- **WAJIB** menentukan initialization order.
- **WAJIB** memvalidasi environment sebelum readiness.
- **WAJIB** menentukan database mode sebelum application capability digunakan.
- **WAJIB** menyelesaikan critical registry initialization sebelum serving traffic jika diperlukan.
- **WAJIB** menjalankan bootstrap idempotently.
- **DILARANG** melakukan hidden initialization melalui arbitrary import side effects.

---

# 65. Full Application Shutdown Flow

```text
Shutdown Signal
      ↓
Stop New Work
      ↓
Stop Accepting New Connections
      ↓
Cancel / Drain Active Work
      ↓
Flush Observability
      ↓
Close Database / Provider Resources
      ↓
Close Transport
      ↓
Process Exit
```

### Rules

- **WAJIB** menyediakan shutdown cleanup.
- **WAJIB** menangani active request lifecycle.
- **WAJIB** memastikan resources ditutup.
- **DILARANG** meninggalkan database, network, stream, atau timer resource secara tidak terkendali.

---

# 66. Authentication and Default Account Decision Flow

```text
Startup
   ↓
Environment Detection
   ↓
Read GETLIB_AUTHENTICATICATION_ENABLE
   ↓
Auth Enabled?
   ├── YES
   │    ↓
   │  Read Default Account / Password Config
   │    ↓
   │  Fallback if Missing
   │    ↓
   │  Ensure Bootstrap Account
   │    ↓
   │  Check Default Credential State
   │    ↓
   │  Show Warning if Unchanged
   │
   └── NO
        ↓
      No Authentication Requirement
        ↓
      Anonymous / Configured Default Context
        ↓
      No Login Requirement
```

Authentication disabled tidak menghapus user settings page.

User settings tetap dapat mengatur:

```text
Authentication Enable State
Default Account
Default Password
Display Name
```

Namun semantics-nya berubah berdasarkan auth mode.

### Rules

- **WAJIB** mempertahankan configuration visibility meskipun auth disabled.
- **WAJIB** menjelaskan current auth mode kepada user.
- **DILARANG** meminta account login ketika auth disabled.
- **DILARANG** menganggap default account aktif sebagai authenticated security identity ketika auth disabled tanpa explicit policy.

---

# 67. Auth-Disabled Application Flow

Ketika authentication disabled:

```text
User
 ↓
Dashboard
 ↓
No Login Requirement
 ↓
Application Access
```

Profile menu tetap tersedia dan dapat menampilkan:

```text
Current Display Name
Authentication: Disabled
Development
Preferences
Application Settings
```

Default account/password settings tetap dapat ditampilkan pada administrative
configuration interface jika memang diperlukan oleh application contract, tetapi
secret value tetap tidak boleh ditampilkan kembali setelah disimpan.

### Rules

- **WAJIB** membuat no-auth mode benar-benar tidak membutuhkan login.
- **WAJIB** menjaga admin configuration boundary tetap protected ketika operation tersebut sensitive.
- **DILARANG** mengartikan auth disabled sebagai no security.
- **WAJIB** menjaga rate limiting, validation, SSRF protection, dan transport security tetap aktif.

---

# 68. User Identity and Display Name

Dashboard harus memiliki display identity terlepas dari authentication mode.

Auth-enabled:

```text
Authenticated User
   ↓
Profile
   ↓
Display Name
```

Auth-disabled:

```text
Configured Anonymous / Default Context
   ↓
Display Name Setting
```

Profile avatar harus menampilkan identity yang sesuai dengan current context.

### Rules

- **WAJIB** menyediakan display name semantics.
- **WAJIB** memisahkan display identity dari security identity.
- **DILARANG** menggunakan display name sebagai authorization identity.
- **WAJIB** mengaudit sensitive changes menggunakan real security identity jika authentication tersedia.

---

# 69. Profile Avatar Interaction

Profile/avatar control menjadi access point untuk secondary account and application
settings.

Conceptual interaction:

```text
Avatar
  ↓
Profile Menu
  ├── Profile
  ├── Account
  ├── Preferences
  ├── Development
  ├── Security
  ├── About
  └── Sign out
```

`Sign out` hanya ditampilkan ketika authentication enabled dan session tersedia.

### Rules

- **WAJIB** menyesuaikan menu terhadap auth mode.
- **WAJIB** menyembunyikan Sign out ketika tidak ada session yang dapat di-terminate.
- **WAJIB** menjaga sensitive actions tetap protected.

---

# 70. Maintenance Flow

Maintenance HARUS diarahkan berdasarkan root cause.

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

Business behavior bug:

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
Transport / Registry / MCP Adapter
 ↓
Protocol Test
```

Database bug:

```text
Bug
 ↓
Repository / Database Infrastructure
 ↓
Database Test
 ↓
Integration Test
```

External provider bug:

```text
Bug
 ↓
Provider Adapter
 ↓
Provider Test
 ↓
Integration Test
```

### Rules

- **WAJIB** mencari root cause.
- **WAJIB** memperbaiki defect pada layer yang benar.
- **DILARANG** memperbaiki backend defect dengan frontend workaround tanpa alasan.
- **DILARANG** memperbaiki MCP defect dengan duplicate business logic.
- **WAJIB** melakukan regression validation.

---

# 71. Refactoring Flow

Refactoring HARUS mengikuti:

```text
Inspect
    ↓
Understand
    ↓
Identify Ownership
    ↓
Identify Boundary
    ↓
Plan Minimal Change
    ↓
Implement
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

- **WAJIB** memahami existing behavior sebelum refactoring.
- **WAJIB** memahami dependency sebelum relocation.
- **WAJIB** mempertahankan behavior yang valid.
- **DILARANG** melakukan rewrite hanya untuk cosmetic reasons.
- **DILARANG** membuat abstraction tanpa semantic need.
- **WAJIB** menghapus obsolete implementation setelah migration selesai.

---

# 72. Repository Inspection

Sebelum perubahan structural, seluruh context yang relevan HARUS dipahami.

Inspection mencakup bila relevan:

```text
Source code
Tests
Package manifests
Runtime configuration
Build configuration
Database schema
Migrations
Environment configuration
CI configuration
Documentation
MCP configuration
Deployment configuration
```

### Rules

- **WAJIB** melakukan repository inspection sebelum significant changes.
- **WAJIB** membaca seluruh file yang relevan terhadap behavior yang diubah.
- **WAJIB** memeriksa tests sebelum mengubah public behavior.
- **WAJIB** memeriksa runtime dan dependency constraints.
- **DILARANG** membuat architectural decision berdasarkan partial inspection ketika file yang belum dibaca dapat mengubah kesimpulan.
- **DILARANG** mengasumsikan API atau dependency tanpa verification.

---

# 73. Dependency Direction

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
 ↓
Supabase / External Systems
```

MCP:

```text
MCP Transport
 ↓
MCP Adapter
 ↓
Application
 ↓
Domain
 ↓
Infrastructure
 ↓
Supabase / External Systems
```

Configuration and shared technical infrastructure dapat digunakan oleh layer
sesuai dependency contract tanpa membuat dependency cycle.

### Rules

- **WAJIB** menjaga dependency satu arah.
- **WAJIB** mencegah circular dependency.
- **DILARANG** domain mengimpor frontend.
- **DILARANG** application mengimpor UI.
- **DILARANG** infrastructure mengimpor feature presentation.
- **DILARANG** MCP transport mengimpor frontend.
- **WAJIB** menggunakan dependency inversion jika diperlukan.

---

# 74. Module Ownership

Ownership ditentukan berdasarkan semantic responsibility.

```text
UI
    → Web

Use Case
    → Application

Business Rule
    → Domain

Technical Integration
    → Infrastructure

Protocol Adaptation
    → MCP

Persistence
    → Database / Repository Infrastructure
```

### Rules

- **WAJIB** menentukan ownership sebelum membuat module.
- **WAJIB** menjaga public API module minimal.
- **DILARANG** menjadikan shared module sebagai dumping ground.
- **DILARANG** memindahkan feature-specific code ke shared hanya karena reuse.

---

# 75. Dead Code and Duplicate Code

Dead code HARUS dihapus.

Termasuk:

```text
Unused imports
Unused functions
Unused types
Unused constants
Unused exports
Unused routes
Unused feature flags
Unused configuration
Obsolete compatibility code
Obsolete mocks
Obsolete database adapters
```

Duplicate behavior HARUS dikonsolidasikan apabila semantic ownership sama.

### Rules

- **WAJIB** menghapus dead code.
- **WAJIB** menghapus duplicate business logic.
- **WAJIB** menghapus duplicate validation.
- **WAJIB** menghapus duplicate MCP implementation.
- **WAJIB** menghapus duplicate database behavior.
- **DILARANG** mempertahankan code sebagai backup.
- **DILARANG** membuat abstraction hanya untuk menghapus accidental duplication.

---

# 76. Type Safety and Contracts

Public boundary harus mempunyai explicit contract.

Contract meliputi:

```text
API input/output
Application input/output
Domain models
MCP input/output
Configuration
Database mapping
Provider responses
```

### Rules

- **WAJIB** menggunakan strong typing.
- **DILARANG** menggunakan `any` untuk menyembunyikan uncertainty.
- **DILARANG** menggunakan type assertions sebagai substitute untuk validation.
- **WAJIB** memvalidasi external data.
- **WAJIB** melakukan mapping antar boundary.
- **DILARANG** menduplikasi type contract yang sama pada beberapa location.

---

# 77. Testing Architecture

Testing HARUS mengikuti architecture.

```text
Domain
    → Unit Tests

Application
    → Unit + Integration Tests

Infrastructure
    → Integration + Provider Tests

Database
    → Migration + Integration Tests

MCP
    → Tool + Resource + Prompt + Registry + Transport Tests

Frontend
    → Component + Feature + E2E Tests
```

Critical flows HARUS memiliki end-to-end coverage.

Critical database behavior HARUS memiliki integration coverage terhadap real
development Supabase ketika behavior tersebut tidak dapat dipercaya melalui mock.

### Rules

- **WAJIB** menguji domain independent dari UI.
- **WAJIB** menguji application services.
- **WAJIB** menguji database integration yang critical.
- **WAJIB** menguji MCP primitives.
- **WAJIB** menguji transport behavior.
- **WAJIB** menguji authentication and authorization.
- **WAJIB** menguji environment-dependent database modes.
- **WAJIB** membuat regression test untuk critical defects.
- **DILARANG** menghapus tests untuk membuat build pass.

---

# 78. Test Environment Separation

Testing HARUS tidak mencampurkan production resources.

```text
Unit Tests
   ↓
Mock / In-memory

Integration Tests
   ↓
Development Supabase

E2E Tests
   ↓
Isolated Test Environment

Production
   ↓
Never used as test target
```

### Rules

- **WAJIB** memisahkan test database dari production database.
- **DILARANG** menjalankan destructive test terhadap production Supabase.
- **WAJIB** menggunakan deterministic fixtures.
- **WAJIB** membersihkan test state.
- **WAJIB** menjaga test credentials berbeda dari production.

---

# 79. Performance

Performance optimization HARUS berdasarkan measurement.

Area yang dapat dioptimalkan:

```text
Database queries
Caching
Concurrency
Batching
Streaming
Provider calls
Serialization
Rendering
```

### Rules

- **WAJIB** mengukur performance sebelum optimization signifikan.
- **WAJIB** menghindari unnecessary network calls.
- **WAJIB** menghindari unnecessary database queries.
- **WAJIB** membatasi concurrency.
- **WAJIB** membatasi memory growth.
- **DILARANG** melakukan micro-optimization tanpa evidence.
- **DILARANG** mengorbankan correctness demi optimization yang belum dibutuhkan.

---

# 80. Resource Lifecycle

Semua resource HARUS memiliki owner dan cleanup path.

Resources mencakup:

```text
Database connections
HTTP connections
SSE connections
Streams
Files
Timers
Background tasks
Temporary resources
```

Cleanup harus terjadi pada:

```text
Success
Failure
Cancellation
Shutdown
```

### Rules

- **WAJIB** melakukan cleanup.
- **WAJIB** menangani exception path.
- **WAJIB** menangani cancellation.
- **DILARANG** membuat resource tanpa lifecycle owner.
- **WAJIB** mencegah connection leaks.
- **WAJIB** mencegah memory leaks.

---

# 81. Background Work

Background jobs HARUS mempunyai:

```text
Lifecycle
Retry
Cancellation
Concurrency limit
Observability
Cleanup
Idempotency
```

Jobs tidak boleh bergantung pada process memory sebagai durable state.

### Rules

- **WAJIB** membatasi concurrency.
- **WAJIB** memiliki retry policy jika diperlukan.
- **WAJIB** memastikan retry tidak membuat duplicate side effects.
- **WAJIB** menyediakan cancellation behavior.
- **WAJIB** melakukan observability.
- **DILARANG** membuat unbounded background execution.

---

# 82. Backward Compatibility

Public contract dapat berupa:

```text
API endpoints
MCP tool names
MCP tool schemas
MCP resource URIs
MCP prompt identifiers
Configuration contracts
Database contracts where externally consumed
```

Breaking change HARUS dilakukan secara intentional.

### Rules

- **WAJIB** mengidentifikasi public contract sebelum perubahan.
- **WAJIB** mempertimbangkan backward compatibility.
- **WAJIB** menyediakan migration path jika diperlukan.
- **DILARANG** mengubah MCP schema secara diam-diam.
- **DILARANG** menghapus public endpoint tanpa migration atau deprecation strategy yang sesuai.

---

# 83. Architecture Validation

Architecture harus dapat diverifikasi terhadap:

```text
Dependency Direction
Circular Dependency
Boundary Violations
Forbidden Imports
Dead Code
Duplicate Implementation
Protocol Leakage
Infrastructure Leakage
UI Leakage
Database Leakage
```

### Rules

- **WAJIB** melakukan dependency validation.
- **WAJIB** mendeteksi circular dependencies.
- **WAJIB** memeriksa forbidden imports.
- **WAJIB** memeriksa duplicate implementation.
- **WAJIB** memeriksa protocol leakage.
- **WAJIB** memeriksa infrastructure leakage.
- **DILARANG** menganggap successful compilation sebagai architecture validation.

---

# 84. Build, Typecheck, Lint, Test, and Deploy Validation

Minimum validation:

```text
Typecheck
Lint
Unit Tests
Integration Tests
E2E Tests where relevant
Production Build
Architecture Validation
Database Migration Validation
```

Vercel deployment readiness juga harus diverifikasi untuk changes yang memengaruhi
deployment/runtime.

### Rules

- **WAJIB** menyelesaikan type errors.
- **WAJIB** menyelesaikan lint errors.
- **WAJIB** menyelesaikan relevant test failures.
- **WAJIB** menyelesaikan build failures.
- **WAJIB** memvalidasi migration changes.
- **DILARANG** disable validation untuk menghindari failure.
- **DILARANG** mengubah validation criteria agar implementation terlihat berhasil.

---

# 85. Autonomous Engineering Loop

Engineering work HARUS mengikuti loop:

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

Loop harus terus berjalan sampai defined completion criteria terpenuhi.

### Rules

- **WAJIB** melakukan iterative validation.
- **WAJIB** memperbaiki validation failure.
- **WAJIB** melakukan re-audit setelah fix.
- **WAJIB** memeriksa regression.
- **DILARANG** berhenti hanya karena first-pass build berhasil.
- **DILARANG** menganggap task selesai tanpa verification.
- **DILARANG** menonaktifkan typecheck, lint, test, atau build untuk menghindari failure.

---

# 86. Production Readiness

Application hanya boleh dianggap production-ready jika:

```text
Architecture valid
Typecheck passes
Lint passes
Tests pass
Production build passes
Database migration validated
Supabase production configuration valid
Authentication policy validated
Authorization validated
MCP transports validated
MCP capabilities validated
Observability functional
Health checks functional
External dependencies handled
No critical dead code
No critical duplicate implementation
No critical architecture violation
No known security bypass
```

Default credentials warning HARUS muncul apabila production menggunakan fallback
bootstrap credentials.

### Rules

- **WAJIB** melakukan production readiness validation.
- **WAJIB** memastikan production menggunakan real Supabase database.
- **WAJIB** memastikan mock database tidak aktif.
- **WAJIB** memastikan deployment configuration valid.
- **WAJIB** memastikan security boundary aktif sesuai policy.
- **DILARANG** menganggap visual correctness sebagai production readiness.

---

# 87. Final Architecture Contract

Final architecture harus dapat diringkas sebagai berikut:

```text
                              ┌─────────────────────┐
                              │     Web Application  │
                              │       /web          │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │   Application Layer │
                              │   Use Cases / Flow  │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │     Domain Layer    │
                              │   Business Rules    │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │ Infrastructure Layer│
                              │ API / Cache / DB    │
                              └──────────┬──────────┘
                                         │
                              ┌──────────┴──────────┐
                              ▼                     ▼
                       ┌────────────┐       ┌──────────────┐
                       │ Supabase   │       │ External APIs│
                       │ PostgreSQL │       │ / Providers  │
                       └────────────┘       └──────────────┘

                              ▲
                              │
                    ┌─────────┴─────────┐
                    │    MCP Server     │
                    │ Protocol Adapter  │
                    └─────────┬─────────┘
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
        Streamable HTTP       SSE            stdio
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
   ↓
Supabase / External Systems
```

MCP flow:

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
Tool / Resource / Prompt
   ↓
Application
   ↓
Domain
   ↓
Infrastructure
   ↓
Supabase / External Systems
```

Environment flow:

```text
Runtime
   ↓
Environment Detection
   ↓
Development / Production
   ↓
Database Policy
   ↓
Authentication Policy
   ↓
Configuration
   ↓
Application Runtime
```

Development database flow:

```text
Development
   ↓
Database Mode
   ├── Mock
   │    ↓
   │  Mock Repository
   │
   └── Supabase Development
        ↓
      Supabase PostgreSQL
```

Production database flow:

```text
Production
   ↓
Real Database Only
   ↓
Supabase Production PostgreSQL
```

Authentication flow:

```text
Configuration
   ↓
GETLIB_AUTHENTICATICATION_ENABLE
   ↓
Enabled / Disabled
   ├── Enabled
   │     ↓
   │   Authentication
   │     ↓
   │   Authorization
   │
   └── Disabled
         ↓
       Anonymous / Configured Context
         ↓
       Authorization by Policy
```

Bootstrap account flow:

```text
Environment
   ↓
Read GETLIB_DEFAULT_ACCOUNT
Read GETLIB_DEFAULT_PASS
   ↓
Fallback if Empty
   ↓
Ensure Bootstrap Account
   ↓
Detect Default Credentials
   ↓
Warn User
   ↓
Allow Credential Change
```

Vercel and Supabase deployment flow:

```text
Git Repository
   ↓
Vercel Build
   ↓
Vercel Runtime
   ↓
Environment Detection
   ↓
Configuration Validation
   ↓
Next.js / API / MCP
   ↓
Application Layer
   ↓
Supabase / External Providers
```

Final principle:

**Routing bukan business layer. Frontend bukan business layer. MCP bukan business layer. Infrastructure bukan business policy layer. Database bukan business policy layer. Application layer menjadi pusat use case. Domain layer menjadi pemilik business rules. Infrastructure menjadi pemilik technical integrations dan persistence. MCP menjadi protocol adapter menuju application capability. Environment policy menentukan runtime behavior. Supabase menjadi production persistence boundary. Vercel menjadi deployment/runtime boundary.**

Architecture HARUS tetap konsisten ketika jumlah feature, MCP capability, client,
provider, database operation, user, dan deployment environment bertambah.

Seluruh implementation baru HARUS mengikuti boundary yang sama.

Seluruh interface baru HARUS mengonsumsi application capability melalui boundary
yang sesuai.

Seluruh database operation baru HARUS melalui persistence boundary.

Seluruh MCP capability baru HARUS melalui registry dan protocol adapter.

Seluruh external provider baru HARUS memiliki infrastructure adapter.

Seluruh environment-sensitive behavior HARUS menggunakan centralized configuration
and runtime detection.

Seluruh production persistence HARUS menggunakan real Supabase database.

Seluruh development runtime HARUS mendukung mock atau real development Supabase
database sesuai development settings.

Seluruh default credential behavior HARUS mengikuti bootstrap contract dan warning
policy yang didefinisikan dalam dokumen ini.

Seluruh perubahan HARUS dapat diverifikasi melalui typecheck, lint, tests, build,
security validation, database validation, protocol validation, dan architecture
validation yang relevan.

Target akhir architecture:

```text
Modular
Maintainable
Testable
Secure
Observable
Performant
Predictable
Extensible
Deployment-safe
Environment-aware
Database-safe
Protocol-safe
```
