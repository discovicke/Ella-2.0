namespace Backend.app.Core.Interfaces;

public interface IParser<T>
{
    Task<List<T>> Parse(string content, string className);
}
