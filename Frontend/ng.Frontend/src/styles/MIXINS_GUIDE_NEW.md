# 🎨 SCSS Style System

Modern, optimerad SCSS-arkitektur för Angular 21 (2026).

## 📁 Struktur

```
styles/
├── _variables.scss   → Design tokens & CSS custom properties (213 lines)
├── _mixins.scss      → Återanvändbara SCSS mixins (386 lines)
├── _animations.scss  → Keyframe-animationer (104 lines)
├── _base.scss        → Reset & bas-element-styling (226 lines)
└── _components.scss  → Minimal shared component classes (41 lines)
```

**Total: ~970 lines av optimerad, DRY kod**

---

## 🏗️ Arkitektur-filosofi

Detta projekt använder **component-scoped SCSS med mixin-komposition**:

- ✅ Komponenter äger sina egna styles (Angular ViewEncapsulation)
- ✅ Mixins tillhandahåller återanvändbar logik
- ✅ CSS custom properties för runtime theming
- ✅ Minimala globala klasser för genuint delade mönster
- ❌ Inga utility-klasser (Tailwind-stil)

### Varför inte utility-klasser?

Detta projekt är designat för komplexitet och långsiktig underhållbarhet. Komponenter bygger sin egen styling med hjälp av mixins istället för att förlita sig på atomära utility-klasser i HTML.

---

## 🚀 Användning i Komponenter

### Basic Setup

```scss
// my-component.component.scss
@use 'styles/mixins' as *;
@use 'styles/variables' as *;

.my-component {
  @include card;
  @include flex-between;

  .title {
    @include heading(2);
  }

  @include breakpoint('md') {
    padding: map-get($spacing, '6');
  }
}
```

**Detta är den rekommenderade vägen** - komponenter bygger sin egen styling med hjälp av mixins.

---

## 🎯 Variabler & Design Tokens

### Färger (CSS Custom Properties)

Alla färger definieras som CSS custom properties för runtime theming:

```scss
// Primära färger
var(--color-primary)
var(--color-secondary)
var(--color-accent)

// Semantiska färger
var(--color-success)
var(--color-warning)
var(--color-danger)

// Bakgrunder
var(--color-bg-body)
var(--color-bg-panel)
var(--color-bg-card)

// Text
var(--color-text-primary)
var(--color-text-secondary)
var(--color-text-muted)
```

### Typografi

```scss
// Font sizes
var(--font-xs)    // 12px
var(--font-sm)    // 14px
var(--font-base)  // 18px
var(--font-md)    // 20px
var(--font-lg)    // 24px
var(--font-xl)    // 30px
var(--font-2xl)   // 36px
var(--font-3xl)   // 48px

// Line heights
var(--leading-tight)    // 1.2
var(--leading-snug)     // 1.375
var(--leading-normal)   // 1.6
var(--leading-relaxed)  // 1.75
```

### Spacing (8px-skala)

```scss
// SCSS maps för loopar och mixins
$spacing: (
  '0': 0,
  '1': 4px,
  '2': 8px,
  '3': 12px,
  '4': 16px,
  '5': 20px,
  '6': 24px,
  '8': 32px,
  '10': 40px,
  '12': 48px,
  '16': 64px,
  '20': 80px,
  '24': 96px,
  '32': 128px,
);

// Användning i komponenter
.my-component {
  padding: map-get($spacing, '4'); // 16px
  margin: map-get($spacing, '6'); // 24px
  @include gap('4'); // gap: 16px
}
```

### Breakpoints

```scss
$breakpoints: (
  'sm': 640px,
  'md': 768px,
  'lg': 1024px,
  'xl': 1280px,
  '2xl': 1536px,
);
```

---

## 📦 Tillgängliga Mixins

### Layout & Flexbox

```scss
@mixin flex-center // display: flex; align-items: center; justify-content: center;
  @mixin flex-between // display: flex; align-items: center; justify-content: space-between;
  @mixin flex-start // display: flex; align-items: center; justify-content: flex-start;
  @mixin flex-column // display: flex; flex-direction: column;
  @mixin stack($gap) // flex-direction: column med custom gap
  @mixin cluster($gap) // flex-wrap: wrap med custom gap
  @mixin gap($size) // gap: map-get($spacing, $size)
  // Exempel:
  .header {
  @include flex-between;
  @include gap('4');
}

.sidebar {
  @include stack(map-get($spacing, '6'));
}
```

### Kort & Behållare

```scss
@mixin card // Standard kort med border, padding, radius
  @mixin card-elevated // Kort med subtil hover-effekt
  @mixin container($max-width: 1280px) // Centrerad container med padding
  // Exempel:
  .booking-card {
  @include card;
  @include stack(map-get($spacing, '4'));

  &:hover {
    @include card-elevated;
  }
}

.main-container {
  @include container(1200px);
}
```

