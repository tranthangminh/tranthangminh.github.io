using System;
using System.Collections;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

// Screenshots for the product page, from sample data in this folder only. Also reports the app's memory use.
class PageShot
{
    static readonly BindingFlags All = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;

    static object Call(object o, string name, params object[] a)
    {
        for (Type t = o.GetType(); t != null; t = t.BaseType)
        {
            MethodInfo mi = t.GetMethod(name, All | BindingFlags.DeclaredOnly);
            if (mi != null) return mi.Invoke(o, a);
        }
        throw new MissingMethodException(o.GetType().Name, name);
    }

    static object Get(object o, string name)
    {
        for (Type t = o.GetType(); t != null; t = t.BaseType)
        {
            FieldInfo fi = t.GetField(name, All | BindingFlags.DeclaredOnly);
            if (fi != null) return fi.GetValue(o);
        }
        throw new MissingFieldException(o.GetType().Name, name);
    }

    static void Settle(int rounds = 15)
    {
        for (int i = 0; i < rounds; i++) { Application.DoEvents(); System.Threading.Thread.Sleep(40); }
    }

    static Bitmap GrabOver(Form f, Color backColor)
    {
        Rectangle r = f.Bounds;
        using (Form back = new Form { FormBorderStyle = FormBorderStyle.None, BackColor = backColor, ShowInTaskbar = false, TopMost = true, StartPosition = FormStartPosition.Manual })
        {
            back.Bounds = new Rectangle(r.X - 20, r.Y - 20, r.Width + 40, r.Height + 40);
            back.Show();
            f.TopMost = false;
            f.TopMost = true;
            f.BringToFront();
            f.Refresh();
            Settle();
            Bitmap bmp = new Bitmap(r.Width, r.Height, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(bmp)) g.CopyFromScreen(r.Location, Point.Empty, r.Size);
            back.Close();
            return bmp;
        }
    }

    // Grabbed over black and over white: the difference gives the real transparency of the rounded corners and the border, whatever is on the desktop
    static void Grab(Form f, string path)
    {
        const int Edge = 14;
        using (Bitmap black = GrabOver(f, Color.Black))
        using (Bitmap white = GrabOver(f, Color.White))
        using (Bitmap result = new Bitmap(black.Width, black.Height, PixelFormat.Format32bppArgb))
        {
            int w = black.Width, h = black.Height;
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    Color b = black.GetPixel(x, y);
                    bool nearEdge = x < Edge || y < Edge || x >= w - Edge || y >= h - Edge;
                    if (!nearEdge) { result.SetPixel(x, y, b); continue; }
                    Color t = white.GetPixel(x, y);
                    int diff = Math.Max(t.R - b.R, Math.Max(t.G - b.G, t.B - b.B));
                    int alpha = Math.Max(0, Math.Min(255, 255 - diff));
                    if (alpha == 0) { result.SetPixel(x, y, Color.Transparent); continue; }
                    result.SetPixel(x, y, Color.FromArgb(alpha, Math.Min(255, b.R * 255 / alpha), Math.Min(255, b.G * 255 / alpha), Math.Min(255, b.B * 255 / alpha)));
                }
            }
            result.Save(path, ImageFormat.Png);
        }
        Console.WriteLine(Path.GetFileName(path) + " " + f.Width + "x" + f.Height);
    }

    [STAThread]
    static void Main(string[] args)
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Assembly asm = Assembly.LoadFrom(Path.Combine(dir, "Auto Clicker by Max.exe"));
        Type appInfo = asm.GetType("ModernAutoClicker.AppInfo");
        appInfo.GetProperty("AppName").SetValue(null, "Auto Clicker by Max", null);
        object version = appInfo.GetProperty("Version").GetValue(null, null);
        Console.WriteLine("version before: " + version);
        appInfo.GetProperty("Version").SetValue(null, "1.1.4", null);
        asm.GetType("MaxApp.Common.Loc").GetMethod("SetLanguage").Invoke(null, new object[] { "en" });
        object dark = asm.GetType("MaxApp.Common.ThemeTokens").GetMethod("DarkTheme").Invoke(null, null);

        string scriptPath = Path.Combine(dir, "All Action.json");
        Type storage = asm.GetType("ModernAutoClicker.Advanced.MacroStorage");
        object profile = storage.GetMethod("FromJson", BindingFlags.Public | BindingFlags.Static).Invoke(null, new object[] { File.ReadAllText(scriptPath) });
        Type listType = typeof(System.Collections.Generic.List<>).MakeGenericType(profile.GetType());
        IList profiles = (IList)Activator.CreateInstance(listType);
        profiles.Add(profile);

        Form f = (Form)Activator.CreateInstance(asm.GetType("ModernAutoClicker.MainForm"));
        f.Shown += (s, e) =>
        {
            f.Location = new Point(40, 40);
            f.TopMost = true;
            Settle();
            Call(f, "ApplyTheme", dark);
            Call(f, "SwitchTab", 1);
            Settle();
            Grab(f, Path.Combine(dir, "shot_simple.png"));
            Call(f, "SwitchTab", 2);
            Call(Get(f, "pnlTabAdvanced"), "SetAllProfiles", profiles, 0);
            Settle(25);
            Grab(f, Path.Combine(dir, "shot_asian.png"));

            Process me = Process.GetCurrentProcess();
            GC.Collect();
            Settle();
            me.Refresh();
            Console.WriteLine(string.Format("memory: working set {0:F1} MB, private {1:F1} MB", me.WorkingSet64 / 1048576.0, me.PrivateMemorySize64 / 1048576.0));
            f.Close();
        };
        Application.Run(f);
    }
}
