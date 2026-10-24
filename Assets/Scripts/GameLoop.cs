using System.Collections.Generic;
using UnityEngine;

// Смена в Rocket Post: конвейер → скан → карточка факта → башня → тюнер → волна → финал.
// Проиграть нельзя: помятые посылки только портят «идеальную смену».
public class GameLoop : MonoBehaviour
{
    public SceneRefs Refs;

    enum S { BeltIn, Scan, Card, Place, Tuner, Wave, Finale }
    S s = S.BeltIn;

    UIOverlay ui;
    TowerWeapon weapon;
    readonly List<Enemy> enemies = new List<Enemy>();
    readonly List<BoxDef> scanned = new List<BoxDef>();

    int boxIndex;
    GameObject currentBox;
    BoxDef currentDef;

    float t;
    float scanT;
    Vector3 from;

    int waveIndex;
    int crushed;
    WaveDef wave;
    int spawned, toSpawn;
    float spawnT;

    Transform rocket;
    float finaleT;

    void Start()
    {
        ui = new UIOverlay(SkipToFinale, OnLang, () => Application.OpenURL("https://github.com/Kerarty"));
        weapon = gameObject.AddComponent<TowerWeapon>();
        weapon.Enemies = enemies;
        weapon.Muzzle = Refs.Muzzle;
        RecalcWeapon();
        NextBox();
        ui.ShowHint(Loc.T("hint_scan"));
    }

    void Update()
    {
        ui.Tick(Time.deltaTime);
        switch (s)
        {
            case S.BeltIn:
                t += Time.deltaTime / 1.4f;
                if (currentBox != null) currentBox.transform.position = Vector3.Lerp(from, Refs.ScanPos, t);
                if (t >= 1f) { s = S.Scan; scanT = 0f; }
                break;

            case S.Scan:
                ScanUpdate();
                break;

            case S.Place:
                t += Time.deltaTime / 0.7f;
                if (currentBox != null) currentBox.transform.position = Vector3.Lerp(from, TowerSlot(scanned.Count), Mathf.SmoothStep(0f, 1f, t));
                if (t >= 1f) OnPlaced();
                break;

            case S.Wave:
                WaveUpdate();
                break;

            case S.Finale:
                finaleT += Time.deltaTime;
                if (rocket != null)
                {
                    rocket.Translate(Vector3.up * (2f + finaleT * finaleT * 4f) * Time.deltaTime, Space.World);
                    rocket.Rotate(Vector3.up * 90f * Time.deltaTime, Space.World);
                }
                break;
        }
    }

    // ---- скан ----

    void ScanUpdate()
    {
        if (currentBox == null) return;
        var overBox = MouseOverBox();
        if (overBox && Input.GetMouseButton(0))
        {
            scanT += Time.deltaTime / 0.55f;
            ui.SetScan(scanT);
            if (scanT >= 1f)
            {
                s = S.Card;
                ui.SetScan(0f);
                ui.HideHint();
                ui.ShowCard(Loc.T(currentDef.id + "_t"), Loc.T(currentDef.id + "_d"), Loc.T(currentDef.id + "_g"), OnCardOk);
            }
        }
        else
        {
            scanT = Mathf.Max(0f, scanT - Time.deltaTime * 1.5f);
            ui.SetScan(scanT);
        }
    }

    bool MouseOverBox()
    {
        var ray = Camera.main.ScreenPointToRay(Input.mousePosition);
        var hits = Physics.RaycastAll(ray, 60f);
        for (int i = 0; i < hits.Length; i++)
        {
            var h = hits[i].transform;
            if (h == currentBox.transform || h.parent == currentBox.transform) return true;
        }
        return false;
    }

    void OnCardOk()
    {
        s = S.Place;
        t = 0f;
        from = currentBox.transform.position;
    }

