# 🎨 SCSS Style System

Modern, skalbar SCSS-arkitektur för Angular 21 (2026).

## 📁 Struktur

```
styles/
├── _variables.scss   → Design tokens & CSS custom properties
├── _mixins.scss      → Återanvändbara SCSS mixins
├── _animations.scss  → Keyframe-animationer
├── _base.scss        → Reset & bas-element-styling
├── _components.scss  → Färdiga komponentklasser
└── _utilities.scss   → Atomära utility-klasser
```

## 🚀 Användning

### I Komponenter

För att använda mixins och variabler i dina komponenter:

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

### I HTML med Utility-klasser

```html
<div class="flex flex-col gap-4 p-6 card">
  <h2 class="text-xl font-bold text-primary">Titel</h2>
  <p class="text-muted leading-relaxed">Innehåll...</p>
  <button class="btn btn-primary">Klicka här</button>
</div>
```

## 🎨 Design Tokens

### Färger (CSS Custom Properties)

```scss
// Primärfärg
var(--color-primary)
var(--color-primary-hover)
var(--color-primary-active)
var(--color-primary-surface)

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
// SCSS maps för loopar
$spacing: ('0': 0, '1': 4px, '2': 8px, '3': 12px, '4': 16px, ...)

// Användning
padding: map-get($spacing, '4');  // 16px
margin: map-get($spacing, '6');   // 24px
```

## 🔧 Användbara Mixins

### Layout

```scss
@include flex-center;     // Centrerar innehåll
@include flex-between;    // Space-between layout
@include flex-column;     // Vertikal flex
@include stack($gap);     // Vertikal stack med gap
@include cluster($gap);   // Horisontell wrap med gap
@include grid-auto-fit($min, $gap);  // Responsiv grid
```

### Knappar

```scss
@include button-primary;   // Primär knapp
@include button-secondary; // Sekundär knapp
@include button-ghost;     // Ghost knapp
@include button-danger;    // Danger knapp
```

### Kort & Ytor

```scss
@include card;           // Grundläggande kort
@include card-elevated;  // Kort med hover-effekt
@include glass;          // Glassmorfism-effekt
@include shadow('md');   // Lägg till skugga
```

### Formulär

```scss
@include input-base;   // Grundläggande input-styling
@include input-error;  // Error-state för input
```

### Responsivitet

```scss
@include breakpoint('md') {
  // Styles för >= 768px
}

@include breakpoint-down('md') {
  // Styles för < 768px
}
```

### Animationer

```scss
@include transition(all, 'fast', 'smooth');
@include hover-lift;        // Hover lyfter element
@include hover-scale(1.05); // Hover zoomar element
```

### Accessibility

```scss
@include focus-ring;        // Tangentbordsfokus
@include visually-hidden;   // Dölj visuellt men inte för skärmläsare
@include custom-scrollbar;  // Anpassad scrollbar
```

## 🎯 Utility-klasser

### Flexbox

```html
<div class="flex items-center justify-between gap-4">
<div class="flex-col items-start gap-2">
```

### Spacing

```html
<div class="p-4 m-2">      <!-- padding: 1rem, margin: 0.5rem -->
<div class="px-6 py-4">    <!-- padding-inline: 1.5rem, padding-block: 1rem -->
<div class="mt-8 mb-4">    <!-- margin-top: 2rem, margin-bottom: 1rem -->
```

### Typografi

```html
<h1 class="text-2xl font-bold leading-tight">
<p class="text-base text-muted leading-relaxed">
<span class="text-sm text-secondary uppercase">
```

### Färger

```html
<div class="bg-card border rounded-lg shadow-md">
<p class="text-primary bg-primary-surface">
<span class="text-danger bg-danger-surface">
```

## 🎬 Animationer

### Keyframe-animationer

```html
<div class="animate-fade-in">      <!-- Fade in -->
<div class="animate-slide-in-up">  <!-- Slide in from bottom -->
<div class="animate-pop-in">       <!-- Pop in elastic -->
<div class="animate-spin">         <!-- Rotera -->
<div class="skeleton">             <!-- Skeleton loader -->
```

### Status-indikatorer

```html
<span class="status-dot status-dot-success"></span>  <!-- Grön pulsande -->
<span class="status-dot status-dot-danger"></span>   <!-- Röd pulsande -->
```

