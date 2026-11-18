using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

// A small window used as a target. What it receives is appended to files in <logDir>:
//   <label>.clicks  one line per mouse press ("x", "xc" when Ctrl rode on the press)
//   <label>.keys    the characters typed (WM_CHAR)
//   <label>.drags   one line per press, moves with the button held, release
//   <label>.wheel   one line per wheel notch
// Args: logDir label title x y [mode] [secondTitle]  (secondTitle = a second window in the same process)
// mode: normal, topmost,
//       game   = counts a press only while it believes it is the active app (WM_ACTIVATEAPP) and the pointer hovered that spot first,
//       grabby = brings itself to the front when pressed, as Chrome does with a posted click
class WinTarget : Form
{
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a, uint b, bool attach);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();

    readonly string logDir, label, mode;
    bool active, dragging, movedWhileDown;
    IntPtr hoverLParam = (IntPtr)(-1);

    WinTarget(string logDir, string label, string title, int x, int y, string mode)
    {
        this.logDir = logDir;
        this.label = label;
        this.mode = mode;
        Text = title;
        StartPosition = FormStartPosition.Manual;
        Location = new Point(x, y);
        Size = new Size(240, 110);
        TopMost = mode == "topmost";
    }

    void Log(string ext, string line)
    {
        // The test may be reading the file at this moment
        for (int attempt = 0; attempt < 50; attempt++)
        {
            try { File.AppendAllText(Path.Combine(logDir, label + ext), line); return; }
            catch (IOException) { System.Threading.Thread.Sleep(5); }
        }
    }

    protected override void WndProc(ref Message m)
    {
        switch (m.Msg)
        {
            case 0x001C: active = m.WParam != IntPtr.Zero; break; // WM_ACTIVATEAPP
            case 0x0200: // WM_MOUSEMOVE
                hoverLParam = m.LParam;
                if (dragging && ((int)m.WParam & 0x13) != 0) movedWhileDown = true;
                break;
            case 0x0201: case 0x0204: case 0x0207: case 0x0203: // button down, double click
                bool counts = mode != "game" || (active && m.LParam == hoverLParam);
                if (counts) Log(".clicks", (((int)m.WParam & 0x0008) != 0 ? "xc" : "x") + "\n");
                dragging = true;
                movedWhileDown = false;
                if (mode == "grabby") TakeFront();
                break;
            case 0x0202: case 0x0205: case 0x0208: // button up
                if (dragging && movedWhileDown) Log(".drags", "d\n");
                dragging = false;
                break;
            case 0x020A: Log(".wheel", ((short)((long)m.WParam >> 16) > 0 ? "up" : "down") + "\n"); break;
            case 0x0102: Log(".keys", ((char)(int)m.WParam).ToString()); break; // WM_CHAR
        }
        base.WndProc(ref m);
    }

    void TakeFront()
    {
        uint pid;
        uint fg = GetWindowThreadProcessId(GetForegroundWindow(), out pid);
        uint me = GetCurrentThreadId();
        bool attached = fg != me && AttachThreadInput(me, fg, true);
        BringWindowToTop(Handle);
        SetForegroundWindow(Handle);
        if (attached) AttachThreadInput(me, fg, false);
    }

    [STAThread]
    static void Main(string[] a)
    {
        Application.EnableVisualStyles();
        string mode = a.Length > 5 ? a[5] : "normal";
        int x = int.Parse(a[3]), y = int.Parse(a[4]);
        WinTarget main = new WinTarget(a[0], a[1], a[2], x, y, mode);
        if (a.Length > 6)
        {
            WinTarget second = new WinTarget(a[0], a[1] + "_second", a[6], x + 250, y, mode);
            main.Shown += (s, e) => second.Show();
        }
        Application.Run(main);
    }
}
