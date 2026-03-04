# TODO

### 2026-03-02 möte

#### Priority: HIGH

- [x] Fixa de sista sakerna för att booking-form ska fungera fullt ut (@christiangennari)
- [ ] Se över möjligheten för att skapa en kalender med ett library (hitta alternativ och jämför)
  - **MÖTE MED GÄNGET OM DETTA TORSDAG 2026-03-05**


#### Priority: MEDIUM

- [ ] Bokningsformuläret behöver ses över och planeras mer
  - [ ] Se över integreringen mot den faktiska backendstrukturen som vi har nu. (Alltså ska det vara en dummy användare eller någon finare lösning som skickar requesten etc.)
  - [ ] Säkerhetstänket, hur ska vi göra själva bokningsformuläret säkert men samtidigt lätt att använda?

#### Priority: LOW

- [ ] DatePicker library för boka rum - se över alternativ och jämför (Angular har också nån inbyggd version att kolla på)
- [ ] Modal för att boka rum behöver ses över

- [ ] Recurring bookings (återkommande bokningar) behöver planeras och diskuteras mer
- [ ] Import och export av data (användare, bokningar etc) behöver planeras och diskuteras mer

- [ ] Registrering av användare och hantering av klasser behöver ses över och planeras mer
- [ ] Se över och planera hur vi ska hantera olika typer av bokningar (privata, lektioner, events etc) och hur det påverkar både backend och frontend

### Priority: FUTURE CONSIDERATIONS

- [ ] **Big Feature**: SMTP integrering för att skicka ut mail (exempelvis vid bokningsbekräftelser, påminnelser etc) behöver planeras och diskuteras mer
- [ ] **Big Feature**: Notifikationer i appen (exempelvis för att påminna om bokningar, informera om ändringar etc) behöver planeras och diskuteras mer

---

## Backend

- [ ] Kanske lägga till en `IsDeleted`-flagga i alla tabeller för att möjliggöra "soft deletes" istället för att radera data permanent?
- [ ] Lägg till klasser i tabellen i manage users
- [ ] Lägg till en manage bookings i adminpanelen
  - [ ] Full CRUD för bokningar
  - [ ] Möjlighet att se vilka elever som är anmälda
- [ ] Lägg till Permission_level logik. Samt all logik kring "overwriting" om typ en admin vill boka över en students redan bokade tid etc.
- [x] ~~Diskutera och planera hur vi ska få "implicit bookings" vs "personal bookings" att fungera.~~ → _Löst via inbjudningssystemet (registrations med status Invited/Registered/Declined)._

### Arkitektur & struktur

- [ ] Fixa adresser i en egen **AddressRepository**
  - Rum har ett AddressId kopplat till Address-table
- [ ] Background Clean-up worker
  - Sortera upp och filtrera bokningar som passerat

### Autentisering & användarhantering

- [ ] Se över kravet på att lösenord måste skickas med vid användaruppdatering
  - Borde endast krävas vid ett lösenordsbyte
  - Det borde inte skötas av en admin
    - Egen "återställ lösenord"-funktion?

### Databas

- Se över databasmodeller och relationer
  - [ ] Separat `Address`-tabell kopplad till `Rooms`.
  - [ ] `Class`-tabell kopplad till `Users`.
    - Separera klasser över städer.
  - [ ] Två olika typer av `Booking` - privat eller lektion.
  - [ ] Lägga till Notes i `RoomAssets`-bryggan.

### Data & Internationalisering

- [ ] Säkerställ att översättningar från databasen används korrekt
  - Konsekvent språk
  - Rätt termer per roll/status
- [ ] Fixa översättningar från databasen för korrekt användarupplevelse

### Bokningar & närvaro (Registrations)

- [ ] Hämta alla bokningar kopplade till en klass
  - Inkludera information om vilka elever som är anmälda
- [ ] Skydda så endast elever i rätt klass kan anmäla sig
- Ska en elev se alla bokningar gjord av andra elever i sin klass?

---

## Backend ↔ Frontend

### Formuläret

- [ ] Se över registrering i databas för det fristående formuläret

---

## Frontend

### Generell

- [ ] Implementera en kalender-komponent

### Routing & layout

- [ ] `app.routes.ts`
  - [ ] Överväg att återinföra HomePage?
  - [ ] Implementera hela teacher-routen med undersidor
- [ ] Global modal-placering
  - [ ] `student.layout.ts`: Implementera bokningsmodal-öppning
  - [ ] `student.layout.html`: Bestäm om app-modal ska ligga här eller i global layout

### Student

#### Funktionalitet

- [x] ~~Filtrering av bokningar~~ → _Implementerat i see-bookings med aktiv/cancelled/historik + tidsfilter (upcoming/past)._
- [ ] Skapa bokningsmodal som öppnas vid `"Boka"`-knappen

#### UI

- [ ] Placering och koppling av global modal-komponent

#### Klassens bokningar

