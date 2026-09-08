# UI/UX Architecture and Centralized CSS Rules

Dokumen ini mendefinisikan standar UI/UX, styling, design system, dan arsitektur CSS untuk seluruh application.

Tujuan utamanya adalah memastikan seluruh interface memiliki visual language yang konsisten, predictable, maintainable, responsive, accessible, dan mudah dikembangkan tanpa menghasilkan CSS yang tersebar, redundant, atau saling bertabrakan.

CSS harus diperlakukan sebagai bagian dari architecture application, bukan sekadar kumpulan style untuk membuat tampilan terlihat bagus.

---

## 1. Core Principle

Seluruh styling harus menggunakan centralized styling architecture.

Tidak boleh terdapat pola di mana setiap halaman, feature, atau component membuat sistem styling sendiri tanpa alasan yang kuat.

Visual behavior seperti:

* colors
* typography
* spacing
* radius
* shadows
* borders
* breakpoints
* transitions
* focus states
* component states
* layout primitives
* sizing
* z-index
* animation

harus memiliki source of truth yang jelas dan konsisten.

Tujuan akhirnya adalah:

```text
Design Tokens
      ↓
Global CSS
      ↓
Shared UI Primitives
      ↓
Feature Components
      ↓
Pages
```

Bukan:

```text
Page
 ├── local styles
 ├── random colors
 ├── random spacing
 ├── random radius
 └── custom overrides

Component
 ├── different colors
 ├── different spacing
 └── another set of overrides
```

Sistem styling harus mengalir dari pusat ke komponen, bukan berkembang secara acak dari komponen menuju seluruh application.

---

# 2. Centralized Styling Architecture

Struktur styling utama harus memiliki boundary yang jelas.

Contoh:

```text
src/
├── app/
│   └── globals.css
│
├── web/
│   └── styles/
│       ├── tokens.css
│       └── utilities.css
│
└── ...
```

Atau, apabila project menggunakan struktur styling lain, prinsip yang sama tetap berlaku:

```text
styles/
├── tokens
├── base
├── utilities
├── components
└── themes
```

Tidak boleh ada banyak file CSS global yang melakukan pekerjaan sama.

Global CSS harus sesedikit mungkin dan memiliki responsibility yang jelas.

---

# 3. Design Tokens Are the Source of Truth

Semua nilai visual yang bersifat reusable harus berasal dari design tokens.

Design token mencakup:

```text
Color
Typography
Spacing
Sizing
Radius
Border
Shadow
Opacity
Z-index
Transition
Duration
Breakpoint
```

Contoh konsep:

```css
:root {
  --color-background: ...;
  --color-foreground: ...;
  --color-muted: ...;
  --color-border: ...;
  --color-primary: ...;

  --space-1: ...;
  --space-2: ...;
  --space-3: ...;
  --space-4: ...;

  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;

  --shadow-sm: ...;
  --shadow-md: ...;

  --duration-fast: ...;
  --duration-normal: ...;
}
```

Nilai sebenarnya harus disesuaikan dengan design system application.

Component tidak boleh membuat nilai baru secara sembarangan ketika token yang sesuai sudah tersedia.

Buruk:

```css
margin: 13px;
padding: 19px;
border-radius: 7px;
color: #8f8f8f;
```

Lebih baik menggunakan semantic token atau utility yang berasal dari design system.

Tujuannya bukan menghilangkan seluruh custom values, tetapi mencegah munculnya visual decisions yang tidak memiliki alasan.

---

# 4. Semantic Tokens Over Raw Values

Component sebaiknya menggunakan semantic meaning, bukan mengetahui detail palette.

Contoh:

```text
--color-background
--color-foreground
--color-muted
--color-border
--color-primary
--color-destructive
--color-success
--color-warning
```

lebih baik daripada:

```text
--gray-100
--gray-200
--lime-500
--red-500
```

Raw palette dapat tetap ada sebagai primitive token, tetapi component sebaiknya bergantung pada semantic tokens.

