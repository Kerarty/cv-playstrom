using System.Collections.Generic;
using UnityEngine;

// Палитра low-poly сцены: материалы по цветам + фабрика примитивов.
public static class Palette
{
    static readonly Dictionary<Color, Material> Cache = new Dictionary<Color, Material>();

    public static readonly Color Cardboard = new Color(0.76f, 0.62f, 0.44f);
    public static readonly Color CardboardDark = new Color(0.62f, 0.49f, 0.34f);
    public static readonly Color Tape = new Color(0.92f, 0.88f, 0.78f);
    public static readonly Color Cream = new Color(0.93f, 0.88f, 0.80f);
    public static readonly Color CharcoalC = new Color(0.22f, 0.20f, 0.24f);
    public static readonly Color NeonBlue = new Color(0.20f, 0.75f, 1.00f);
    public static readonly Color NeonOrange = new Color(1.00f, 0.55f, 0.15f);
    public static readonly Color SignalRed = new Color(0.95f, 0.28f, 0.25f);
    public static readonly Color White = new Color(0.95f, 0.95f, 0.95f);

    public static Material Mat(Color c)
    {
        if (Cache.TryGetValue(c, out var m)) return m;
        var shader = Shader.Find("Universal Render Pipeline/Lit");
        if (shader == null) shader = Shader.Find("Standard");
        m = new Material(shader);
        m.color = c;
        Cache[c] = m;
        return m;
    }

    public static GameObject Prim(PrimitiveType type, string name, Vector3 pos, Vector3 scale, Color color, Transform parent = null)
    {
        var go = GameObject.CreatePrimitive(type);
        go.name = name;
        go.transform.position = pos;
        go.transform.localScale = scale;
        go.transform.SetParent(parent, true);
        go.GetComponent<Renderer>().sharedMaterial = Mat(color);
        return go;
    }

    // коробка с «скотчем» — базовый визуал посылки
    public static GameObject Box(string name, Vector3 pos, Vector3 scale, Color color, Transform parent = null)
    {
        var box = Prim(PrimitiveType.Cube, name, pos, scale, color, parent);
        Prim(PrimitiveType.Cube, name + "/tape", pos + Vector3.up * 0.001f, new Vector3(scale.x * 0.18f, scale.y + 0.01f, scale.z + 0.01f), Tape, box.transform);
        return box;
    }
}
