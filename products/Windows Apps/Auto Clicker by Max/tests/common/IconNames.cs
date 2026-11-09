using System;
using System.Drawing;
using System.Reflection;
using MaxApp.Common;

// Every name in CommonIcons must still find its icon through the embedded resources and the built-in copies.
class IconNames
{
    static int Main()
    {
        int fails = 0;
        foreach (FieldInfo f in typeof(CommonIcons).GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            string name = (string)f.GetRawConstantValue();
            bool expectMissing = f.Name == "QrBankFallback";
            bool builtIn = !string.IsNullOrEmpty(BuiltInSvgAssets.GetBuiltInSvg(name));
            bool builtInUpper = !string.IsNullOrEmpty(BuiltInSvgAssets.GetBuiltInSvg(name.ToUpperInvariant()));
            bool rendered;
            using (Bitmap bmp = SvgFileRenderer.RenderSvg(name, 32, 32, null)) rendered = bmp != null;
            bool ok = expectMissing ? (!builtIn && !rendered) : (builtIn && builtInUpper && rendered);
            if (!ok) fails++;
            Console.WriteLine((ok ? "PASS " : "FAIL ") + f.Name + " " + name + " builtIn=" + builtIn + " rendered=" + rendered);
        }
        Console.WriteLine("RESULT fails=" + fails);
        return fails;
    }
}