Contohnya:

```text
Primitive
    ↓
Semantic
    ↓
Component
```

Hal ini memungkinkan theme berubah tanpa harus mengedit seluruh component.

---

# 5. Theme Architecture

Theme harus centralized.

Semua theme-specific values harus didefinisikan melalui token system.

Contohnya:

```css
:root {
  --color-background: ...;
  --color-foreground: ...;
}

.dark {
  --color-background: ...;
  --color-foreground: ...;
}
```

Component tidak boleh memiliki:

```css
.dark .some-component {
  ...
}
```

untuk setiap component secara terpisah jika behavior tersebut sebenarnya dapat ditangani oleh token.

Lebih baik:

```text
Theme
  ↓
Semantic tokens change
  ↓
All components adapt automatically
```

Theme harus dapat dikembangkan tanpa membuat duplicate component styles.

---

# 6. No Random Colors

Jangan menulis warna langsung di component kecuali ada kebutuhan khusus yang benar-benar justified.

Buruk:

```tsx
<div className="bg-[#111827] text-[#f9fafb]">
```

atau:

```css
color: #84cc16;
```

ketika warna tersebut sebenarnya merupakan bagian dari design system.

Lebih baik menggunakan centralized token atau framework utility yang terhubung ke token.

Hal yang sama berlaku untuk:

```text
background
text
border
ring
shadow
hover
focus
active
disabled
```

---

# 7. Centralized Typography

Typography harus mempunyai hierarchy yang konsisten.

System harus mendefinisikan:

```text
Display
Heading
Subheading
Body
Body Small
Label
Caption
Code
```

Typography harus centralized melalui typography tokens atau shared typography primitives.

Jangan membuat:

```text
Page A:
font-size: 31px

Page B:
font-size: 30px

Page C:
font-size: 32px
```

tanpa alasan desain yang jelas.

Typography system harus menentukan:

```text
font family
font size
font weight
line height
letter spacing
```

secara konsisten.

---

# 8. Centralized Spacing System

Spacing harus mengikuti spacing scale.

Contoh:

```text
space-1
space-2
space-3
space-4
space-5
space-6
space-8
space-10
space-12
```

Component sebaiknya tidak menggunakan arbitrary spacing values apabila token yang sesuai sudah tersedia.

Spacing harus konsisten antara:

```text
Page
Section
Card
Form
List
Table
Dialog
Navigation
Toolbar
```

Dengan demikian UI terasa berasal dari satu system yang sama.

---

# 9. Centralized Layout Primitives

Layout patterns yang sering dipakai harus menjadi reusable primitives.

Contoh:

```text
Container
Stack
Inline
Grid
Section
PageHeader
PageContent
Card
Panel
Toolbar
```

Daripada setiap page membuat layout sendiri.

Contoh konseptual:

```text
Page
 ├── PageHeader
 ├── Toolbar
 └── PageContent
      ├── Grid
      └── Card
```

Layout primitive harus menyelesaikan common layout problems tanpa membuat abstraction berlebihan.

---

# 10. Page Layout Consistency

Setiap page harus memiliki struktur visual yang konsisten.

Umumnya:

```text
Page
├── Header
│   ├── Title
│   ├── Description
│   └── Actions
│
├── Filters / Toolbar
│
└── Content
```

Page tertentu dapat memiliki struktur berbeda apabila memang dibutuhkan oleh UX.

Namun perbedaan tersebut harus berasal dari kebutuhan produk, bukan karena masing-masing developer membuat layout sendiri.

---

# 11. Shared UI Components

Komponen generic harus berada di shared UI layer.

Contoh:

```text
Button
Input
Textarea
Select
Checkbox
Radio
Switch
Dialog
Drawer
Popover
Tooltip
Tabs
Badge
Card
Table
Skeleton
Pagination
Dropdown
Breadcrumb
```

Shared component harus:

