# Hur programmet fungerar

### ER-diagram (förenklat)

```
campus ──< rooms >── room_types
              │
         room_assets >── asset_types

users >── user_campus >── campus
users >── user_class  >── class
users ──> permission_templates ──< permission_template_flags >── system_permissions
users ──< user_permission_overrides >── system_permissions

users ──< bookings >── rooms
bookings ──< registrations >── users
```

### Användarhantering

- Nya användare registreras med e-post, lösenord och visningsnamn.
- Varje användare tilldelas en **rollmall** (t.ex. Admin, Lärare, Elev) som definierar grundbehörigheter.
- Utöver rollmallen kan enskilda användare få **permission overrides** — specifika behörigheter som åsidosätter mallens värden, antingen för att utöka eller begränsa åtkomst.
- Användare kan kopplas till ett eller flera **campusar** och **klasser**.
- Administratörer kan banna användare, vilket spärrar inloggning.

### Rollsystemet

Behörigheter beräknas i tre lager med prioritetsordning:

```
1. Personlig override (user_permission_overrides) — högst prioritet
2. Rollmallens värde  (permission_template_flags)
3. Standardvärde FALSE (nekad)                    — lägst prioritet
```

Det innebär att en administratör kan ge en enskild elev en specifik behörighet utan att ändra hela elevrollens mall, och vice versa.

### Campusar och rum

- Campusar representerar fysiska byggnader med adress och kontaktinfo.
- Varje rum tillhör ett campus och en rumstyp, och kan ha utrustning (assets) registrerad (projektor, whiteboard, TV etc.).
- Rum har kapacitet, våningsplan och fritext-anteckningar.

### Bokning av rum

- Inloggade användare kan söka efter lediga rum och boka dem för ett givet tidsintervall.
- En bokning har status `active`, `cancelled` eller `expired` (expired beräknas dynamiskt baserat på sluttid).
- Utöver bokaren själv kan ytterligare deltagare registreras på en bokning via registreringstabellen.
- Överlappande bokningar för samma rum förhindras.

### Närvaroregistrering

- Registrerade deltagare på en bokning kan markeras som närvarande.
- Närvaron kopplas till bokning via `registrations`-tabellen.

---