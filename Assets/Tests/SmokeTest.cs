using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

// Смоук: сцена строится, цикл стартует и не сыплет исключениями в первые секунды.
public class SmokeTest
{
    [UnityTest]
    public IEnumerator SceneBootsAndLoopRuns()
    {
        yield return null; // AfterSceneLoad → GameScene.Build
        var loop = Object.FindFirstObjectByType<GameLoop>();
        Assert.IsNotNull(loop, "GameLoop должен создаться при загрузке сцены");
        Assert.IsNotNull(loop.Refs, "ссылки сцены должны быть заполнены");
        LogAssert.NoUnexpectedReceived();

        yield return new WaitForSeconds(3f); // конвейер едет, коробка приехала на скан
        LogAssert.NoUnexpectedReceived();
        Assert.IsNotNull(loop, "цикл жив после 3 секунд");
    }
}