* reusable
* predictable
* composable
* accessible
* theme-aware
* independent dari business domain

Shared UI tidak boleh mengetahui detail seperti:

```text
Project
Analytics
MCP
Library
Server
User
```

Komponen domain-specific harus berada di feature module.

---

# 12. Feature Styling

Feature-specific components boleh memiliki styling khusus.

Contoh:

```text
web/features/mcp/
├── components/
│   ├── mcp-server-card
│   ├── mcp-tool-list
│   └── mcp-log-viewer
```

Styling tersebut tetap harus menggunakan centralized tokens.

Feature component boleh menentukan:

```text
layout
composition
component-specific visual behavior
```

tetapi tidak boleh membuat design system baru.

---

# 13. CSS Modules, Utility Classes, and Global CSS

Penggunaan styling mechanism harus mengikuti responsibility.

Global CSS digunakan untuk:

```text
reset
base styles
tokens
global typography
theme definitions
global accessibility defaults
```

Utility classes digunakan untuk:

```text
small layout adjustments
spacing
flex/grid
responsive composition
```

Component-scoped styling digunakan apabila component benar-benar membutuhkan style yang tidak cocok ditangani utility atau shared primitive.

Jangan membuat seluruh application bergantung pada global selectors seperti:

```css
.card {}
.button {}
.container {}
.title {}
```

karena selector generik dapat menghasilkan collision dan hidden coupling.

---

# 14. No Global Selector Pollution

Global CSS tidak boleh memasukkan styling yang terlalu spesifik terhadap business component.

Buruk:

```css
.project-card {
  ...
}

.mcp-server-panel {
  ...
}

.analytics-widget {
  ...
}
```

jika semuanya sebenarnya component-specific.

Global CSS harus tetap minimal.

Business component styles harus tetap terisolasi melalui component architecture.

---

# 15. Avoid Deep CSS Nesting

Jangan membuat selector hierarchy yang terlalu dalam.

Buruk:

```css
.dashboard .sidebar .navigation .item .icon span {
  ...
}
```

Semakin dalam selector, semakin besar coupling terhadap DOM structure.

Prefer component ownership yang jelas.

Contohnya:

```text
Sidebar
Navigation
NavigationItem
Icon
```

masing-masing memiliki responsibility sendiri.

---

# 16. Avoid !important

`!important` tidak boleh digunakan sebagai solusi default.

Penggunaan `!important` harus sangat jarang dan harus memiliki alasan teknis.

Jika `!important` sering muncul, berarti kemungkinan besar architecture CSS atau specificity strategy bermasalah.

Jangan menyelesaikan specificity problems dengan menambahkan specificity problems baru.

---

# 17. Component States Must Be Centralized

Setiap interactive component harus memiliki state yang konsisten.

Minimum:

```text
default
hover
focus-visible
active
disabled
loading
selected
error
```

State visual harus mengikuti token dan shared component behavior.

Contohnya button:

```text
default
hover
focus
active
disabled
loading
```

Tidak boleh setiap feature menciptakan interpretation berbeda untuk state yang sama.

---

# 18. Accessibility Is Part of UI Architecture

Accessibility bukan tahap akhir.

Seluruh UI harus mempertimbangkan:

```text
keyboard navigation
focus-visible
color contrast
reduced motion
semantic HTML
aria labels
screen-reader behavior
touch target size
form labeling
error states
```

Focus state tidak boleh dihilangkan hanya karena desain terlihat lebih bersih.

Buruk:

```css
outline: none;
```

tanpa menggantinya dengan visible focus indicator.

Gunakan:

```text
:focus-visible
```

untuk keyboard accessibility.

---

# 19. Responsive Design Must Be Systematic

Responsive behavior harus mengikuti breakpoint system yang centralized.

Jangan membuat breakpoint acak:

```css
@media (max-width: 1377px)
@media (max-width: 1132px)
@media (max-width: 931px)
```

kecuali terdapat kebutuhan desain yang benar-benar terukur.