### Knappar & Interaktiva Element

```scss
@mixin button-base // Grundläggande knappstil
  @mixin button-primary // Primary variant
  @mixin button-secondary // Secondary variant
  @mixin button-ghost // Ghost variant (transparent)
  @mixin button-danger // Danger variant (röd)
  @mixin focus-ring // Accessibility-focused outline
  @mixin transition($props...) // Smooth transitions
  // Exempel:
  .submit-button {
  @include button-primary;
  @include transition(background-color, transform);

  &:hover {
    transform: translateY(-2px);
  }
}

.cancel-button {
  @include button-ghost;
}
```

### Formulär

```scss
@mixin input-base // Grundläggande input-stil
  @mixin input-error // Error-variant
  @mixin custom-scrollbar // Custom scrollbar styling
  // Exempel:
  .search-input {
  @include input-base;

  &.has-error {
    @include input-error;
  }
}

.long-list {
  overflow-y: auto;
  @include custom-scrollbar;
}
```

### Badges & Status

```scss
@mixin badge($bg, $text) // Custom badge
  @mixin role-badge($role-name) // Förkonfigurerade roll-badges (student, teacher, admin)
  // Exempel:
  .status {
  @include badge(var(--color-success), var(--color-success-text));
}

.admin-badge {
  @include role-badge('admin'); // Färgad med admin-färger
}

.teacher-badge {
  @include role-badge('teacher');
}
```

### Empty States

Konsoliderade mixins för empty state patterns (används i book-room och see-bookings):

```scss
@mixin empty-state-container // Centrerad container för empty states
  @mixin empty-state-loading // Laddar-variant med spinner
  @mixin empty-state-content // Innehållslayout med gap
  @mixin empty-state-icon // Ikon-styling
  // Exempel:
  .no-bookings {
  @include empty-state-container;

  .content {
    @include empty-state-content;
  }

  .icon {
    @include empty-state-icon;
  }
}

.loading-state {
  @include empty-state-loading;
}
```

### Typografi

```scss
@mixin heading($level) // h1-h6 responsiva rubriker
  @mixin visually-hidden // Tillgänglig men visuellt dold text
  // Exempel:
  .page-title {
  @include heading(1); // Responsiv h1 styling
}

.sr-only {
  @include visually-hidden; // För skärmläsare endast
}
```

### Effekter

```scss
@mixin shadow($level: 'md') // Box-shadows (sm, md, lg, xl)
  // Exempel:
  .elevated-card {
  @include shadow('lg');
}

.subtle-panel {
  @include shadow('sm');
}
```

### Responsive Design

```scss
@mixin breakpoint($size)
  // Media queries (sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px)
  // Exempel:
  .responsive-grid {
  display: grid;
  grid-template-columns: 1fr;

  @include breakpoint('md') {
    grid-template-columns: repeat(2, 1fr);
  }

  @include breakpoint('lg') {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## 🎬 Animationer (\_animations.scss)

### Tillgängliga Keyframes

```scss
// Loading & Status
@keyframes spin          // Rotation för spinners
@keyframes pulse         // Pulsande effekt
@keyframes skeleton      // Skeleton loader shimmer
@keyframes pulse-green   // Grön pulsande indikator
@keyframes pulse-red     // Röd pulsande indikator

// Entry animationer
@keyframes fadeIn        // Fade in
@keyframes slideIn       // Slide in från vänster
@keyframes fade-in-up    // Fade in från botten
@keyframes shake         // Skak-animation (för error states)

// Dekorativa
@keyframes float; // Flytande rörelse
```

### Användning i Komponenter

Komponenter kan referera till globala animationer:

```scss
.spinner {
  animation: spin 1s linear infinite; // Använder global keyframe
}

.toast {
  animation: slideIn 0.3s ease-out;
}

.error-input {
  &.shake {
    animation: shake 0.5s ease-in-out;
  }
}
```

**OBS:** Vissa komponenter (som toast-item) definierar sina egna component-specifika animationsvarianter när de behöver unikt beteende.

---

## 🎨 Minimal Shared Components (\_components.scss)

Endast 4 genuint delade klasser finns globalt (41 lines total):

### .form-group

```html
<div class="form-group">
  <label>Email</label>
  <input type="email" />
</div>
```

Används för grundläggande form layout med spacing.

### .btn-primary

```html
<button class="btn-primary">Klicka här</button>
```

Primär knapp-styling. Övriga knappvarianter bygger komponenter själva med mixins.

### .page-header

```html
<header class="page-header">
  <h1>Sidtitel</h1>
