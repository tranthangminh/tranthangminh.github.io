using MaxApp.Common;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;
using Loc = ModernAutoClicker.Localization.Loc;

namespace ModernAutoClicker
{
    /// <summary>
    /// The list every target button opens: All Screens first, then every open window, read at the moment the list opens.
    /// </summary>
    public static class TargetWindowMenu
    {
        /// <summary>onPicked receives the chosen window, or null for All Screens.</summary>
        public static void Show(Control anchor, ThemeTokens theme, Action<NativeMethods.WindowTargetInfo> onPicked, Action onClosed = null)
        {
            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Renderer = new ModernMenuRenderer(theme);
            menu.ShowImageMargin = true;
            menu.Closed += (s, e) =>
            {
                if (onClosed != null) onClosed();
                // Disposed only after the clicked item has run
                anchor.BeginInvoke((Action)(() => menu.Dispose()));
            };

            ToolStripMenuItem itemDesktop = new ToolStripMenuItem(Loc.TargetAllScreens);
            itemDesktop.Image = IconCache.DesktopIcon;
            itemDesktop.Click += (s, e) => onPicked(null);
            menu.Items.Add(itemDesktop);
            menu.Items.Add(new ToolStripSeparator());

            List<NativeMethods.WindowTargetInfo> windows = NativeMethods.GetOpenWindows();
            if (windows.Count == 0)
            {
                ToolStripMenuItem itemEmpty = new ToolStripMenuItem(Loc.TargetNoOpenWindows);
                itemEmpty.Enabled = false;
                menu.Items.Add(itemEmpty);
            }

            foreach (NativeMethods.WindowTargetInfo window in windows)
            {
                NativeMethods.WindowTargetInfo picked = window;
                ToolStripMenuItem itemWindow = new ToolStripMenuItem(MenuText.Escape(window.ToString()));
                itemWindow.Image = window.AppIcon ?? IconCache.GenericAppIcon;
                itemWindow.Click += (s, e) =>
                {
                    if (picked.AppIcon != null) IconCache.CacheProcessIcon(picked.ProcessName, picked.AppIcon);
                    onPicked(picked);
                };
                menu.Items.Add(itemWindow);
            }

            menu.Show(anchor, new Point(0, anchor.Height));
        }
    }
}