Gunakan breakpoint yang konsisten dan responsive composition.

UI harus dipikirkan untuk:

```text
mobile
tablet
desktop
large desktop
```

Tetapi jangan sekadar mengecilkan desktop UI.

Layout harus mampu berubah secara struktural.

Contoh:

```text
Desktop:
Sidebar + content

Mobile:
Topbar + drawer navigation + content
```

---

# 20. Avoid Hardcoded Dimensions

Jangan berlebihan menggunakan fixed dimensions:

```css
width: 723px;
height: 412px;
```

ketika content bersifat dynamic.

Prefer:

```text
max-width
min-width
width: 100%
min-height
aspect-ratio
responsive grid
flex
```

Fixed dimensions hanya digunakan ketika component memang membutuhkan ukuran tertentu.

---

# 21. Centralized Z-Index

Z-index harus memiliki layering strategy.

Jangan:

```css
z-index: 999999;
```

di satu component.

Dan:

```css
z-index: 99999;
```

di component lain.

Gunakan centralized layer hierarchy:

```text
base
dropdown
sticky
overlay
modal
popover
toast
critical overlay
```

Masing-masing harus mempunyai purpose yang jelas.

---

# 22. Centralized Motion

Animation dan transition harus mengikuti motion system.

Centralize:

```text
duration
easing
distance
fade
scale
slide
```

Tidak setiap component perlu memiliki transition yang berbeda.

Motion harus membantu:

```text
feedback
orientation
state transition
hierarchy
```

bukan sekadar dekorasi.

Respect:

```css
prefers-reduced-motion
```

untuk user yang meminta reduced motion.

---

# 23. Avoid Duplicate CSS

Tidak boleh terdapat duplicate style declarations yang melakukan pekerjaan sama.

Contoh yang harus dihindari:

```text
feature-a:
padding: 16px

feature-b:
padding: 16px

feature-c:
padding: 16px
```

Apabila konsep tersebut memang reusable, gunakan shared token atau primitive.

Tetapi jangan membuat abstraction hanya karena dua baris CSS kebetulan identik.

Abstraction harus berdasarkan semantic reuse.

---

# 24. Avoid Style Overrides Chain

Hindari pola:

```text
base style
 ↓
feature override
 ↓
page override
 ↓
responsive override
 ↓
dark-mode override
 ↓
!important
```

Apabila satu component memerlukan terlalu banyak override, architecture component tersebut harus dievaluasi kembali.

Style harus mempunyai single clear owner.

---

# 25. No Dead CSS

Setiap CSS rule harus memiliki consumer yang valid.

Dead CSS harus dihapus.

Termasuk:

```text
unused class
unused variable
unused selector
obsolete animation
obsolete theme token
legacy responsive rule
unused component style
```

Jangan mempertahankan CSS "untuk jaga-jaga".

Version control sudah menyimpan masa lalu.

---

# 26. No Duplicate Tokens

Jangan membuat:

```css
--card-radius: 12px;
--panel-radius: 12px;
--dialog-radius: 12px;
```

kalau semuanya memiliki semantic role yang sama dan memang tidak ada alasan berbeda.

Namun semantic separation boleh digunakan jika behavior masa depan memang perlu berbeda.

Token harus mempunyai tujuan yang jelas.

---

# 27. UI Component Ownership

Ownership harus jelas.

Shared:

```text
web/components/
```

Feature:

```text
web/features/<feature>/components/
```

Page-specific:

```text
di dalam feature/page composition
```

Jangan memindahkan component ke shared hanya karena component tersebut digunakan lebih dari satu kali.

Reusable dan shared adalah konsep yang berbeda.

Component harus berada pada layer yang memiliki ownership paling tepat.

---

# 28. UI State Architecture

Visual state dan application state harus dipisahkan.

Application state:

```text
server data
authentication
permissions
filters
selection
pagination
```

UI state:

