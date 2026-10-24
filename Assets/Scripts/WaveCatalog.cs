using UnityEngine;

[System.Serializable]
public class WaveDef
{
    public string id;
    public int drones;      // мелкие быстрые
    public int crawlers;    // толстые
    public int swarmers;    // рой
    public bool boss;
    public float hpMult = 1f;
    public float speed = 1.2f;
    public float interval = 0.9f;
}

public static class WaveCatalog
{
    public static readonly WaveDef[] All = new WaveDef[]
    {
        new WaveDef { id = "w1", drones = 6, crawlers = 0, swarmers = 0, boss = false, hpMult = 1.0f, speed = 1.2f, interval = 1.0f },
        new WaveDef { id = "w2", drones = 4, crawlers = 2, swarmers = 6, boss = false, hpMult = 1.6f, speed = 1.4f, interval = 0.7f },
        new WaveDef { id = "w3", drones = 6, crawlers = 2, swarmers = 8, boss = true,  hpMult = 2.2f, speed = 1.5f, interval = 0.6f },
    };
}