</header>
```

Standardiserad sidheader-layout.

### .spinner

```html
<div class="spinner"></div>
```

Global spinner för laddningsindikator.

**Allt annat** är component-scoped i respektive `.component.scss`-fil!

---

## 🌓 Dark Mode

Dark mode aktiveras automatiskt baserat på `prefers-color-scheme: dark`. Alla CSS custom properties anpassas automatiskt i `:root` och `[data-theme="dark"]`.

Komponenter använder CSS custom properties (t.ex. `var(--color-bg-card)`) så theming fungerar automatiskt.

---

## 📱 Responsivitet

Breakpoints (mobile-first):

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

```scss
// SCSS
.my-component {
  padding: map-get($spacing, '4');

  @include breakpoint('md') {
    padding: map-get($spacing, '6');
  }

  @include breakpoint('lg') {
    padding: map-get($spacing, '8');
  }
}
```

---

## 🎯 Best Practices

### ✅ Gör

- ✅ Använd CSS custom properties för färger
- ✅ Använd `map-get($spacing, 'X')` för spacing
- ✅ Använd mixins för återanvändbar komponentlogik
- ✅ Håll komponent-SCSS minimal och semantisk (BEM-liknande)
- ✅ Referera till globala animations i `_animations.scss`
- ✅ Använd `@use` och `@forward` (modern SCSS modules)
- ✅ Konsolidera duplicerade mönster som empty states med mixins

### ❌ Undvik

- ❌ Hårdkoda färger eller spacing-värden
- ❌ Duplicera animations-keyframes i komponenter (använd globala)
- ❌ Skapa utility-klasser i HTML
- ❌ Nästla mer än 3 nivåer djupt
- ❌ Global styling utanför `styles/`
- ❌ Skapa onödiga globala klasser (håll `_components.scss` minimal)

---

## 🔄 Migration Guide

### Från Utility-klasser → Component-scoped

**Innan (utility-first):**

```html
<div class="flex items-center gap-4 p-6 bg-card rounded-lg">
  <h2 class="text-xl font-bold">Titel</h2>
</div>
```

**Efter (component-scoped):**

```scss
// component.component.scss
@use 'styles/mixins' as *;
@use 'styles/variables' as *;

.booking-container {
  @include card;
  @include flex-start;
  @include gap('4');
  padding: map-get($spacing, '6');

  .title {
    @include heading(3);
  }
}
```

```html
<!-- component.component.html -->
<div class="booking-container">
  <h2 class="title">Titel</h2>
</div>
```

---

## 🛠️ Exempel: Fullständig Komponent

```scss
// booking-card.component.scss
@use 'styles/mixins' as *;
@use 'styles/variables' as *;

.booking-card {
  @include card-elevated;
  @include stack(map-get($spacing, '4'));

  &__header {
    @include flex-between;
    padding-bottom: map-get($spacing, '3');
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    @include heading(3);
  }

  &__status {
    @include badge(var(--color-success), white);
  }

  &__body {
    @include flex-column;
    @include gap('3');
    color: var(--color-text-secondary);
  }

  &__actions {
    @include flex-between;
    @include gap('2');
    padding-top: map-get($spacing, '3');
  }

  &__button {
    @include button-primary;
    @include transition(all);

    &--danger {
      @include button-danger;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  @include breakpoint('md') {
    padding: map-get($spacing, '6');
  }
}
```

```html
<!-- booking-card.component.html -->
<div class="booking-card">
  <div class="booking-card__header">
    <h3 class="booking-card__title">Room A - 2024-03-15</h3>
    <span class="booking-card__status">Confirmed</span>
  </div>

  <div class="booking-card__body">
    <p>Time: 09:00 - 11:00</p>
    <p>Participants: 12</p>
  </div>

  <div class="booking-card__actions">
    <button class="booking-card__button">Edit</button>
    <button class="booking-card__button booking-card__button--danger">Cancel</button>
  </div>
</div>
```

---

## 📊 Optimeringsresultat

Efter omfattande cleanup (feb 2026):

- ✅ **1,006 lines removed** (~20.5% reduction)
- ✅ Removed entire unused utility system (\_utilities.scss)
- ✅ Trimmed animations from 336 → 104 lines
- ✅ Trimmed components from 405 → 41 lines
- ✅ Removed 9 unused mixins
- ✅ Consolidated duplicate animations
- ✅ Created reusable empty-state mixins
- ✅ **Zero visual changes**

**Resultat:** Lean, optimerad ~970-line global styles system med 100% utilization.

---

## 📚 Resurser

- [SCSS Documentation](https://sass-lang.com/documentation)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Angular Styling Guide](https://angular.dev/guide/components/styling)
- [BEM Methodology](https://getbem.com/)

---

**Last Updated:** 2026-02-10  
**Angular:** 21  
**SCSS:** Modern module system (@use/@forward)  
**Total Global Styles:** ~970 lines