- [ ] Visa alla bokningar som elevens klass har
- [ ] Visa om eleven är anmäld till respektive bokning
- [ ] Möjlighet att anmäla närvaro genom att klicka "Ja"
  - Uppdatera UI direkt (optimistic update)
  - Hantera återkallande om det behövs

### Educator / Teacher

#### UI & Komponenter

- [ ] Fixa bokningspanelen så korten får rätt layout

### Administrator

#### Overview

- [ ] Implementera en overview-sida
  - Statistik
  - Nyliga bokningar
  - Nyliga användare
  - Sammanfattningar
  - Kalender?
  - Import?

#### Manage Bookings

- [ ] Implementera en manage-sida
  - [ ] Skapa/ta bort bokning från adminsidan
  - Kalender?

#### Manage Users

### Banned / Access Control

#### Texter & UX

- [ ] `auth.interceptor.ts` & `auth.service.ts`: Fixa toasten för bannlysta användare

### BookingForm-komponenten

- [ ] Fixa så den tar emot riktiga rum
  - Kan boka rum via en temporär databas som admin accepterar?
- [ ] Fixa rumlistan i högerspalt
  - Sorterad per stad (rubriker)
  - Enbart namn och typ av rum i listan
    - Collapsable content som visar mer info om rummet

### Delade komponenter

- [ ] `modal.service.ts`: Implementera fördröjning för ut-animation så den spelas klart innan komponenten tas bort
- [ ] `modal.component.ts`: Fixa shake-animationen

### Småfix & kvalitet

- [ ] Se över stavfel generellt
- [ ] Säkerställ konsekvent terminologi mellan backend ↔ frontend

---

## Arkiv (Done)

### Backend

- [x] Lägg tillbaka Klasser CRUD och även i Frontend
  - [x] Klasser är kopplade till campus (tidigare formulerat som städer)
- [x] Lägg till Manage Assets i adminpanelen
  - [x] CRUD för Asset Types
  - CRUD för Assets (kopplade till rum) — _hanteras i Manage Rooms via "Utrustning"-modalen_
- [x] Lägg till en manage classes i adminpanelen
  - [x] CRUD för klasser
  - [x] Koppla klasser till campus
- [x] Lägg till en manage campuses i adminpanelen
  - [x] CRUD för campus
  - [x] Koppla campus till rum
- [x] Manage-sida
- [x] Filtrering/sökning

#### Arkitektur & struktur

- [x] Bryt ut registration logik till en separat RegistrationsRepository
  - [x] Interface
  - [x] Dependency injection?
  - [x] Tydlig ansvarsfördelning
- [x] Ta bort den oanvända **Rooms view**

#### Data & Internationalisering

- [x] Se över stavfel i Banned page

#### Bokningar & närvaro (Registrations)

- [x] Implementera `RegistrationsRepository`
  - [x] Koppling mellan användare och bokning
  - [x] Skapa/uppdatera närvaro (anmäld: ja/nej)
- [x] API-endpoint för att anmäla närvaro till en bokning
- [x] Säkerställ att duplicerade registrations inte kan skapas

### Frontend

#### Routing & layout

- [x] Redirect/guard till login om ej autentiserad användare

#### Manage Rooms

- [x] Implementera
  - [x] Sökning
  - [x] Filtrering

#### Manage Users

- [x] Implementera
  - [x] Sökning
  - [x] Filtrering
    - [x] Namn
    - [x] Roll

#### Närvaro-flöde (Backend ↔ Frontend)

- [x] Backend: Exponera klassens bokningar med registrations per användare
- [x] Frontend: Mappa bokning → registration-status för inloggad elev
- [x] Inbjudningssystem implementerat (Invited/Registered/Declined)

#### Server-side paginering för användarlistan

- [x] Backend: `PagedResult<T>` DTO, `UserQueryParams` (page, pageSize, search, templateId, bannedStatus)
- [x] Backend: `GetUsersPagedAsync` i `IUserRepository` + båda providers (Postgres/SQLite med LIMIT/OFFSET)
- [x] Backend: `GetEffectivePermissionsForUsersAsync(IEnumerable<long>)` i `IPermissionRepository` (batch för en sida)
- [x] Backend: `GetPagedAsync` i `UserService`, nytt GET endpoint med query params
- [x] Frontend: Uppdatera `UserService.getAllUsers()` → `getUsers(params)` som returnerar `PagedResult`
- [x] Frontend: Skriv om `manage-users.page.ts` från client-side slice till server-driven (fetch vid page/filter-ändring)

#### Filtrering av bokningar (Student)

- [x] Status: aktiv, cancelled, historik
- [x] Tidsfilter: upcoming/past
- [x] Enhetligt API-anrop med `statuses` och `timeFilter` parametrar
    - [x] Status
    - [x] Klass
  - [x] Skapa/Redigera användare
  - [x] Hantera behörigheter (RBAC/Custom)

#### Manage Roles

- [x] Implementera rollhantering
  - [x] Redigera mallar
  - [x] Dynamiska rättigheter

#### Banned / Access Control

- [x] `banned.page.html`: Korrigera text för bannlysta användare
