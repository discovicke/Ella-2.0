namespace Backend.app.Core.Interfaces;

public interface IParser<T>
{
    static abstract Task<List<T>> Parse(string content, string className);
}