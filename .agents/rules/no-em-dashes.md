# No Em Dash Rule

Em dash character `—` **DILARANG** digunakan di seluruh project tanpa pengecualian.

Rule ini berlaku secara global terhadap seluruh source code, configuration, documentation, comments, tests, generated files, user-facing text, tool output, log message, error message, metadata, dan seluruh text atau content yang dihasilkan dalam repository maupun melalui application.

## 1. Global Prohibition

Character berikut:

```text
—
```

HARUS tidak pernah muncul pada:

```text
Source code
Comments
Documentation
Markdown
Configuration
JSON
YAML
TOML
HTML
CSS
JavaScript
TypeScript
Python
SQL
Shell scripts
Tests
Fixtures
Snapshots
Logs
Error messages
UI text
API responses
MCP responses
Generated content
Prompts
Commit messages
Changelog
README
```

Tidak ada pengecualian berdasarkan file type, layer, environment, runtime, framework, atau output destination.

## 2. Required Replacement

Gunakan punctuation alternative yang sesuai dengan konteks.

Gunakan:

```text
-
,
:
;
()
[]
```

atau struktur kalimat baru.

Contoh:

```text
SALAH:
Application layer — responsible for use cases.

BENAR:
Application layer - responsible for use cases.
```

atau:

```text
Application layer is responsible for use cases.
```

## 3. Source Code

Em dash TIDAK BOLEH muncul dalam:

```text
String literals
Comments
Template literals
Error messages
Log messages
Identifiers
Documentation comments
Test descriptions
Fixtures
Snapshots
```

Contoh yang DILARANG:

```ts
const message = "Request failed — retry later";
```

Contoh yang BENAR:

```ts
const message = "Request failed - retry later";
```

## 4. Documentation

Seluruh documentation HARUS bebas dari em dash.

Termasuk:

```text
README
Markdown
Architecture documents
Engineering rules
API documentation
MCP documentation
Developer documentation
User documentation
Changelog
Release notes
```

Generated documentation juga HARUS mengikuti rule ini.

## 5. User-Facing Content

Seluruh text yang terlihat oleh user HARUS bebas dari em dash.

Termasuk:

```text
Page titles
Descriptions
Buttons
Labels
Tooltips
Notifications
Toast messages
Error messages
Success messages
Empty states
Dialog messages
Validation messages
MCP responses
API-generated UI content
```

## 6. Generated Output

Seluruh generated output HARUS bebas dari em dash.

Rule ini berlaku terhadap:

```text
AI-generated text
Generated code
Generated documentation
Generated configuration
Generated JSON
Generated Markdown
Generated test fixtures
Generated API responses
Generated MCP responses
```

Generated content tidak dianggap valid apabila mengandung em dash.

## 7. Third-Party and External Content

External content yang berasal dari provider, API, documentation source, repository, website, atau external service dapat mengandung em dash.

External content HARUS dianggap untrusted data.

Ketika external content akan digunakan sebagai:

```text
UI content
Application output
MCP output
Documentation
Generated content
Stored normalized content
```

content HARUS dinormalisasi atau ditangani sesuai kebutuhan agar global output tidak melanggar rule ini.

Raw external payload dapat mempertahankan original content hanya apabila diperlukan untuk correctness, auditability, atau source fidelity dan tidak menjadi output yang dikendalikan application.

## 8. Data Transformation

Apabila application mentransformasikan external content, transformation layer HARUS dapat menormalkan em dash ketika output contract melarang character tersebut.

Conceptual flow:

```text
External Content
      ↓
Validation
      ↓
Normalization
      ↓
Application
      ↓
Output Transformation
      ↓
Consumer
```

Normalization tidak boleh merusak semantic meaning secara tidak perlu.

## 9. Validation

Repository validation HARUS dapat mendeteksi keberadaan em dash.

Validation harus mencakup repository content yang relevan.

Conceptual check:

```text
Search repository
      ↓
Detect "—"
      ↓
Report location
      ↓
Replace or justify external/raw-data boundary
      ↓
Validate again
```

Source-controlled files yang mengandung em dash HARUS diperbaiki kecuali secara eksplisit merupakan immutable external fixture yang memang membutuhkan exact source fidelity.

## 10. CI and Quality Gates

Apabila project mempunyai CI atau quality gate, pemeriksaan no-em-dash HARUS menjadi bagian dari validation.

Build atau validation HARUS gagal apabila prohibited em dash ditemukan pada files yang termasuk scope repository rule.

Pemeriksaan HARUS dilakukan setelah formatting dan generation agar hasil akhir tetap compliant.

## 11. Logs and Errors

Application logs dan error messages HARUS bebas dari em dash.

Contoh DILARANG:

```text
Failed to fetch source — timeout
```

Gunakan:

```text
Failed to fetch source - timeout
```

atau:

```text
Failed to fetch source: timeout
```

## 12. MCP

MCP tool descriptions, resource descriptions, prompt descriptions, tool errors, tool results, resource content, prompt output, server instructions, dan protocol-facing generated text HARUS bebas dari em dash ketika content tersebut dikontrol atau dihasilkan oleh application.

MCP responses HARUS mengikuti global text constraint ini.

External raw content yang diteruskan secara verbatim harus diperlakukan sebagai explicit raw-content exception hanya apabila exact fidelity merupakan requirement.

## 13. API

API responses yang dibentuk atau dikontrol oleh application HARUS bebas dari em dash.

Error payloads, validation messages, metadata, descriptions, and generated response content HARUS mengikuti rule ini.

Raw external payload tidak boleh dianggap application-authored content.

## 14. Comments and Code Review

Code review HARUS memperlakukan em dash sebagai style violation.

Comments yang mengandung em dash HARUS diperbaiki.

Developer tidak boleh menambahkan em dash secara sengaja.

## 15. No Circumvention

Tidak boleh menyiasati rule dengan:

```text
Unicode escape
HTML entity
Encoded representation
String concatenation
Generated runtime substitution
Indirect interpolation
```

apabila hasil akhirnya menghasilkan em dash pada controlled output.

Contoh DILARANG:

```ts
const separator = "\u2014";
```

atau bentuk encoded lain yang menghasilkan:

```text
—
```

pada output yang dikendalikan application.

## 16. Scope

Rule ini berlaku terhadap:

```text
Entire repository
Entire application
Entire backend
Entire frontend
Entire MCP server
Entire API surface
Entire documentation
Entire generated output
Entire developer-facing output
Entire user-facing output
```

Tidak ada module, feature, route, service, tool, provider adapter, test suite, script, atau documentation file yang otomatis dikecualikan.

## 17. Final Rule

Character:

```text
—
```

**MUST NEVER be intentionally introduced into controlled project content or controlled application output.**

Seluruh implementation, generated content, documentation, comments, UI text, API responses, MCP responses, logs, tests, configuration, dan repository content HARUS menggunakan punctuation alternatif yang tidak menghasilkan em dash.

No-em-dash compliance merupakan bagian dari code quality, documentation quality, output quality, dan engineering standards.
