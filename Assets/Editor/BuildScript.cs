using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

// CLI-сборка WebGL: unity build . --target WebGL --execute-method BuildScript.PerformWebGLBuild
public static class BuildScript
{
    // вызывается из CLI: unity build . --target WebGL --execute-method BuildScript.PerformWebGLBuild
    public static void PerformWebGLBuild()
    {
        var ok = BuildWebGL();
        EditorApplication.Exit(ok ? 0 : 1);
    }

    // вызывается из живого редактора (unity command eval BuildScript.BuildWebGL())
    public static bool BuildWebGL()
    {
        // в batch-сессии активный таргет может не совпадать — переключаем явно
        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);

        var scenePaths = new System.Collections.Generic.List<string>();
        foreach (var scene in EditorBuildSettings.scenes)
        {
            if (scene.enabled)
                scenePaths.Add(scene.path);
        }

        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = scenePaths.ToArray(),
            locationPathName = "Builds/WebGL",
            target = BuildTarget.WebGL,
            options = BuildOptions.None
        });

        var summary = report.summary;
        Debug.Log($"[BuildScript] WebGL: {summary.result}, размер {summary.totalSize} байт, ошибок {summary.totalErrors}");

        return summary.result == BuildResult.Succeeded;
    }
}
