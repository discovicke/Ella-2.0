using System;
using Backend.app.Core.Enums;

namespace Backend.app.Core.Models;

public class Room
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public int Capacity { get; set; }
    public RoomType Type { get; set; }

    public string? Floor { get; set; }

    public string? Address { get; set; }
}
