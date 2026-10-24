using System.Collections.Generic;

// Мини-локализация: RU/EN словари, ключ → строка. Переключатель — в HUD.
public static class Loc
{
    public static string Lang = "ru";

    static readonly Dictionary<string, string> Ru = new Dictionary<string, string>
    {
        // интерфейс
        ["title"] = "Resume Delivery 2037",
        ["hint_scan"] = "Зажми кнопку мыши на коробке — она просканируется",
        ["hint_boost"] = "Кликай по роботам QuickBox — это буст-выстрел",
        ["ok"] = "Понятно",
        ["tuner_t"] = "Тюнер башни",
        ["tuner_d"] = "Раздели 3 очка между модулями — это повлияет на волну",
        ["dmg"] = "Урон",
        ["rof"] = "Скорострельность",
        ["rng"] = "Радиус",
        ["pts"] = "Осталось очков: ",
        ["go"] = "В час пик!",
        ["wave"] = "Час пик!",
        ["boss"] = "Легаси-голем",
        ["wave_done"] = "Посылка доставлена",
        ["wave_clean"] = "Идеальная смена — ни одна посылка не помята!",
        ["crushed"] = "Посылка помята…",
        ["skip"] = "Пропустить",
        ["cv"] = "Просто CV",
        ["restart"] = "Ещё смена",
        ["finale_t"] = "Посылка доставлена:\nгеймдизайнер → Playstrom",
        ["finale_d"] = "Спасибо за смену в Rocket Post!",

        // коробки
        ["about_t"] = "Обо мне",
        ["about_d"] = "Ярослав Кукар — геймдизайнер с профильным техническим образованием. Фокус: баланс, экономика и боевые характеристики.",
        ["about_g"] = "аналитика · системы · данные",
        ["edu_t"] = "Образование",
        ["edu_d"] = "БГУИР, «Информационные системы и технологии в игровой индустрии», бакалавр, 2023–2027.",
        ["edu_g"] = "инженер-программист",
        ["design_t"] = "Game / Level Design",
        ["design_d"] = "Проектирую механики, прогрессию и уровни. Веду документацию, готовую к передаче в команду разработки.",
        ["design_g"] = "механики · прогрессия · уровни",
        ["balance_t"] = "Баланс и матстатистика",
        ["balance_d"] = "Баланс игровых систем, теория вероятностей, работа с данными — считаю и чувствую числа.",
        ["balance_g"] = "тервер · статистика · экономика",
        ["code_t"] = "C# / C++",
        ["code_d"] = "Техническая база: понимаю, как механика живёт в коде, и говорю с программистами на одном языке.",
        ["code_g"] = "c# · c++ · unity",
        ["eridor_t"] = "«Королевства Эридора»",
        ["eridor_d"] = "Настольный варгейм на 4 фракции: боевые механики, захват территорий, баланс юнитов. 15+ плейтестов и итеративная доводка — по принципу live-ops.",
        ["eridor_g"] = "бой · баланс · плейтесты ×15",
        ["gdd_t"] = "GDD стратегии-градостроителя",
        ["gdd_d"] = "Полноценный концепт-документ: механики, прогрессия, баланс ресурсов, арт-стиль. Структурирован под передачу в команду.",
        ["gdd_g"] = "gdd · система ресурсов",
        ["series_t"] = "Серия интерактивных резюме ×5",
        ["series_d"] = "Отклики-мини-игры для Playrix, Lesta, Top Games, Igrotech и Gametech — механики вместо списка достижений. Это шестое.",
        ["series_g"] = "playable cv · тюнеры · баланс-лаборатории",
        ["playables_t"] = "Playable ads и Unity",
        ["playables_d"] = "Движко-независимый SDK для HTML5-рекламы (TypeScript), два играбельных демо (PixiJS + matter.js) и головоломка echoloop на Unity 6 + URP.",
        ["playables_g"] = "sdk · pixijs · unity 6",
        ["contacts_t"] = "Контакты",
        ["contacts_d"] = "Финальная посылка собрана. Осталось доставить — ракета уже на крыше!",
        ["contacts_g"] = "+375 44 783 84 89 · kukar.y@gmail.com",
    };