    void OnPlaced()
    {
        currentBox.transform.SetParent(Refs.TowerRoot, true);
        currentBox.transform.position = TowerSlot(scanned.Count);
        scanned.Add(currentDef);
        currentBox = null;
        RecalcWeapon();
        ui.ShowHint(Loc.T("hint_scan"));

        var cur = boxIndex;
        boxIndex++;

        if (currentDef.type == ModuleType.Final)
        {
            StartFinale();
            return;
        }

        if (BoxCatalog.WaveAfterBox(waveIndex) == cur) ShowTuner();
        else NextBox();
    }

    // ---- тюнер и волна ----

    void ShowTuner()
    {
        s = S.Tuner;
        ui.HideHint();
        ui.ShowTuner((d, r, g) =>
        {
            RecalcWeapon(d, r, g);
            StartWave();
        });
    }

    void StartWave()
    {
        s = S.Wave;
        wave = WaveCatalog.All[waveIndex];
        crushed = 0;
        spawned = 0;
        toSpawn = wave.drones + wave.crawlers + wave.swarmers + (wave.boss ? 1 : 0);
        spawnT = 0.4f;
        ui.Banner(Loc.T(wave.boss ? "boss" : "wave"), 1.3f);
        ui.ShowHint(Loc.T("hint_boost"));
    }

    void WaveUpdate()
    {
        if (spawned < toSpawn)
        {
            spawnT -= Time.deltaTime;
            if (spawnT <= 0f)
            {
                spawnT = wave.interval;
                SpawnNext();
            }
        }

        // клик по роботу — буст-выстрел
        if (Input.GetMouseButtonDown(0))
        {
            var ray = Camera.main.ScreenPointToRay(Input.mousePosition);
            var hits = Physics.RaycastAll(ray, 80f);
            for (int i = 0; i < hits.Length; i++)
            {
                var e = hits[i].collider.GetComponentInParent<Enemy>();
                if (e != null)
                {
                    e.Hit(weapon.Damage * 0.5f);
                    break;
                }
            }
        }

        if (spawned >= toSpawn && enemies.Count == 0)
        {
            waveIndex++;
            ui.HideHint();
            ui.Banner(crushed == 0 ? Loc.T("wave_clean") : Loc.T("wave_done"), 1.6f);
            if (waveIndex < WaveCatalog.All.Length && boxIndex < BoxCatalog.All.Length) NextBox();
            else SkipToFinale();
        }
    }

    void SpawnNext()
    {
        var idx = spawned;
        bool boss = wave.boss && idx == toSpawn - 1;
        int type;
        if (boss) type = 3;
        else
        {
            var off = idx % 3;
            if (off == 0 && idx / 3 < wave.drones) type = 0;
            else if (off == 1 && idx / 3 < wave.crawlers) type = 1;
            else type = 2;
        }

        float hp; float speed; var scale = 1f;
        switch (type)
        {
            case 0: hp = 3f; speed = 1.5f; scale = 0.85f; break;
            case 1: hp = 12f; speed = 0.75f; scale = 1.35f; break;
            case 3: hp = 60f; speed = 0.55f; scale = 2.4f; break;
            default: hp = 2f; speed = 1.9f; scale = 0.7f; break;
        }
        hp *= wave.hpMult;

        var e = Enemy.Build(Refs.Path[0] + new Vector3(0f, 0.25f, 0f), hp, speed * wave.speed, boss);
        e.transform.localScale *= scale;
        e.Init(Refs.Path, hp, speed * wave.speed, boss);
        e.OnDead = _ => enemies.Remove(e);
        e.OnReach = _ =>
        {
            enemies.Remove(e);
            crushed++;
            ui.Toast(Loc.T("crushed"));
        };
        enemies.Add(e);
        spawned++;
    }

    // ---- финал ----

