using UnityEngine;
using UnityEngine.UI;

// Весь uGUI строится кодом: HUD, карточка факта, тюнер, баннеры, финал.
// Тикает из GameLoop.Update (Tick), чтобы не держать собственный MonoBehaviour.
public class UIOverlay
{
    readonly GameObject card, tuner, finale;
    readonly Text hint, banner, toast, cardTitle, cardDesc, cardTags, ptsLabel, langBtn;
    readonly Image scanBar;
    readonly Slider sDmg, sRof, sRng;
    readonly float[] tunerPrev = { 0f, 0f, 0f };

    System.Action onCardOk;
    System.Action<float, float, float> onTunerGo;
    System.Action onRestart;

    float bannerT, toastT;
    string bannerHideText;

    static readonly Color Panel = new Color(0.12f, 0.10f, 0.15f, 0.95f);
    static readonly Color Ink = new Color(0.95f, 0.93f, 0.88f);
    static readonly Color Accent = new Color(1.00f, 0.55f, 0.15f);

    public UIOverlay(System.Action onSkip, System.Action onLangToggle, System.Action onPlainCv)
    {
        var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

        var rootGo = new GameObject("ui");
        var canvas = rootGo.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        var scaler = rootGo.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1280f, 720f);
        scaler.matchWidthOrHeight = 0.5f;
        rootGo.AddComponent<GraphicRaycaster>();
        var root = rootGo.transform;

        // HUD: пропустить / просто CV / язык
        MakeButton(root, "btnSkip", Loc.T("skip"), new Vector2(0f, 1f), new Vector2(150f, 40f), new Vector2(12f, -52f), font, onSkip);
        MakeButton(root, "btnCv", Loc.T("cv"), new Vector2(0f, 1f), new Vector2(150f, 40f), new Vector2(172f, -52f), font, onPlainCv);
        langBtn = MakeButton(root, "btnLang", "EN", new Vector2(1f, 1f), new Vector2(90f, 40f), new Vector2(-102f, -52f), font, () =>
        {
            onLangToggle();
            langBtn.text = Loc.Lang == "ru" ? "EN" : "RU";
        });

        hint = MakeText(root, "hint", new Vector2(0.5f, 0f), new Vector2(1100f, 30f), new Vector2(0f, 46f), 20, TextAnchor.LowerCenter, Ink, font);
        hint.text = "";

        // полоса сканирования
        var barBack = MakeImage(root, "scanback", new Vector2(0.5f, 0f), new Vector2(300f, 14f), new Vector2(0f, 24f), new Color(1f, 1f, 1f, 0.15f));
        scanBar = MakeImage(barBack.transform, "scanfill", new Vector2(0.5f, 0.5f), new Vector2(292f, 8f), Vector2.zero, Accent).GetComponent<Image>();
        scanBar.type = Image.Type.Filled;
        scanBar.fillMethod = Image.FillMethod.Horizontal;
        barBack.SetActive(false);

        // карточка факта
        card = PanelGo(root, "card", new Vector2(0.5f, 0.5f), new Vector2(640f, 360f));
        cardTitle = MakeText(card.transform, "t", new Vector2(0.5f, 1f), new Vector2(600f, 54f), new Vector2(0f, -24f), 32, TextAnchor.MiddleCenter, Accent, font);
        cardDesc = MakeText(card.transform, "d", new Vector2(0.5f, 0.5f), new Vector2(560f, 170f), new Vector2(0f, 16f), 22, TextAnchor.UpperCenter, Ink, font);
        cardTags = MakeText(card.transform, "g", new Vector2(0.5f, 0f), new Vector2(560f, 30f), new Vector2(0f, 66f), 18, TextAnchor.MiddleCenter, new Color(0.7f, 0.85f, 1f), font);
        var okBtn = MakeButton(card.transform, "ok", Loc.T("ok"), new Vector2(0.5f, 0f), new Vector2(220f, 46f), new Vector2(-110f, 14f), font, () => { card.SetActive(false); onCardOk?.Invoke(); });
        okBtn.rectTransform.anchoredPosition = new Vector2(-110f, 14f);
        card.SetActive(false);

