
<img alt="image" width="500px" height="auto" src="./images/validation_flow.jpg" />

<img alt="image" width="800px" height="auto" src="./images/validation_flow_banana.png" />

## This guide outlines the layered "Fail-Fast" validation strategy used in this project. The goal is to catch errors as early as possible to avoid wasting system resources.


### Layer 1: The Request Bouncer (Automatic)

Before any code runs, the framework attempts to map the incoming JSON to a strongly-typed **DTO**.

- **What it catches**: Type mismatches (e.g., text in a number field, invalid date formats).
- **Result**: Automatically returns a `400 Bad Request`.
- **Junior Tip**: If the data can't even become the correct variable type, it shouldn't reach your logic.

### Layer 2: Endpoint Validation (Manual)

The **Endpoint** performs checks that do **not** require database access. Use a `Validate()` method at the very start of the endpoint.

- **What to check**:
- **Population**: Are IDs positive integers (e.g., `RoomId > 0`)?
- **Relational Logic**: Does the logic make sense on its own (e.g., is `EndTime` after `StartTime`)?

- **Result**: Returns a `400 Bad Request` with a descriptive message.
- **Junior Tip**: If you don't need to "ask the database" to know the data is junk, reject it here.

### Layer 3: Service Validation (Business State)

The **Service** performs checks that require "knowledge of the world" (Database access).

- **What to check**:
- **Existence**: Does the requested `RoomId` actually exist in the database?
- **Conflicts**: Is the room already occupied during this specific time slot?
- **Permissions**: Is the user allowed to perform this action based on their current status?

- **Result**: Throws an exception (e.g., `InvalidOperationException`) that the endpoint catches to return a `409 Conflict` or `403 Forbidden`.
- **Junior Tip**: This layer ensures the request is valid given the current state of the application.

### Layer 4: Database Integrity (The Vault)

The **Database Schema** acts as the final safety net.

- **What it catches**: Violations of `FOREIGN KEY` relationships or `UNIQUE` constraints (e.g., duplicate registration for the same booking).
- **Result**: Rolls back the transaction and triggers a `500 Internal Server Error` if a bug bypassed layers 1–3.
- **Junior Tip**: Treat the database as the absolute authority on data integrity.

---

### Summary Table

| Where         | Responsibility  | Requirement        | Error Code    |
| ------------- | --------------- | ------------------ | ------------- |
| **Framework** | Type Safety     | None               | `400`         |
| **Endpoint**  | Input Integrity | DTO Data Only      | `400`         |
| **Service**   | System State    | Repository Access  | `409` / `400` |
| **Database**  | Hard Reality    | Schema Constraints | `500`         |
