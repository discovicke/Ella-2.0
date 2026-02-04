using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;

namespace Backend.app.Infrastructure.Auth;

/// <summary>
/// Password hashing utility using Argon2id.
/// Argon2id är en hybrid av Argon2i (minneshård, skyddar mot side-channel attacks)
/// och Argon2d (snabbare, skyddar mot GPU-cracking). Den kombinerar det bästa av båda.
/// </summary>
public static class PasswordHasher
{
    private const int SaltSize = 16;            // 128 bit - kryptografiskt säkert slumpmässigt salt
    private const int HashSize = 32;            // 256 bit - längden på den resulterande hashen
    private const int Iterations = 4;           // Time cost - antal "pass" genom minnet (högre = långsammare)
    private const int MemorySizeKb = 65536;     // 64 MB - mängd RAM som krävs per hash (skyddar mot GPU-attacker)
    private const int DegreeOfParallelism = 2;  // Antal parallella trådar (bör matcha tillgängliga CPU-kärnor)

    /// <summary>
    /// Hashar ett lösenord med Argon2id.
    /// 
    /// Processen:
    /// 1. Genererar ett kryptografiskt säkert 128-bit salt
    /// 2. Kör Argon2id-algoritmen med lösenord + salt + parametrar
    /// 3. Returnerar en sträng som innehåller ALLA parametrar + salt + hash
    ///    så att verifiering kan göras även om vi ändrar standardvärden i framtiden
    /// 
    /// Hashformat: $argon2id$v=19$m={memory},t={iterations},p={parallelism}${salt}${hash}
    /// </summary>
    public static string HashPassword(string password)
    {
        // Steg 1: Generera ett kryptografiskt säkert salt
        // RandomNumberGenerator är inte System.Random, utan använder OS:ets CSPRNG!
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        
        // Steg 2: Skapa Argon2id-instansen och konfigurera den
        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            DegreeOfParallelism = DegreeOfParallelism,
            MemorySize = MemorySizeKb,
            Iterations = Iterations
        };
        
        // Steg 3: Beräkna hashen - detta är operationen tid och minne
        var hash = argon2.GetBytes(HashSize);
        
        // Steg 4: Formatera som en PHC-sträng (Password Hashing Competition-format)
        // Alla parametrar lagras så att vi kan verifiera även om defaults ändras
        var saltBase64 = Convert.ToBase64String(salt);
        var hashBase64 = Convert.ToBase64String(hash);
        
        return $"$argon2id$v=19$m={MemorySizeKb},t={Iterations},p={DegreeOfParallelism}${saltBase64}${hashBase64}";
    }

    /// <summary>
    /// Verifierar ett lösenord mot en lagrad hash.
    /// 
    /// Processen:
    /// 1. Parsar ut parametrar, salt och hash från den lagrade strängen
    /// 2. Kör Argon2id med samma parametrar på det angivna lösenordet
    /// 3. Jämför resulterande hash med den lagrade hashen (timing-safe)
    /// 
    /// Returnerar true om lösenordet matchar, annars false.
    /// </summary>
    public static bool VerifyPassword(string password, string storedHash)
    {
        try
        {
            // Steg 1: Parsa den lagrade hashsträngen
            // Format: $argon2id$v=19$m=65536,t=4,p=2${salt}${hash}
            var parts = storedHash.Split('$');
            
            // Förväntat format ger 6 delar: ["", "argon2id", "v=19", "m=...,t=...,p=...", "salt", "hash"]
            if (parts.Length != 6 || parts[1] != "argon2id")
                return false;
            
            // Steg 2: Extrahera parametrar från "m=65536,t=4,p=2"
            var parameters = ParseParameters(parts[3]);
            var salt = Convert.FromBase64String(parts[4]);
            var expectedHash = Convert.FromBase64String(parts[5]);
            
            // Steg 3: Återskapa hashen med samma parametrar
            using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
            {
                Salt = salt,
                DegreeOfParallelism = parameters.parallelism,
                MemorySize = parameters.memory,
                Iterations = parameters.iterations
            };
            
            var computedHash = argon2.GetBytes(expectedHash.Length);
            
            // Steg 4: Jämför hasharna med constant-time comparison
            // CryptographicOperations.FixedTimeEquals skyddar mot timing attacks
            // där en angripare mäter hur lång tid jämförelsen tar för att gissa hashen
            return CryptographicOperations.FixedTimeEquals(computedHash, expectedHash);
        }
        catch
        {
            // Vid parsningsfel eller andra undantag, returnera false
            // (logga gärna detta i produktion för debugging)
            return false;
        }
    }

    /// <summary>
    /// Hjälpmetod som parsar parametersträngen "m=65536,t=4,p=2" till individuella värden.
    /// </summary>
    private static (int memory, int iterations, int parallelism) ParseParameters(string paramString)
    {
        // Dela upp "m=65536,t=4,p=2" i key-value pairs
        var dict = paramString.Split(',')
            .Select(p => p.Split('='))
            .ToDictionary(p => p[0], p => int.Parse(p[1]));
        
        return (dict["m"], dict["t"], dict["p"]);
    }
}