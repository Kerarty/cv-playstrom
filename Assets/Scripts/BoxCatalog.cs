using UnityEngine;

// Тип модуля, которым коробка становится в башне
public enum ModuleType { Weapon, Floor, Helper, Upgrade, Final }

[System.Serializable]
public class BoxDef
{
    public string id;
    public ModuleType type;

    // вклад в боевые характеристики башни
    public float damage;
    public float fireRate;
    public float range;

    public Color Color => type switch
    {
        ModuleType.Weapon => Palette.CardboardDark,
        ModuleType.Floor => Palette.Cardboard,
        ModuleType.Helper => Palette.NeonOrange,
        ModuleType.Upgrade => Palette.Tape,
        ModuleType.Final => Palette.SignalRed,
        _ => Palette.Cardboard,
    };
}

// Контент резюме: 10 посылок, тексты в Loc по ключам {id}_t / {id}_d / {id}_g
public static class BoxCatalog
{
    public static readonly BoxDef[] All = new BoxDef[]
    {
        new BoxDef { id = "about",    type = ModuleType.Weapon, damage = 1.0f, fireRate = 0.2f, range = 0.5f },
        new BoxDef { id = "edu",      type = ModuleType.Upgrade, damage = 0.2f, fireRate = 0.2f, range = 0.5f },
        new BoxDef { id = "design",   type = ModuleType.Weapon, damage = 1.2f, fireRate = 0.2f, range = 0.5f },
        new BoxDef { id = "balance",  type = ModuleType.Weapon, damage = 0.8f, fireRate = 0.3f, range = 2.5f },
        new BoxDef { id = "code",     type = ModuleType.Weapon, damage = 0.5f, fireRate = 0.8f, range = 0.3f },
        new BoxDef { id = "eridor",   type = ModuleType.Floor,  damage = 0.4f, fireRate = 0.1f, range = 0.3f },
        new BoxDef { id = "gdd",      type = ModuleType.Floor,  damage = 0.3f, fireRate = 0.1f, range = 0.3f },
        new BoxDef { id = "series",   type = ModuleType.Helper, damage = 0.2f, fireRate = 0.5f, range = 0.3f },
        new BoxDef { id = "playables", type = ModuleType.Helper, damage = 0.3f, fireRate = 0.4f, range = 0.4f },
        new BoxDef { id = "contacts", type = ModuleType.Final },
    };

    // после какой посылки (индекс, 0-based) идёт волна с номером w
    public static int WaveAfterBox(int w) => w switch { 0 => 2, 1 => 5, 2 => 8, _ => -1 };
}
