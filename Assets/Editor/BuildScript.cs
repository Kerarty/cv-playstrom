using UnityEditor;
using UnityEngine;

// CLI-сборка WebGL: unity build . --target WebGL --execute-method BuildScript.PerformWebGLBuild
public static class BuildScript
{
    public static void PerformWebGLBuild()
    {
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

        EditorApplication.Exit(summary.result == BuildResult.Succeeded ? 0 : 1);
    }
}
