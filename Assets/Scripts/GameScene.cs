using UnityEngine;
using UnityEngine.EventSystems;

// Ссылки на процедурную сцену
public class SceneRefs
{
    public Transform TowerRoot;
    public Transform Muzzle;
    public Vector3 TowerBase = new Vector3(0f, 0f, -4.2f);
    public Vector3 BeltStart;
    public Vector3 ScanPos;
    public Vector3[] Path;
}

// Вся сцена строится кодом из примитивов: сцена в проекте остаётся пустой,
// а весь визуал версионируется в git как код.
public static class GameScene
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Boot()
    {
        if (Object.FindFirstObjectByType<GameLoop>() != null) return;
        Build();
    }

    public static SceneRefs Build()
    {
        var refs = new SceneRefs();

        // свет
        var sunGo = new GameObject("sun");
        var sun = sunGo.AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.intensity = 1.15f;
        sun.color = new Color(1f, 0.96f, 0.88f);
        sunGo.transform.rotation = Quaternion.Euler(55f, -35f, 0f);

        // камера
        var camGo = new GameObject("camera");
        camGo.tag = "MainCamera";
        var cam = camGo.AddComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.10f, 0.08f, 0.14f);
        cam.transform.position = new Vector3(4.2f, 9.2f, -10.2f);
        cam.transform.LookAt(new Vector3(-0.5f, 1.4f, -2.6f));

        // земля и декор
        Palette.Prim(PrimitiveType.Plane, "ground", Vector3.zero, new Vector3(2.6f, 1f, 1.9f), Palette.Cream);
        Palette.Prim(PrimitiveType.Cube, "backwall", new Vector3(0f, 0.02f, -8.4f), new Vector3(22f, 0.05f, 1.6f), Palette.CharcoalC);

        // магазин Rocket Post
        Palette.Box("store", new Vector3(0f, 0.9f, -6.4f), new Vector3(5f, 1.8f, 2.2f), Palette.Cardboard);
        Palette.Prim(PrimitiveType.Cube, "sign", new Vector3(0f, 2.25f, -7.3f), new Vector3(2.8f, 0.55f, 0.14f), Palette.NeonOrange);
        var lampGo = new GameObject("signlight");
        var lamp = lampGo.AddComponent<Light>();
        lamp.type = LightType.Point;
        lamp.color = Palette.NeonOrange;
        lamp.intensity = 2.6f;
        lamp.range = 10f;
        lamp.transform.position = new Vector3(0f, 2.6f, -6.6f);

        // основание башни
        refs.TowerRoot = new GameObject("tower").transform;
        refs.TowerRoot.position = refs.TowerBase;
        refs.Muzzle = new GameObject("muzzle").transform;
        refs.Muzzle.SetParent(refs.TowerRoot, false);
        refs.Muzzle.localPosition = new Vector3(0f, 1.2f, 0f);
        Palette.Prim(PrimitiveType.Cylinder, "towerbase", refs.TowerBase + new Vector3(0f, 0.1f, 0f), new Vector3(1.6f, 0.2f, 1.6f), Palette.CharcoalC);

        // конвейер: справа приезжают посылки
        Palette.Prim(PrimitiveType.Cube, "belt", new Vector3(6.7f, 0.5f, -2f), new Vector3(9.4f, 0.14f, 1.1f), Palette.CharcoalC);
        Palette.Prim(PrimitiveType.Cube, "beltleg1", new Vector3(10.6f, 0.22f, -2f), new Vector3(0.25f, 0.45f, 0.9f), Palette.CharcoalC);
        Palette.Prim(PrimitiveType.Cube, "beltleg2", new Vector3(3f, 0.22f, -2f), new Vector3(0.25f, 0.45f, 0.9f), Palette.CharcoalC);
        refs.BeltStart = new Vector3(11.2f, 0.82f, -2f);
        refs.ScanPos = new Vector3(2.6f, 0.82f, -2f);

        // путь роботов QuickBox — к двери магазина
        refs.Path = new Vector3[]
        {
            new Vector3(-11.5f, 0f, -3.2f),
            new Vector3(-7f, 0f, 0.6f),
            new Vector3(-3f, 0f, 2.5f),
            new Vector3(1.9f, 0f, 1.3f),
            new Vector3(0f, 0f, -3.4f),
        };
        for (int i = 0; i < refs.Path.Length; i++)
            Palette.Prim(PrimitiveType.Cube, "mark" + i, refs.Path[i] + new Vector3(0f, 0.03f, 0f), new Vector3(0.5f, 0.06f, 0.5f), Palette.NeonBlue * 0.6f);

        // ивенты для uGUI
        var esGo = new GameObject("events");
        esGo.AddComponent<EventSystem>();
        esGo.AddComponent<StandaloneInputModule>();

        // игровой цикл
        var loopGo = new GameObject("~game");
        var loop = loopGo.AddComponent<GameLoop>();
        loop.Refs = refs;
        return refs;
    }
}
