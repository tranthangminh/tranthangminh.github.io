using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

// A small window used as a click target. Every mouse press is appended to <logDir>\<label>.clicks.
// Args: logDir label title x y [topmost] [secondTitle]  (secondTitle = a second window in the same process)
class WinTarget
{
    static Form MakeForm(string logDir, string label, string title, int x, int y, bool topmost)
    {
        Form f = new Form
        {
            Text = title,
            StartPosition = FormStartPosition.Manual,
            Location = new Point(x, y),
            Size = new Size(240, 110),
            TopMost = topmost
        };
        f.MouseDown += (s, e) =>
        {
            // The test may be reading the file at this moment
            for (int attempt = 0; attempt < 50; attempt++)
            {
                try { File.AppendAllText(Path.Combine(logDir, label + ".clicks"), "x\n"); return; }
                catch (IOException) { System.Threading.Thread.Sleep(5); }
            }
        };
        return f;
    }

    [STAThread]
    static void Main(string[] a)
    {
        Application.EnableVisualStyles();
        string logDir = a[0], label = a[1], title = a[2];
        int x = int.Parse(a[3]), y = int.Parse(a[4]);
        bool topmost = a.Length > 5 && a[5] == "topmost";
        Form main = MakeForm(logDir, label, title, x, y, topmost);
        if (a.Length > 6)
        {
            Form second = MakeForm(logDir, label + "_second", a[6], x + 250, y, topmost);
            main.Shown += (s, e) => second.Show();
        }
        Application.Run(main);
    }
}