```text
modal open
dropdown open
sidebar collapsed
hover
focus
animation state
```

Jangan menyimpan state UI secara global apabila state tersebut hanya dibutuhkan oleh satu component.

Global state harus benar-benar global.

---

# 29. Loading, Empty, Error, and Success States

Setiap feature yang mengambil data harus mendefinisikan minimal:

```text
Loading
Success
Empty
Error
```

UI tidak boleh hanya dirancang untuk happy path.

Contohnya:

```text
Projects
├── Loading
├── Empty
├── Loaded
└── Error
```

State tersebut harus menggunakan shared visual patterns.

---

# 30. Skeletons Must Be Structural

Skeleton harus merepresentasikan struktur content yang sebenarnya.

Jangan membuat skeleton generik jika layout sebenarnya sangat berbeda.

Contohnya:

```text
ProjectCard
    ↓
ProjectCardSkeleton
```

bukan seluruh page berubah menjadi satu gray rectangle.

Skeleton harus membantu user memahami layout yang akan muncul.

---

# 31. Forms

Form harus memiliki standardized behavior.

Setiap form harus memiliki:

```text
label
input
description
validation
error message
loading state
success state
disabled state
```

Error harus ditempatkan dekat dengan field yang bermasalah.

Form harus memiliki keyboard navigation yang benar.

---

# 32. Tables and Data-Dense UI

Dashboard sering mempunyai data dalam jumlah besar.

Table harus mempertimbangkan:

```text
sorting
filtering
pagination
loading
empty
error
responsive behavior
column visibility
row actions
selection
```

Table component generic harus berada di shared UI layer.

Domain-specific columns tetap berada di feature.

---

# 33. Sidebar and Navigation

Navigation harus centralized.

Route information:

```text
routes
```

navigation metadata:

```text
navigation
```

permission:

```text
permissions
```

jangan dicampurkan ke component secara manual.

Navigation harus dapat menentukan:

```text
label
href
icon
group
permission
badge
active state
```

dari centralized configuration.

---

# 34. Icon System

Icon usage harus konsisten.

Jangan mencampurkan banyak icon library tanpa alasan.

Gunakan satu primary icon system apabila memungkinkan.

Icon harus:

```text
consistent stroke/fill style
consistent sizing
accessible labeling
```

Icon dekoratif harus tidak mengganggu screen reader.

---

# 35. Content Width

Dashboard tidak harus selalu full-width.

Gunakan content containers yang memiliki maximum width yang masuk akal.

Contoh konsep:

```text
Full dashboard
    ↓
Page container
    ↓
Content max-width
```

Data-heavy pages dapat menggunakan wider container.

Forms dan settings dapat menggunakan narrower container.

Width harus mengikuti content type.

---

# 36. Visual Hierarchy

Setiap page harus memiliki hierarchy yang dapat dipahami tanpa membaca seluruh text.

Hierarchy dapat menggunakan:

```text
size
weight
spacing
contrast
position
grouping
```

Jangan menggunakan warna sebagai satu-satunya cara menunjukkan hierarchy.

---

# 37. Color Semantics

Status color harus memiliki makna konsisten:

```text
Success
Warning
Error
Info
Neutral
```

Jangan menggunakan warna merah untuk dekorasi pada satu tempat lalu berarti error di tempat lain.

Warna memiliki semantic meaning.

---

# 38. Density

Dashboard application biasanya membutuhkan information density lebih tinggi daripada marketing website.

Namun density harus tetap mempunyai rhythm.

Gunakan kombinasi:

```text
tight
normal
comfortable
```

sesuai context.

Misalnya:

```text
Data table → tight
Dashboard cards → normal
Settings forms → comfortable
```

Jangan membuat semuanya compact atau semuanya oversized.

---

# 39. Visual Consistency Over Individual Component Beauty

Component harus dinilai dalam konteks keseluruhan product.

Sebuah button yang terlihat bagus sendiri tetapi tidak konsisten dengan button lain tetap merupakan design failure.

