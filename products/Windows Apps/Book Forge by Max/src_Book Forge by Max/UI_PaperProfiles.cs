using System;

namespace BookForge
{
    public class PaperProfileInfo
    {
        public string Key { get; private set; }
        public string DisplayName { get; private set; }
        public int MaxWidthPx { get; private set; }
        public int MinHeightPx { get; private set; }
        public string Padding { get; private set; }
        public string FontSize { get; private set; }

        public PaperProfileInfo(string key, string displayName, int maxWidth, int minHeight, string padding, string fontSize)
        {
            this.Key = key;
            this.DisplayName = displayName;
            this.MaxWidthPx = maxWidth;
            this.MinHeightPx = minHeight;
            this.Padding = padding;
            this.FontSize = fontSize;
        }

        public override string ToString()
        {
            return DisplayName;
        }
    }

    public static class PaperProfiles
    {
        public static readonly PaperProfileInfo[] All = new PaperProfileInfo[]
        {
            new PaperProfileInfo("A6", "A6 (105 x 148 mm)", 380, 536, "24px 28px 36px 28px", "12.5px"),
            new PaperProfileInfo("A5", "A5 (148 x 210 mm)", 500, 710, "34px 38px 48px 38px", "13.5px"),
            new PaperProfileInfo("A4", "A4 (210 x 297 mm)", 700, 990, "46px 56px 62px 56px", "14.5px"),
            new PaperProfileInfo("B5", "B5 (176 x 250 mm)", 590, 838, "40px 46px 54px 46px", "14px"),
            new PaperProfileInfo("US-Trade", "US-Trade (152 x 229 mm)", 515, 774, "36px 40px 48px 40px", "13.5px"),
            new PaperProfileInfo("US-Letter", "US-Letter (216 x 279 mm)", 720, 932, "46px 56px 62px 56px", "14.5px"),
            new PaperProfileInfo("Mass-Market", "Mass-Market (108 x 175 mm)", 390, 632, "26px 30px 38px 30px", "12.5px"),
            new PaperProfileInfo("Kindle", "Kindle (120 x 160 mm)", 430, 574, "28px 32px 40px 32px", "13px"),
            new PaperProfileInfo("Crown", "Crown (189 x 246 mm)", 630, 820, "42px 48px 56px 48px", "14px")
        };

        public static PaperProfileInfo Find(string keyOrName)
        {
            if (!string.IsNullOrEmpty(keyOrName))
            {
                string trimmed = keyOrName.Trim();
                foreach (PaperProfileInfo p in All)
                {
                    if (p.Key.Equals(trimmed, StringComparison.OrdinalIgnoreCase) ||
                        p.DisplayName.Equals(trimmed, StringComparison.OrdinalIgnoreCase) ||
                        trimmed.StartsWith(p.Key, StringComparison.OrdinalIgnoreCase))
                    {
                        return p;
                    }
                }
            }

            // Default fallback: A5
            foreach (PaperProfileInfo p in All)
            {
                if (p.Key.Equals("A5", StringComparison.OrdinalIgnoreCase)) return p;
            }
            return All[0];
        }

        public static void PopulateDropdown(ModernDropdown dropdown, string selectedKey = "A5")
        {
            if (dropdown == null) return;
            dropdown.Items.Clear();
            int selectedIndex = 0;
            for (int i = 0; i < All.Length; i++)
            {
                dropdown.Items.Add(All[i].DisplayName);
                if (All[i].Key.Equals(selectedKey, StringComparison.OrdinalIgnoreCase) ||
                    selectedKey.StartsWith(All[i].Key, StringComparison.OrdinalIgnoreCase))
                {
                    selectedIndex = i;
                }
            }
            dropdown.SelectedIndex = selectedIndex;
        }

        public static string GetSelectedKey(ModernDropdown dropdown)
        {
            if (dropdown == null || dropdown.SelectedItem == null) return "A5";
            return Find(dropdown.SelectedItem.ToString()).Key;
        }

        public static void SetSelectedKey(ModernDropdown dropdown, string key)
        {
            if (dropdown == null) return;
            string targetKey = Find(key).Key;
            for (int i = 0; i < dropdown.Items.Count; i++)
            {
                if (dropdown.Items[i].ToString().StartsWith(targetKey, StringComparison.OrdinalIgnoreCase))
                {
                    dropdown.SelectedIndex = i;
                    break;
                }
            }
        }
    }
}
