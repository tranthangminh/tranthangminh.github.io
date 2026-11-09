using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Windows.Forms;
using MaxApp.Common;

// The shared frame inside the Book Forge build: a message box and a parallel popup, without opening Book Forge itself.
class SmokePopup : ModernDialog
{
    public SmokePopup() : base("Book Forge popup")
    {
        Body.Controls.Add(new Label { Location = new Point(16, 12), Size = new Size(240, 20), Text = "Parallel popup in Book Forge" });
        this.AcceptButton = AddButton("Close", DialogResult.OK, true);
        SetBodySize(280, 44);
    }
}

class BookForgeSmoke
{
    static int pass, fail;
    static void Check(string name, bool ok)
    {
        if (ok) pass++; else fail++;
        Console.WriteLine((ok ? "PASS " : "FAIL ") + name);
    }

    static void Shot(Form f, string path)
    {
        f.Refresh();
        Application.DoEvents();
        Rectangle r = f.Bounds;
        using (Bitmap bmp = new Bitmap(r.Width, r.Height))
        {
            using (Graphics g = Graphics.FromImage(bmp)) g.CopyFromScreen(r.Location, Point.Empty, r.Size);
            bmp.Save(path, ImageFormat.Png);
        }
    }

    [STAThread]
    static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Form host = new Form { TopMost = true, StartPosition = FormStartPosition.Manual, Location = new Point(10, 10), Size = new Size(460, 320), FormBorderStyle = FormBorderStyle.None, BackColor = Color.DimGray };
        DialogResult boxResult = DialogResult.None;
        int stage = 0;
        Timer t = new Timer { Interval = 250 };
        SmokePopup parallel = null;
        t.Tick += (s, e) =>
        {
            stage++;
            if (stage == 1)
            {
                host.BeginInvoke((Action)(() => { boxResult = ModernMessageBox.Show("Book Forge message", "Title", MessageBoxButtons.YesNo, MessageBoxIcon.Question, host); }));
            }
            else if (stage == 3)
            {
                ModernMessageBox box = null;
                foreach (Form x in Application.OpenForms) { if (x is ModernMessageBox) box = (ModernMessageBox)x; }
                Check("message box opens", box != null && box.Visible);
                Check("message box locks the window", WindowHelper.IsBlockedByDialog(host));
                Shot(box, Path.Combine(args[0], "bf_box.png"));
                box.DialogResult = DialogResult.Yes;
            }
            else if (stage == 5)
            {
                Check("message box returns", boxResult == DialogResult.Yes);
                Check("window free again", !WindowHelper.IsBlockedByDialog(host));
                parallel = ModernDialog.ShowParallel(host, () => new SmokePopup());
            }
            else if (stage == 7)
            {
                Check("parallel opens", parallel.Visible);
                Check("parallel leaves the window free", !WindowHelper.IsBlockedByDialog(host));
                ThemeTokens.Current = ThemeTokens.LightTheme();
                Check("parallel follows the theme", parallel.BackColor == ThemeTokens.Current.BgSecondary);
                Shot(parallel, Path.Combine(args[0], "bf_parallel.png"));
                parallel.Close();
            }
            else if (stage == 9)
            {
                t.Stop();
                Console.WriteLine("RESULT " + pass + " passed, " + fail + " failed");
                host.Close();
            }
        };
        host.Shown += (s, e) => t.Start();
        Application.Run(host);
    }
}