Prioritas:

```text
System consistency
    >
Component novelty
```

Jangan menciptakan design baru hanya untuk membuat satu page terlihat "beda".

---

# 40. CSS and Tailwind

Apabila application menggunakan Tailwind CSS, Tailwind harus tetap mengikuti centralized design system.

Jangan menggunakan Tailwind sebagai alasan untuk mengabaikan architecture.

Hindari class string yang sangat panjang dan penuh arbitrary values apabila component tersebut sebenarnya membutuhkan abstraction.

Contoh:

```tsx
className="
  mt-[13px]
  px-[19px]
  rounded-[11px]
  bg-[#181818]
  text-[#eeeeee]
"
```

adalah indikasi bahwa design decision belum masuk ke design system.

Tailwind harus digunakan sebagai implementation mechanism, bukan sebagai pengganti design system.

---

# 41. Arbitrary Values

Arbitrary values boleh digunakan apabila:

* kebutuhan visual benar-benar unik
* tidak cocok dengan token system
* memiliki alasan desain
* tidak merupakan pola reusable

Jangan menggunakan arbitrary values untuk menggantikan token yang sudah tersedia.

---

# 42. CSS Naming

Nama class atau component harus menggambarkan semantic responsibility.

Hindari:

```text
.box
.wrapper
.container2
.big-card
.cool-button
.green-section
```

Prefer:

```text
PageHeader
ContentContainer
McpServerCard
StatusBadge
Toolbar
```

Naming harus merepresentasikan purpose, bukan appearance semata.

---

# 43. No Appearance-Based Architecture

Hindari component architecture berdasarkan warna atau visual style.

Buruk:

```text
GreenCard
DarkCard
SmallPanel
BigBox
```

Lebih baik:

```text
SuccessCard
ServerStatusPanel
ResourceSummary
```

Component harus mengkomunikasikan semantic purpose.

---

# 44. CSS Layering

CSS architecture harus memiliki ordering yang predictable.

Secara konsep:

```text
Tokens
  ↓
Reset / Base
  ↓
Utilities
  ↓
Shared Components
  ↓
Feature Components
  ↓
Page Composition
```

Layer yang lebih rendah tidak boleh bergantung pada layer yang lebih tinggi.

Contohnya:

```text
token
    tidak mengenal component

shared component
    tidak mengenal feature

feature
    tidak mengubah global primitive secara sembarangan
```

---

# 45. No Feature-Specific Global CSS

Feature tidak boleh mengubah behavior global seperti:

```css
body {}
button {}
input {}
h1 {}
```

melalui feature-specific stylesheet.

Global behavior hanya boleh berada pada global styling layer.

---

# 46. Design System Evolution

Design system harus mampu berkembang.

Ketika diperlukan component baru:

```text
Need
 ↓
Check existing component
 ↓
Check existing primitive
 ↓
Check existing token
 ↓
Extend existing system
 ↓
Create new abstraction only when justified
```

Jangan membuat component baru apabila component existing hanya membutuhkan variant.

Misalnya:

```text
Button
```

dapat memiliki:

```text
variant
size
state
```

daripada:

```text
PrimaryButton
SecondaryButton
SmallButton
DangerButton
CompactButton
```

jika semuanya sebenarnya merupakan satu component dengan variants.

---

# 47. Variants Must Be Semantic

Variants sebaiknya menggambarkan semantic purpose:

```text
primary
secondary
destructive
ghost
outline
```

bukan:

```text
lime
gray
small-green
dark-border
```

Hal ini menjaga API component tetap stabil ketika theme berubah.

---

# 48. Component API Should Stay Small

Component tidak boleh memiliki puluhan styling props yang tidak jelas.

Buruk:

```text
color
bg
border
radius
padding
margin
font
shadow
width
height
...
```

Shared component sebaiknya mempunyai API yang fokus.

Styling complexity harus ditangani oleh design system dan composition, bukan dengan menambah props tanpa batas.

