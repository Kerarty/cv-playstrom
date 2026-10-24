using System.Collections.Generic;
using UnityEngine;

// Живой враг QuickBox: идёт по пути к магазину, хп, смерть/достижение цели.
public class Enemy : MonoBehaviour
{
    public Vector3[] Path;
    public float Hp = 3f;
    public float Speed = 1.2f;
    public bool IsBoss;

    public System.Action<Enemy> OnDead;
    public System.Action<Enemy> OnReach;

    int seg;
    Vector3 baseScale;
    float phase;

    void Update()
    {
        if (Path == null || seg + 1 >= Path.Length) return;
        var target = Path[seg + 1];
        transform.position = Vector3.MoveTowards(transform.position, target, Speed * Time.deltaTime);
        transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(target - transform.position), 6f * Time.deltaTime);
        // лёгкое покачивание — роботы «шагают»
        var s = baseScale * (1f + 0.05f * Mathf.Sin(Time.time * 10f + phase));
        transform.localScale = s;
        if ((transform.position - target).sqrMagnitude < 0.001f)
        {
            seg++;
            if (seg + 1 >= Path.Length)
            {
                OnReach?.Invoke(this);
                Destroy(gameObject);
            }
        }
    }

    public void Hit(float dmg)
    {
        Hp -= dmg;
        if (Hp <= 0f)
        {
            OnDead?.Invoke(this);
            Destroy(gameObject);
        }
    }

    public void Init(Vector3[] path, float hp, float speed, bool boss)
    {
        Path = path; Hp = hp; Speed = speed; IsBoss = boss;
        baseScale = transform.localScale;
        phase = Random.value * 10f;
        transform.position = path[0];
    }

    // визуал робота из примитивов
    public static Enemy Build(Vector3 pos, float hp, float speed, bool boss)
    {
        var root = new GameObject(boss ? "boss" : "robot");
        root.transform.position = pos;
        var scale = boss ? 2.4f : 1f;
        Palette.Prim(PrimitiveType.Cube, "body", pos + new Vector3(0, 0.45f, 0) * scale, new Vector3(0.7f, 0.6f, 0.6f) * scale, Palette.NeonBlue, root.transform);
        Palette.Prim(PrimitiveType.Sphere, "head", pos + new Vector3(0, 0.95f, 0) * scale, Vector3.one * 0.4f * scale, Palette.NeonBlue, root.transform);
        Palette.Prim(PrimitiveType.Cube, "eye", pos + new Vector3(0, 0.95f, 0.21f) * scale, new Vector3(0.22f, 0.1f, 0.05f) * scale, boss ? Palette.SignalRed : Palette.White, root.transform);
        var e = root.AddComponent<Enemy>();
        return e;
    }
}

// Снаряд башни: летит в цель, при потере цели — прямо.
public class Projectile : MonoBehaviour
{
    public Enemy Target;
    public float Dmg;
    Vector3 dir = Vector3.forward;

    void Update()
    {
        const float speed = 14f;
        if (Target != null)
        {
            dir = (Target.transform.position + Vector3.up * 0.5f) - transform.position;
            if (dir.sqrMagnitude < 0.09f)
            {
                Target.Hit(Dmg);
                Destroy(gameObject);
                return;
            }
        }
        transform.position += dir.normalized * speed * Time.deltaTime;
        if (transform.position.y < -1f || transform.position.sqrMagnitude > 2500f) Destroy(gameObject);
    }

    public static Projectile Spawn(Vector3 from, Enemy target, float dmg)
    {
        var go = Palette.Prim(PrimitiveType.Sphere, "shot", from, Vector3.one * 0.18f, Palette.NeonOrange);
        var p = go.AddComponent<Projectile>();
        p.Target = target; p.Dmg = dmg;
        return p;
    }
}

// Автоорудие башни: стреляет по ближайшему врагу в радиусе.
public class TowerWeapon : MonoBehaviour
{
    public float Damage = 2f;
    public float Interval = 0.8f;
    public float Range = 6f;
    public Transform Muzzle;
    public List<Enemy> Enemies;

    float t;

    void Update()
    {
        if (Enemies == null || Muzzle == null) return;
        t += Time.deltaTime;
        if (t < Interval) return;
        Enemy best = null;
        var bestDist = Range;
        for (int i = 0; i < Enemies.Count; i++)
        {
            if (Enemies[i] == null) continue;
            var d = Vector3.Distance(Enemies[i].transform.position, Muzzle.position);
            if (d < bestDist) { bestDist = d; best = Enemies[i]; }
        }
        if (best == null) return;
        t = 0f;
        Projectile.Spawn(Muzzle.position, best, Damage);
    }
}
