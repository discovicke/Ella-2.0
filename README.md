## Kom igång

### 1. Förkrav

- [Docker](https://www.docker.com/) installerat och igång
- [Node.js](https://nodejs.org/) (v18 eller senare)
- [npm](https://www.npmjs.com/)
- [.NET 9](https://dotnet.microsoft.com/en-us/download/dotnet/9.0)

### 2. Installera och bygg projektet

**Se till att du befinner dig i projektets rotmappen innan du börjar. Följ sedan stegen nedan.**

Kör detta **första gången** (installerar npm-beroenden, väljer databasleverantör och startar Docker-containern om det behövs):

```bash
npm run setup
```

Setup-scriptet låter dig välja mellan **SQLite**, **PostgreSQL** eller **SQL Server** (SQLite kräver ingen Docker).
Anslutningsinformation genereras automatiskt från respektive Docker Compose-fil.

### 3. Starta applikationen

```bash
npm start
```

Detta startar både backend (C#) och frontend (Angular) samtidigt. Applikationen är sedan tillgänglig i webbläsaren på `http://localhost:4200`.

---

## Hur programmet fungerar

Se [USAGE.md](./_docs/usage.md) för en detaljerad genomgång av systemets funktioner.

---

## Databasschema

<!-- dbdocs-link:start -->
> Schema diagram not yet published. Run `dbdocs login` then `npm start` to auto-publish.
<!-- dbdocs-link:end -->

## Databasmigrering

Applikationen skapar automatiskt alla tabeller, enum-typer, vyer, triggers och index vid uppstart om de inte redan finns. Ingen manuell SQL-körning krävs.

Migreringshistoriken spåras i tabellen `database_versions`.