---

# 49. Maintainability

Setiap perubahan UI harus dapat dijelaskan melalui satu atau beberapa layer yang jelas.

Contoh:

Jika ingin mengganti primary color:

```text
Design token
```

Jika ingin mengubah button shape:

```text
Button primitive
```

Jika ingin mengubah layout dashboard:

```text
Dashboard layout
```

Jika ingin mengubah tampilan MCP server:

```text
MCP feature component
```

Perubahan tidak boleh membutuhkan editing puluhan file yang tidak berhubungan.

---

# 50. Final CSS Architecture Rule

Source of truth harus dapat dijelaskan seperti ini:

```text
               DESIGN TOKENS
                     │
                     ▼
               GLOBAL THEME
                     │
                     ▼
              UI PRIMITIVES
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
     LAYOUT SYSTEM          COMPONENTS
          │                     │
          └──────────┬──────────┘
                     ▼
              FEATURE UI
                     │
                     ▼
                  PAGES
```

Setiap layer mempunyai responsibility sendiri.

```text
Tokens
    = visual values

Global CSS
    = application-wide behavior

Primitives
    = reusable UI building blocks

Components
    = reusable interface components

Features
    = domain-specific UI

Pages
    = composition
```

Tidak boleh ada dependency terbalik seperti:

```text
global CSS
    ↓
feature-specific implementation
```

atau:

```text
shared UI
    ↓
business feature
```

Shared infrastructure tidak boleh bergantung pada feature-specific styling.

---

# 51. Definition of Done for UI/UX

UI dianggap selesai apabila:

```text
[ ] Design tokens digunakan secara konsisten
[ ] Theme berasal dari centralized tokens
[ ] Tidak ada random colors
[ ] Tidak ada unnecessary arbitrary values
[ ] Tidak ada duplicate styles
[ ] Tidak ada dead CSS
[ ] Tidak ada conflicting selectors
[ ] Tidak ada excessive specificity
[ ] Tidak ada unnecessary !important
[ ] Responsive behavior konsisten
[ ] Keyboard navigation bekerja
[ ] Focus state tersedia
[ ] Loading state tersedia
[ ] Empty state tersedia
[ ] Error state tersedia
[ ] Interactive states konsisten
[ ] Shared components digunakan kembali
[ ] Feature-specific styling tetap berada pada feature
[ ] Global CSS tetap minimal
[ ] Typography konsisten
[ ] Spacing konsisten
[ ] Radius konsisten
[ ] Shadow konsisten
[ ] Motion konsisten
[ ] Z-index memiliki hierarchy
[ ] Accessibility diperhatikan
[ ] Tidak ada styling yang tidak memiliki ownership jelas
[ ] Tidak ada duplicate design system
```

---

# 52. Ultimate Principle

UI/UX harus diperlakukan sebagai system.

Bukan kumpulan halaman.

Bukan kumpulan component.

Bukan kumpulan Tailwind class.

Bukan kumpulan CSS files.

Keseluruhan application harus terasa seperti dibuat oleh satu engineering dan design system yang sama meskipun dikembangkan oleh banyak feature dan banyak developer.

Setiap visual decision harus mempunyai tempat yang tepat:

```text
Global visual rule
    → Design Tokens / Global CSS

Reusable UI rule
    → Shared Component

Domain-specific UI rule
    → Feature Component

Page-specific composition
    → Page / Feature Composition
```

Ketika suatu style dapat dipindahkan ke layer yang lebih tepat tanpa kehilangan semantic ownership, pindahkan.

Ketika suatu abstraction hanya dibuat untuk menghindari beberapa baris CSS dan tidak mempunyai semantic value, jangan dibuat.

Target akhir adalah:

```text
Consistent
Predictable
Reusable
Accessible
Responsive
Maintainable
Scalable
```

dengan satu centralized visual system yang menjadi sumber kebenaran untuk seluruh application.
