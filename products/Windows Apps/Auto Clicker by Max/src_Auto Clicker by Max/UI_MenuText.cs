using MaxApp.Common;

namespace ModernAutoClicker
{
    /// <summary>
    /// Text shown in Windows menus (ToolStripMenuItem, including the ModernDropdown popup list): a single '&amp;' is taken as
    /// the keyboard-shortcut marker and hidden ("Press &amp; Click" would show as "Press  Click"); "&amp;&amp;" shows one '&amp;'.
    /// </summary>
    public static class MenuText
    {
        public static string Escape(string text)
        {
            return text == null ? null : text.Replace("&", "&&");
        }

        /// <summary>
        /// For a ModernDropdown filled with escaped items: its closed box draws the item as plain text, so it is shown unescaped there.
        /// </summary>
        public static void ShowEscapedItemsPlain(ModernDropdown dropdown)
        {
            dropdown.CollapsedTextProvider = (idx) => dropdown.Items[idx].Replace("&&", "&");
        }
    }
}
