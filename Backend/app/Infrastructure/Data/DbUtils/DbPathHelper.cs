using System.IO;

namespace Backend.app.Infrastructure.Data.DbUtils;

public static class DbPathHelper
{
    public static string GetFullPath(string fileName)
    {
        // 1. Try AppContext.BaseDirectory (standard)
        var path = Path.Combine(AppContext.BaseDirectory, "app", "Infrastructure", "Data", fileName);
        if (File.Exists(path)) return path;

        // 2. Climb up from CurrentDirectory to find the project root or Backend folder
        var current = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (int i = 0; i < 6; i++)
        {
            if (current == null) break;

            // Try <current>/Backend/app/Infrastructure/Data
            var p1 = Path.Combine(current.FullName, "Backend", "app", "Infrastructure", "Data", fileName);
            if (File.Exists(p1)) return p1;

            // Try <current>/app/Infrastructure/Data
            var p2 = Path.Combine(current.FullName, "app", "Infrastructure", "Data", fileName);
            if (File.Exists(p2)) return p2;

            current = current.Parent;
        }

        return Path.Combine(AppContext.BaseDirectory, "app", "Infrastructure", "Data", fileName);
    }
}