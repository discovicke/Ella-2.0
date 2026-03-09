using System.IO;

namespace Backend.app.Infrastructure.Data.DbUtils;

public static class DbPathHelper
{
    public static string GetFullPath(string fileName)
    {
        // 1. Try common locations relative to current directory
        var current = new DirectoryInfo(Directory.GetCurrentDirectory());
        
        for (int i = 0; i < 10; i++)
        {
            if (current == null) break;

            // Try direct path
            var path = Path.Combine(current.FullName, "Backend", "app", "Infrastructure", "Data", fileName);
            if (File.Exists(path)) return path;

            path = Path.Combine(current.FullName, "app", "Infrastructure", "Data", fileName);
            if (File.Exists(path)) return path;

            // Try nested bin folders (for tests)
            path = Path.Combine(current.FullName, "..", "Backend", "app", "Infrastructure", "Data", fileName);
            if (File.Exists(path)) return path;

            current = current.Parent;
        }

        // 2. Try AppContext.BaseDirectory as fallback
        var baseDir = AppContext.BaseDirectory;
        return Path.Combine(baseDir, "app", "Infrastructure", "Data", fileName);
    }
}