        // тюнер
        tuner = PanelGo(root, "tuner", new Vector2(0.5f, 0.5f), new Vector2(560f, 380f));
        var tt = MakeText(tuner.transform, "tt", new Vector2(0.5f, 1f), new Vector2(520f, 50f), new Vector2(0f, -20f), 30, TextAnchor.MiddleCenter, Accent, font);
        var td = MakeText(tuner.transform, "td", new Vector2(0.5f, 1f), new Vector2(520f, 34f), new Vector2(0f, -66f), 17, TextAnchor.MiddleCenter, Ink, font);
        sDmg = MakeSlider(tuner.transform, "sDmg", Loc.T("dmg"), new Vector2(0f, -120f), font);
        sRof = MakeSlider(tuner.transform, "sRof", Loc.T("rof"), new Vector2(0f, -190f), font);
        sRng = MakeSlider(tuner.transform, "sRng", Loc.T("rng"), new Vector2(0f, -260f), font);
        sDmg.onValueChanged.AddListener(v => Clamp(sDmg, 0));
        sRof.onValueChanged.AddListener(v => Clamp(sRof, 1));
        sRng.onValueChanged.AddListener(v => Clamp(sRng, 2));
        ptsLabel = MakeText(tuner.transform, "pts", new Vector2(0.5f, 0f), new Vector2(300f, 30f), new Vector2(120f, 88f), 19, TextAnchor.MiddleRight, Ink, font);
        var goBtn = MakeButton(tuner.transform, "go", Loc.T("go"), new Vector2(0.5f, 0f), new Vector2(240f, 48f), new Vector2(-120f, 22f), font, () =>
        {
            tuner.SetActive(false);
            onTunerGo?.Invoke(1f + 0.4f * sDmg.value, 1f + 0.4f * sRof.value, 1f + 0.4f * sRng.value);
        });
        goBtn.rectTransform.anchoredPosition = new Vector2(-120f, 22f);
        tuner.SetActive(false);

        // баннер и тост
        banner = MakeText(root, "banner", new Vector2(0.5f, 0.5f), new Vector2(1000f, 90f), new Vector2(0f, 130f), 52, TextAnchor.MiddleCenter, Accent, font);
        banner.text = "";
        toast = MakeText(root, "toast", new Vector2(0.5f, 0f), new Vector2(800f, 28f), new Vector2(0f, 12f), 18, TextAnchor.LowerCenter, new Color(1f, 0.6f, 0.5f), font);
        toast.text = "";

        // финал
        finale = PanelGo(root, "finale", new Vector2(0.5f, 0.5f), new Vector2(680f, 420f));
        var ft = MakeText(finale.transform, "ft", new Vector2(0.5f, 1f), new Vector2(620f, 90f), new Vector2(0f, -30f), 34, TextAnchor.MiddleCenter, Accent, font);
        var fd = MakeText(finale.transform, "fd", new Vector2(0.5f, 0.5f), new Vector2(600f, 40f), new Vector2(0f, 90f), 20, TextAnchor.MiddleCenter, Ink, font);
        var fc = MakeText(finale.transform, "fc", new Vector2(0.5f, 0.5f), new Vector2(600f, 80f), new Vector2(0f, 8f), 22, TextAnchor.MiddleCenter, Ink, font);
        fc.text = "+375 44 783 84 89\nkukar.y@gmail.com";
        var gh = MakeButton(finale.transform, "gh", "github.com/Kerarty", new Vector2(0.5f, 0f), new Vector2(300f, 46f), new Vector2(-150f, 70f), font, () => Application.OpenURL("https://github.com/Kerarty"));
        gh.rectTransform.anchoredPosition = new Vector2(-150f, 70f);
        var again = MakeButton(finale.transform, "again", Loc.T("restart"), new Vector2(0.5f, 0f), new Vector2(300f, 46f), new Vector2(-150f, 16f), font, () => { finale.SetActive(false); onRestart?.Invoke(); });
        again.rectTransform.anchoredPosition = new Vector2(-150f, 16f);
        ft.text = Loc.T("finale_t");
        fd.text = Loc.T("finale_d");
        finale.SetActive(false);

