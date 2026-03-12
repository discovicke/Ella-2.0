# 🔐 Permission System Architecture

This document details the **Permission-Based Access Control** system used in the application.

While it includes "Roles", it is **not a strict RBAC system**. Instead, it uses a **Template + Override** architecture. Roles act as convenient _management templates_ to batch-assign permissions, but the ultimate source of truth is the **effective permission set** calculated for each individual user.

---

## 1. Core Concept: "User-Centric Permissions"

Unlike strict RBAC where a user's rights are derived solely from their Role, this system calculates a flat list of permissions for every user. The application enforcement layer (`user.HasPermission("X")`) does not care _how_ a user got a permission (via Role or Override), only _that_ they have it.

This offers the best of both worlds:

1.  **Management Efficiency:** You can manage 1,000 users via a "Student" Role (Template).
2.  **Granular Control:** You can toggle specific flags for a single user without creating a new Role.

### The Calculation Formula

The database provides a real-time view:

`Effective Permission = Override Value (if present) OR Template Value (if no override)`

---

## 2. Key Components

### 2.1. Roles (Permission Templates)

- **Definition:** Centralized collections of permission flags stored in `permission_templates` and `permission_template_flags`.
- **Behavior:**
  - Users are linked to a role via a Foreign Key (`permission_template_id`) directly on the `users` table.
  - **Live Updates:** If an Admin updates the "Student" role to allow `BookRoom`, **every user** assigned to that role immediately inherits that permission without any data migration.

### 2.2. Custom Users (No Template)

- **Definition:** Users who do not fit into a standard role.
- **Behavior:**
  - Their `permission_template_id` is set to `NULL`.
  - They derive **zero** permissions from the system defaults.
  - Their access rights are defined exclusively by entries in the `user_permission_overrides` table.
  - **Isolation:** Changes to standard roles (like "Student") have no effect on Custom users.

### 2.3. Overrides (The "Smart Toggle")

- **Definition:** Specific exceptions stored in `user_permission_overrides`.
- **Use Cases:**
  - **Granting:** Giving a specific Student extra access (e.g., `ManageRooms`).
  - **Revoking:** Restricting a specific Educator from a standard right (e.g., denying `BookRoom`).
- **Smart Cleanup:** The backend enforces a "normalization" rule. If an override is set to the **same value** as the underlying template, the override row is **deleted**. This prevents redundant data and ensures users don't get "stuck" with hardcoded values if the role changes later.

---

## 3. Data Flow & Logic

### The View: `v_user_effective_permissions`

The application logic does not query tables directly to check permissions. It queries this View, which handles the logic:

```sql
CREATE VIEW v_user_effective_permissions AS
SELECT
    u.id AS user_id,
    sp.key AS permission_key,
    COALESCE(upo.value, ptf.value, 0) AS is_granted
FROM users u
CROSS JOIN system_permissions sp
LEFT JOIN permission_templates pt ON u.permission_template_id = pt.id
LEFT JOIN permission_template_flags ptf ON pt.id = ptf.template_id AND ptf.permission_key = sp.key
LEFT JOIN user_permission_overrides upo ON u.id = upo.user_id AND upo.permission_key = sp.key;
```

This ensures that the API always sees the mathematically correct permission state without complex C# logic, covering both users with templates and those with custom permissions.

### UserPermissions Object

The backend projects this data into a flat `UserPermissions` object (replacing the old entity) which acts as the DTO for the frontend.

```csharp
public class UserPermissions
{
    public long UserId { get; set; }
    public long? PermissionTemplateId { get; set; }

    // Permission Flags
    public bool BookRoom { get; set; }
    public bool ManageUsers { get; set; }
    public bool ManageClasses { get; set; }
    public bool ManageRooms { get; set; }
    public bool ManageBookings { get; set; }
    public bool ManageCampuses { get; set; }
    public bool ManageRoles { get; set; }
    public bool ManageResources { get; set; }

    /// <summary>
    /// Helper to check permission by key name dynamically.
    /// </summary>
    public bool HasPermission(string key)
    {
        return key switch
        {
            "BookRoom" => BookRoom,
            "ManageUsers" => ManageUsers,
            "ManageClasses" => ManageClasses,
            "ManageRooms" => ManageRooms,
            "ManageBookings" => ManageBookings,
            "ManageCampuses" => ManageCampuses,
            "ManageRoles" => ManageRoles,
            "ManageResources" => ManageResources,
            _ => false
        };
    }
}
```

---

## 4. Behaviors & Edge Cases

| Action                         | Result                                                                                                               | Reasoning                                                                          |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| **Editing a Role**             | **Global Update.** All users with that role see the change immediately.                                              | Users reference the Role ID; they do not copy the data.                            |
| **Switching Role to "Custom"** | **Snapshot.** The user is detached from the template. Their desired permissions are saved as explicit overrides.     | "Custom" implies manual management isolated from global updates.                   |
| **Switching "Custom" to Role** | **Reset.** All manual overrides are wiped. The user is linked to the Role and inherits its permissions.              | Ensures a clean state when re-joining a standardized group.                        |
| **Custom User Persistence**    | **Stable Configuration.** A custom user retains their specific set of permissions indefinitely.                      | No automated system changes their access unless an admin intervenes.               |
| **Deleting a Role**            | **Safe Block.** The system prevents deletion if any users are assigned to the role. Admin must reassign users first. | Prevents accidental mass-revocation of access (referential integrity + UX safety). |
| **Login/Auth**                 | **Live Check.** Permissions are checked against the database on every request/login.                                 | Security; bans or revocations apply instantly.                                     |

---

## 5. Schema Reference

- `system_permissions`: Registry of all valid permission keys (e.g., `ManageUsers`, `ManageResources`).
- `permission_templates`: Definitions of roles (e.g., "Student").
- `users.permission_template_id`: Links `User` -> `Template` directly.
- `user_permission_overrides`: Specific exceptions for a user.
