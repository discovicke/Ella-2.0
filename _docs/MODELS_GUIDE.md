<img alt="image" src="./images/Models_cheatsheet.jpg" />

Here is the simple "Models Parent Folder" structure.

### 1. The New Folder Structure

Everything that holds data goes into `app/Core/Models`.

```text
Backend/app/Core/Models/
├── Entities/       (Your database tables: User.cs, Room.cs)
├── DTOs/           (Your API JSON: LoginDto.cs, RegisterDto.cs)
├── Enums/          (Your options: UserRole.cs, RoomType.cs)
└── ReadModels/     (Your SQL results: BookingSummary.cs)

```

---

### 2. The Cheat Sheet: "Which one do I use?"

| Model Type    | Simple Rule                                                                 | Example               |
| ------------- | --------------------------------------------------------------------------- | --------------------- |
| **Entity**    | **Writing to DB.** Use when saving, updating, or deleting data.             | `User`, `Booking`     |
| **ReadModel** | **Reading from DB.** Use when you write a custom SQL query (SELECT...).     | `BookingSummary`      |
| **DTO**       | **Talking to Frontend.** Use for inputs (requests) and outputs (responses). | `LoginDto`, `RoomDto` |
| **Enum**      | **Fixed Choices.** Use for status, types, or roles.                         | `UserRole`, `Status`  |

---

### 3. Quick Example Flow

Here is how they pass data to each other in a single endpoint.

**Scenario: Get a list of bookings for the frontend.**

1. **Repository (Infrastructure)**

- Runs SQL: `SELECT * FROM Bookings JOIN Users...`
- Returns: `List<BookingSummary>` **(ReadModel)**

2. **Service (Core)**

- Gets the `ReadModel`.
- Converts it to `BookingDto`.
- Returns: `List<BookingDto>` **(DTO)**

3. **API Endpoint (API)**

- Sends the `DTO` to the user as JSON.

---

### 4. Your Action Plan (Do this now)

1. Create a new folder: `Backend/app/Core/Models`.
2. **Move** your existing `Entities`, `DTO`, and `Enums` folders inside it.
3. **Create** a new folder `ReadModels` inside it.
4. **Fix Namespaces:** When you open the files, the top line will be wrong. Change it to match the new folder:

- `namespace Backend.app.Core.Models.Entities;`
- `namespace Backend.app.Core.Models.DTO;`