        tt.text = Loc.T("tuner_t");
        td.text = Loc.T("tuner_d");
    }

    public void ShowHint(string text) => hint.text = text;
    public void HideHint() => hint.text = "";

    public void SetScan(float p01)
    {
        scanBar.transform.parent.gameObject.SetActive(p01 > 0.01f);
        scanBar.fillAmount = Mathf.Clamp01(p01);
    }

    public void ShowCard(string title, string desc, string tags, System.Action ok)
    {
        cardTitle.text = title;
        cardDesc.text = desc;
        cardTags.text = tags;
        onCardOk = ok;
        card.SetActive(true);
    }

    public void ShowTuner(System.Action<float, float, float> go)
    {
        sDmg.value = 0f; sRof.value = 0f; sRng.value = 0f;
        tunerPrev[0] = tunerPrev[1] = tunerPrev[2] = 0f;
        UpdatePts();
        onTunerGo = go;
        tuner.SetActive(true);
    }

    public void Banner(string text, float dur)
    {
        banner.text = text;
        bannerT = dur;
    }

    public void Toast(string text)
    {
        toast.text = text;
        toastT = 1.6f;
    }

    public void ShowFinale(System.Action restart)
    {
        onRestart = restart;
        finale.SetActive(true);
    }

    public void Tick(float dt)
    {
        if (bannerT > 0f) { bannerT -= dt; if (bannerT <= 0f) banner.text = ""; }
        if (toastT > 0f) { toastT -= dt; if (toastT <= 0f) toast.text = ""; }
    }

    void Clamp(Slider s, int idx)
    {
        var sum = sDmg.value + sRof.value + sRng.value;
        if (sum > 3f) s.SetValueWithoutNotify(tunerPrev[idx]);
        else tunerPrev[idx] = s.value;
        UpdatePts();
    }

    void UpdatePts() => ptsLabel.text = Loc.T("pts") + Mathf.Max(0, 3 - (int)(sDmg.value + sRof.value + sRng.value));

    // ---- фабрики uGUI ----

    static GameObject PanelGo(Transform parent, string name, Vector2 center, Vector2 size)
    {
        var go = new GameObject(name);
        var rt = go.AddComponent<RectTransform>();
        rt.SetParent(parent, false);
        rt.anchorMin = rt.anchorMax = center;
        rt.sizeDelta = size;
        var img = go.AddComponent<Image>();
        img.color = Panel;
        return go;
    }

    static Text MakeText(Transform parent, string name, Vector2 anchor, Vector2 size, Vector2 offset, int sizePx, TextAnchor align, Color color, Font font)
    {
        var go = new GameObject(name);
        var rt = go.AddComponent<RectTransform>();
        rt.SetParent(parent, false);
        rt.anchorMin = rt.anchorMax = anchor;
        rt.sizeDelta = size;
        rt.anchoredPosition = offset;
        var txt = go.AddComponent<Text>();
        txt.font = font;
        txt.fontSize = sizePx;
        txt.alignment = align;
        txt.color = color;
        txt.horizontalOverflow = HorizontalWrapMode.Wrap;
        txt.verticalOverflow = VerticalWrapMode.Overflow;
        return txt;
    }

    static GameObject MakeImage(Transform parent, string name, Vector2 anchor, Vector2 size, Vector2 offset, Color color)
    {
        var go = new GameObject(name);
        var rt = go.AddComponent<RectTransform>();
        rt.SetParent(parent, false);
        rt.anchorMin = rt.anchorMax = anchor;
        rt.sizeDelta = size;
        rt.anchoredPosition = offset;
        var img = go.AddComponent<Image>();
        img.color = color;
        return go;
    }

    static Text MakeButton(Transform parent, string name, string label, Vector2 anchor, Vector2 size, Vector2 offset, Font font, System.Action onClick)
    {
        var go = new GameObject(name);
        var rt = go.AddComponent<RectTransform>();
        rt.SetParent(parent, false);
        rt.anchorMin = rt.anchorMax = anchor;
        rt.sizeDelta = size;
        rt.anchoredPosition = offset;
        var img = go.AddComponent<Image>();
        img.color = new Color(0.2f, 0.17f, 0.25f, 0.9f);
        var btn = go.AddComponent<Button>();
        btn.onClick.AddListener(() => onClick());
        var txt = MakeText(go.transform, "label", new Vector2(0.5f, 0.5f), size, Vector2.zero, Mathf.Max(14, (int)(size.y * 0.45f)), TextAnchor.MiddleCenter, Ink, font);
        txt.text = label;
        txt.raycastTarget = false;
        return txt;
    }

    static Slider MakeSlider(Transform parent, string name, string label, Vector2 offset, Font font)
    {
        var lbl = MakeText(parent, name + "_lbl", new Vector2(0.5f, 1f), new Vector2(460f, 26f), offset + new Vector2(0f, 44f), 20, TextAnchor.MiddleLeft, Ink, font);
        lbl.text = label;

        var sliderGo = new GameObject(name);
        var srt = sliderGo.AddComponent<RectTransform>();
        srt.SetParent(parent, false);
        srt.anchorMin = srt.anchorMax = new Vector2(0.5f, 1f);
        srt.sizeDelta = new Vector2(440f, 24f);
        srt.anchoredPosition = offset;
        var bg = MakeImage(sliderGo.transform, name + "_bg", new Vector2(0.5f, 0.5f), new Vector2(440f, 10f), Vector2.zero, new Color(1f, 1f, 1f, 0.18f));
        var fill = MakeImage(bg.transform, name + "_fill", new Vector2(0.5f, 0.5f), new Vector2(440f, 10f), Vector2.zero, Accent);
        var handle = MakeImage(sliderGo.transform, name + "_handle", new Vector2(0.5f, 0.5f), new Vector2(22f, 22f), Vector2.zero, Ink);
        var s = sliderGo.AddComponent<Slider>();
        s.fillRect = fill.GetComponent<RectTransform>();
        s.handleRect = handle.GetComponent<RectTransform>();
        s.targetGraphic = handle.GetComponent<Image>();
        s.direction = Slider.Direction.LeftToRight;
        s.minValue = 0f;
        s.maxValue = 3f;
        s.wholeNumbers = true;
        return s;
    }
}
