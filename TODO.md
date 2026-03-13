# ELLA v2 - Projektstatus & TODO

Detta dokument spårar projektets framsteg. Uppdaterat: 2026-03-13.

---

## 🚀 Aktuellt Fokus (Q1 2026)

### Priority: HIGH
- [ ] **Escalation guard for permissions**: Förhindra att användare ger behörigheter de inte själva har (i `UserService.cs`).
- [ ] **Frontend: Registreringssida**: Implementera den publika registreringssidan (`register.page.ts`). Backend är klar men frontend-sidan är tom.
- [ ] **CSRF-skydd för publika formulär**: Lägg till CSRF-skydd för det fristående bokningsformuläret.

### Priority: MEDIUM
- [ ] **Background Clean-up worker**: En tjänst som rensar gamla rader och uppdaterar historik för att hålla index snabba.
- [ ] **Arkitektur: AddressRepository**: Normalisera adresser till en egen tabell istället för att ha den i `campus`/`rooms`.
- [ ] **Frontend: Overview-sida**: Implementera admin-dashboards med statistik och sammanfattningar (`system-overview.page.ts` är tomt).

### Priority: LOW / Polish
- [ ] **Modal UX**: Fixa fördröjning vid ut-animation och shake-animation vid felaktiga klick.
- [ ] **Soft deletes**: Lägg till `IsDeleted`-flaggor för att undvika permanent dataförlust.
- [ ] **Banned Toast**: Fixa felaktig text i toasten när en bannlyst användare försöker logga in.

---

## 🛠️ Modul-status

### Autentisering & Säkerhet
- [x] JWT-baserad auth med cookies.
- [x] Rollmallar (Templates) och Custom Overrides.
- [x] Lösenordsåterställning & kontoaktivering via mail.
- [x] Rate Limiting middleware.
- [ ] **PENDING:** Refresh Tokens för längre sessioner.
- [ ] **PENDING:** CSRF-skydd för publika formulär.

### Bokningssystemet
- [x] Dynamisk tillgänglighetskontroll av rum.
- [x] Återkommande bokningar (serier) med scope-avbokning.
- [x] Permission Level-hierarki (Admin kan boka över student).
- [x] Registreringssystem (Invited/Registered/Declined) med pagination.
- [x] Boknings-slugs för publika bokare.

### Resurshantering (Mobila resurser)
- [x] Hantering av kategorier (fordon, laptopvagnar etc).
- [x] Bokningsflöde för mobila resurser bundna till campus.
- [x] **NYTT:** BookResource permission (separerad från ManageResources).
- [x] **NYTT:** Edit/delete-funktionalitet i resursmodalen.

### Data & Import
- [x] CSV-import för studenter (Excel-format).
- [x] SMTP-integrering (Brevo) för system-mail.
- [ ] **PENDING:** Export av bokningsstatistik till CSV/Excel.

---

## ✅ Arkiv (Slutfört)

### Backend
- [x] Implementera `Postgres` och `Sqlite` providers med full parity.
- [x] Flytta inbjudningslogik till `RegistrationService`.
- [x] Stöd för klass-baserade inbjudningar (bjud in hel klass till lektion).
- [x] Koppla klasser till campus (tidigare städer).
- [x] CRUD för Rum, Campus, Klasser och Assets.
- [x] Server-side pagination för alla tunga listor (användare, bokningar, registreringar).
- [x] Rate Limiting middleware implementation.
- [x] DayPilot-Lite kalenderintegration för resursbokning.

### Frontend
- [x] Custom UI Design System (`app-button`, `app-slider`, `app-time-picker`, etc).
- [x] Egen DatePicker-komponent för bokningsmodalen.
- [x] Integration av **DayPilot-Lite** för kalendervyer.
- [x] "Mina Bokningar"-vy med avancerad filtrering och paginering.
- [x] Dynamisk RBAC-styrd sidebar och access-guards.
- [x] Hantering av bannlysta användare (Banned-page redirect).
- [x] Automatiskt genererad OpenAPI-klient (`npm run api:sync`).
- [x] Custom schematics för sidor och layouts (`npm run g-page`).
- [x] Sorterad rumlista i bokningsformuläret.
- [x] BadgeComponent och SelectablePillComponent.
- [x] Unified modal styling och komponenter.
- [x] Resource booking med kalendervy.
- [x] Resource management med edit/delete-funktionalitet.
- [x] BookResource permission stöd i UI (Manage Roles, Manage Users).

### Infrastruktur
- [x] Docker-compose för Postgres och Adminer.
- [x] Interaktiv bootstrap-script (`scripts/bootstrap.js`).
- [x] DBML-generering för visualisering av databasen.