    void StartFinale()
    {
        s = S.Finale;
        finaleT = 0f;
        ui.HideHint();
        var top = TowerSlot(scanned.Count);
        rocket = new GameObject("rocket").transform;
        rocket.position = Refs.TowerBase + new Vector3(0f, top.y + 0.8f, 0f);
        Palette.Prim(PrimitiveType.Cylinder, "body", rocket.position, new Vector3(0.7f, 1.2f, 0.7f), Palette.White, rocket);
        Palette.Prim(PrimitiveType.Cube, "finL", rocket.position + new Vector3(-0.5f, -0.9f, 0f), new Vector3(0.35f, 0.6f, 0.12f), Palette.NeonOrange, rocket);
        Palette.Prim(PrimitiveType.Cube, "finR", rocket.position + new Vector3(0.5f, -0.9f, 0f), new Vector3(0.35f, 0.6f, 0.12f), Palette.NeonOrange, rocket);
        // конфетти доставки — в мировых координатах, чтобы физика не путалась с летящей ракетой
        for (int i = 0; i < 26; i++)
        {
            var c = Palette.Prim(PrimitiveType.Cube, "confetti" + i, rocket.position + Random.insideUnitSphere * 1.6f, Vector3.one * 0.14f,
                Random.value > 0.5f ? Palette.NeonOrange : Palette.NeonBlue);
            c.AddComponent<Rigidbody>().AddForce(Random.insideUnitSphere * 3f, ForceMode.Impulse);
        }
        ui.Banner(Loc.T("wave_done"), 1.5f);
        Invoke(nameof(ShowFinaleUi), 2.4f);
    }

    void ShowFinaleUi() => ui.ShowFinale(ResetShift);

    void SkipToFinale()
    {
        if (s == S.Finale) return;
        if (currentBox != null) { Destroy(currentBox); currentBox = null; }
        for (int i = enemies.Count - 1; i >= 0; i--) Destroy(enemies[i].gameObject);
        enemies.Clear();
        StartFinale();
    }

    // ---- утилиты ----

    void NextBox()
    {
        currentDef = BoxCatalog.All[boxIndex];
        currentBox = Palette.Box("box_" + currentDef.id, Refs.BeltStart, Vector3.one * 0.82f, currentDef.Color);
        from = Refs.BeltStart;
        t = 0f;
        s = S.BeltIn;
    }

    Vector3 TowerSlot(int i) => Refs.TowerBase + Vector3.up * (0.45f + 0.84f * i);

    void RecalcWeapon(float mDmg = 1f, float mRof = 1f, float mRng = 1f)
    {
        float dmg = 0f, rof = 0f, rng = 0f;
        for (int i = 0; i < scanned.Count; i++)
        {
            dmg += scanned[i].damage;
            rof += scanned[i].fireRate;
            rng += scanned[i].range;
        }
        weapon.Damage = 2f + dmg * mDmg;
        weapon.Interval = Mathf.Max(0.16f, 0.9f / (1f + 0.35f * rof * mRof));
        weapon.Range = 5f + rng * mRng;
        Refs.Muzzle.localPosition = new Vector3(0f, 0.9f + 0.84f * scanned.Count, 0f);
    }

    void OnLang()
    {
        Loc.Toggle();
        ui.ShowHint(Loc.T(s == S.Wave ? "hint_boost" : "hint_scan"));
    }

    void ResetShift()
    {
        if (rocket != null) { Destroy(rocket.gameObject); rocket = null; }
        for (int i = enemies.Count - 1; i >= 0; i--) Destroy(enemies[i].gameObject);
        enemies.Clear();
        for (int i = Refs.TowerRoot.childCount - 1; i >= 0; i--)
            if (Refs.TowerRoot.GetChild(i).name.StartsWith("box_"))
                Destroy(Refs.TowerRoot.GetChild(i).gameObject);
        scanned.Clear();
        boxIndex = 0;
        waveIndex = 0;
        CancelInvoke();
        RecalcWeapon();
        NextBox();
        ui.ShowHint(Loc.T("hint_scan"));
    }
}
