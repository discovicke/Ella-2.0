# Planering: Flexibla & Återanvändbara Komponenter (Panel & Card)

Detta dokument beskriver strategin för att göra `PanelComponent` och `CardComponent` tillräckligt kraftfulla för att hantera olika datatyper och layouter i hela ELLA-projektet.

## 1. Arkitektonisk Vision
Komponenterna ska följa "Compound Component"-mönstret eller använda kraftfull `ng-content` projektion för att undvika "prop-drilling" och göra dem framtidssäkra.

## 2. PanelComponent - Flexibilitetsstrategi
Panelen ska kunna fungera både som en statisk del av layouten (Student) och som en overlay/drawer (Admin).

### Planerad struktur:
- **`mode` (Input):** `'static' | 'overlay'`. 
  - `static`: Tar upp sin plats i flex/grid-layouten (som nu i Student).
  - `overlay`: Ligger absolut/fixed över annat innehåll (för Admin).
- **`position` (Input):** `'left' | 'right'`.
- **`width` (Input):** Strängvärde (t.ex. `'400px'`, `'100%'`, `'50vw'`) för total kontroll.
- **Header Actions:** En slot för knappar i headern (t.ex. "Lägg till", "Stäng", "Filtrera").

## 3. CardComponent - Flexibilitetsstrategi
Ett kort kan representera ett **Rum**, en **Bokning**, eller en **Användare**. Vi behöver gå ifrån fasta inputs som `title` och `subtitle` till en mer semantisk struktur.

### Planerad struktur:
Användning av sub-komponenter eller selektiv projektion:
- **`app-card-header`**: För titel, status-badges och ikoner.
- **`app-card-content`**: För huvudsaklig information.
- **`app-card-footer`**: För knappar och interaktioner.

### Visuella varianter:
- **`variant` (Input):** `'default' | 'outline' | 'flat'`.
- **`status` (Input):** `'active' | 'cancelled' | 'expired' | 'none'`. Styr t.ex. accentfärg eller opacitet.

## 4. Frågor till User för att förfina planen
1. **Interaktivitet:** Ska hela kortet vara klickbart (som en länk/knapp), eller ska interaktioner alltid ske via explicita knappar?
2. **Responsivitet:** Hur ska korten bete sig i panelen på mobil? Ska de staplas eller krympa?
3. **Status-hantering:** Vill vi att kortet själv ska kunna visa en "laddnings-shimmer" (skeleton) eller sköter vi det utanför?
4. **Admin-case:** När panelen täcker "main" i admin-vyn, ska den fortfarande ha samma interna struktur som i student-vyn, eller behöver den stöd för t.ex. tabs inuti?

1. Interaktion ska ske via explicita knappar.
2. De ska staplas under varandra, panelen får ha en scroll i sig om den får overflow. Möjligvist att knappen hamnar under texten istället för bredvid i mobilläge (likt loginsidans knapp).
3. Jag tycker att det är bättre att sköta det utanför, så att kortet är så dumb som möjligt. Det är bättre att ha en separat "SkeletonCardComponent" som visar en shimmer när data laddas, och sedan byta ut den mot det riktiga kortet när datan är klar.
4. Jag tycker att det är bäst att ha samma interna struktur i både student- och admin-vyn, så att vi kan återanvända så mycket kod som möjligt. Om vi behöver tabs i admin-vyn kan vi lägga till det som en extra feature i CardComponent, men det är inte nödvändigt för första versionen.

## 5. Implementationssteg
1. **Steg 1:** Refaktorera `PanelComponent` till att stödja `mode` och dynamisk bredd.
2. **Steg 2:** Bryt ner `CardComponent` i mindre delar (`Header`, `Content`, `Footer`) för att tillåta olika innehåll (t.ex. lista assets för rum, men visa tid/datum för bokningar).
3. **Steg 3:** Uppdatera `StudentLayout` för att bevisa att den nya strukturen fungerar med existerande data.

---
*Vänligen svara på frågorna i sektion 4 så att jag kan låsa planen.*
