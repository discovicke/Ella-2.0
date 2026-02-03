namespace Backend.app.Infrastructure.Auth;

/// <summary>
/// Password hashing utility.
/// TODO: Replace stub implementations with real bcrypt/Argon2 when auth is implemented.
/// Reference: utils/security.utils.js (bcrypt usage)
/// </summary>
public static class PasswordHasher
{
    /// <summary>
    /// Hashes a password. Currently returns a stub hash.
    /// TODO: Implement real password hashing (e.g., BCrypt, Argon2, or ASP.NET PasswordHasher).
    /// </summary>
    public static string HashPassword(string password)
    {
        // STUB: Return a fake hash for development/seeding purposes
        // Format: STUB_HASH_{base64(password)}_{random suffix}
        var base64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(password));
        var suffix = Guid.NewGuid().ToString("N")[..8];
        return $"STUB_HASH_{base64}_{suffix}";
    }

    /// <summary>
    /// Verifies a password against a hash. Currently always returns true for stub hashes.
    /// TODO: Implement real password verification.
    /// </summary>
    public static bool VerifyPassword(string password, string hash)
    {
        // STUB: For development, accept any password if hash starts with STUB_HASH_
        if (hash.StartsWith("STUB_HASH_"))
        {
            // Extract the base64 password from the hash and compare
            var parts = hash.Split('_');
            if (parts.Length >= 3)
            {
                try
                {
                    var storedBase64 = parts[2];
                    var storedPassword = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(storedBase64));
                    return storedPassword == password;
                }
                catch
                {
                    return false;
                }
            }
        }

        // TODO: Real hash verification here
        return false;
    }
}