## 🎨 Komponenter

### Knappar

```html
<button class="btn btn-primary">Primär</button>
<button class="btn btn-secondary">Sekundär</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-danger btn-sm">Liten</button>
<button class="btn btn-primary btn-lg">Stor</button>
```

### Kort

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Rubrik</h3>
  </div>
  <div class="card-body">
    Innehåll...
  </div>
  <div class="card-footer">
    Footer
  </div>
</div>
```

### Badges

```html
<span class="badge">Default</span>
<span class="badge-success">Success</span>
<span class="badge-warning">Warning</span>
<span class="badge-danger">Danger</span>
<span class="badge-student">Student</span>
<span class="badge-teacher">Lärare</span>
<span class="badge-admin">Admin</span>
```

### Alerts

```html
<div class="alert alert-info">Info meddelande</div>
<div class="alert alert-success">Success meddelande</div>
<div class="alert alert-warning">Warning meddelande</div>
<div class="alert alert-danger">Danger meddelande</div>
```

### Form

```html
<div class="form-group">
  <label class="form-label form-label-required">Email</label>
  <input type="email" class="form-input" placeholder="email@example.com">
  <p class="form-hint">Vi skickar aldrig spam</p>
  <p class="form-error">Ogiltigt email-format</p>
</div>
```

### Empty State

```html
<div class="empty-state">
  <div class="empty-state-icon">📭</div>
  <h3 class="empty-state-title">Inga resultat</h3>
  <p class="empty-state-text">Försök justera dina filter</p>
  <button class="btn btn-primary">Återställ filter</button>
</div>
```

### Layout

```html
<div class="page">
  <div class="page-header">
    <h1 class="page-title">Sidtitel</h1>
    <div class="page-actions">
      <button class="btn btn-primary">Åtgärd</button>
    </div>
  </div>
  
  <div class="container">
    <!-- Innehåll -->
  </div>
</div>
```

## 🌓 Dark Mode

Dark mode aktiveras automatiskt baserat på `prefers-color-scheme`. Alla CSS custom properties anpassas automatiskt.

## 📱 Responsivitet

Breakpoints (mobile-first):

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

```scss
// SCSS
@include breakpoint('md') {
  // >= 768px
}

// HTML
<div class="hide-mobile">Visas endast på desktop</div>
<div class="hide-desktop">Visas endast på mobil</div>
```

## 🎯 Best Practices

### ✅ Gör

- Använd CSS custom properties för färger och spacing
- Använd mixins för återanvändbar komponentlogik
- Använd utility-klasser för snabb prototyping
- Använd semantiska klassnamn i komponenter
- Håll komponent-SCSS minimal och BEM-liknande

### ❌ Undvik

- Hårdkoda färger eller spacing
- Duplicera komponentlogik (använd mixins istället)
- Overanvänd utility-klasser i komplexa komponenter
- Nästla mer än 3 nivåer djupt
- Global styling utanför styles/

## 🔄 Migrering från vanilla CSS

1. Ersätt hårdkodade färger med CSS custom properties
2. Ersätt hårdkodade spacing med spacing-systemet
3. Använd mixins istället för duplicerad CSS
4. Lägg till utility-klasser där det är lämpligt
5. Använd färdiga komponentklasser

## 🛠️ Exempel: Komponent med Mixins

```scss
// my-feature.component.scss
@use 'styles/mixins' as *;
@use 'styles/variables' as *;

.feature-card {
  @include card-elevated;
  @include stack(map-get($spacing, '4'));
  
  &__header {
    @include flex-between;
  }
  
  &__title {
    @include heading(3);
  }
  
  &__badge {
    @include badge(var(--color-primary-surface), var(--color-primary));
  }
  
  &__button {
    @include button-primary;
    @include hover-lift;
    
    &:disabled {
      opacity: 0.5;
    }
  }
  
  @include breakpoint('md') {
    @include grid-auto-fit(300px, map-get($spacing, '6'));
  }
}
```

## 📚 Resurser

- [SCSS Documentation](https://sass-lang.com/documentation)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Angular Styling Guide](https://angular.dev/guide/components/styling)

---

**Skapad:** 2026-02-10  
**Angular:** 21  
**SCSS:** Modern module system (@use/@forward)