    static readonly Dictionary<string, string> En = new Dictionary<string, string>
    {
        ["title"] = "Resume Delivery 2037",
        ["hint_scan"] = "Hold the mouse button on a box to scan it",
        ["hint_boost"] = "Click QuickBox robots for a boost shot",
        ["ok"] = "Got it",
        ["tuner_t"] = "Tower tuner",
        ["tuner_d"] = "Split 3 points between modules — it affects the wave",
        ["dmg"] = "Damage",
        ["rof"] = "Fire rate",
        ["rng"] = "Range",
        ["pts"] = "Points left: ",
        ["go"] = "Rush hour!",
        ["wave"] = "Rush hour!",
        ["boss"] = "Legacy Golem",
        ["wave_done"] = "Package delivered",
        ["wave_clean"] = "Perfect shift — no package crushed!",
        ["crushed"] = "Package crushed…",
        ["skip"] = "Skip",
        ["cv"] = "Plain CV",
        ["restart"] = "One more shift",
        ["finale_t"] = "Delivered:\ngame designer → Playstrom",
        ["finale_d"] = "Thanks for the shift at Rocket Post!",

        ["about_t"] = "About me",
        ["about_d"] = "Yaroslav Kukar — game designer with a technical degree. Focus: balance, economy and combat stats.",
        ["about_g"] = "analytics · systems · data",
        ["edu_t"] = "Education",
        ["edu_d"] = "BSUIR, Information Systems & Technologies in Game Industry, BSc, 2023–2027.",
        ["edu_g"] = "software engineer",
        ["design_t"] = "Game / Level Design",
        ["design_d"] = "I design mechanics, progression and levels, and write docs a dev team can pick up.",
        ["design_g"] = "mechanics · progression · levels",
        ["balance_t"] = "Balance & statistics",
        ["balance_d"] = "Game balance, probability theory and data analysis — I count and feel the numbers.",
        ["balance_g"] = "probability · statistics · economy",
        ["code_t"] = "C# / C++",
        ["code_d"] = "Technical background: I know how a mechanic lives in code and speak the engineers' language.",
        ["code_g"] = "c# · c++ · unity",
        ["eridor_t"] = "“Kingdoms of Eridor”",
        ["eridor_d"] = "Tabletop wargame for 4 factions: combat mechanics, territory capture, unit balance. 15+ playtests with iterative tuning — live-ops style.",
        ["eridor_g"] = "combat · balance · 15 playtests",
        ["gdd_t"] = "City-builder strategy GDD",
        ["gdd_d"] = "A full concept document: mechanics, progression, resource balance, art direction — structured for team handoff.",
        ["gdd_g"] = "gdd · resource system",
        ["series_t"] = "Interactive resume series ×5",
        ["series_d"] = "Playable mini-game applications for Playrix, Lesta, Top Games, Igrotech and Gametech — mechanics instead of achievement lists. This is number six.",
        ["series_g"] = "playable cv · tuners · balance labs",
        ["playables_t"] = "Playable ads & Unity",
        ["playables_d"] = "Engine-agnostic HTML5 ad SDK (TypeScript), two playable demos (PixiJS + matter.js) and echoloop, a Unity 6 + URP puzzle.",
        ["playables_g"] = "sdk · pixijs · unity 6",
        ["contacts_t"] = "Contacts",
        ["contacts_d"] = "The final package is packed. Time to deliver — the rocket is on the roof!",
        ["contacts_g"] = "+375 44 783 84 89 · kukar.y@gmail.com",
    };

    public static string T(string key)
    {
        var dict = Lang == "ru" ? Ru : En;
        return dict.TryGetValue(key, out var v) ? v : key;
    }

    public static void Toggle() => Lang = Lang == "ru" ? "en" : "ru";
}
