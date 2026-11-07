using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace MaxApp.Common
{
    /// <summary>
    /// Top tab bar: an Info icon button followed by any number of mode tabs inside one rounded frame (toggle look).
    /// Tab index 0 is always Info, the mode tabs are 1..n. The app supplies the tab names and swaps its own panels in OnTabSelected.
    /// </summary>
    public class ModeTabBar : Panel
    {
        public const int InfoTabIndex = 0;

        private const string InfoIconName = "info.svg";
        private const int InfoIconSize = 16;
        private const int BarHeight = 34;
        private const int InfoGap = 6;
        private const int FramePad = 3;

        private readonly RoundedButton _btnInfo;
        private readonly RoundedPanel _frame;
        private readonly List<RoundedButton> _tabs = new List<RoundedButton>();
        private readonly Dictionary<int, int> _fixedWidths = new Dictionary<int, int>();
        private ThemeTokens _theme = ThemeTokens.DarkTheme();
        private int _selectedIndex = InfoTabIndex;
        private bool _showInfoButton = true;

        /// <summary>Raised when the user clicks a tab. Set SelectedIndex to change the tab from code (that does not raise this event).</summary>
        public event Action<int> OnTabSelected;

        public ModeTabBar()
        {
            _btnInfo = new RoundedButton();
            _btnInfo.ImageAlign = ContentAlignment.MiddleCenter;
            _btnInfo.Click += (s, e) => SelectFromClick(InfoTabIndex);

            _frame = new RoundedPanel { BorderSize = 1 };

            this.Controls.Add(_btnInfo);
            this.Controls.Add(_frame);
            ApplyTheme(_theme);
        }

        public bool ShowInfoButton
        {
            get { return _showInfoButton; }
            set
            {
                if (_showInfoButton == value) return;
                _showInfoButton = value;
                LayoutBar();
            }
        }

        public int SelectedIndex
        {
            get { return _selectedIndex; }
            set
            {
                _selectedIndex = value;
                ApplySelectionColors();
            }
        }

        /// <summary>
        /// Sets the mode tabs, in order. Calling it again with the same number of tabs only renames them (the buttons stay the same objects),
        /// so it is also the way to apply a language change.
        /// </summary>
        public void SetTabs(params string[] titles)
        {
            while (_tabs.Count > titles.Length)
            {
                RoundedButton last = _tabs[_tabs.Count - 1];
                _tabs.RemoveAt(_tabs.Count - 1);
                _frame.Controls.Remove(last);
                last.Dispose();
            }
            while (_tabs.Count < titles.Length)
            {
                _tabs.Add(CreateTabButton(_tabs.Count + 1));
            }
            for (int i = 0; i < titles.Length; i++)
            {
                _tabs[i].Text = titles[i];
            }
            LayoutBar();
            ApplySelectionColors();
        }

        /// <summary>Gives a mode tab (1..n) a fixed width. Tabs without one share the remaining width equally.</summary>
        public void SetTabFixedWidth(int tabIndex, int width)
        {
            _fixedWidths[tabIndex] = width;
            LayoutBar();
        }

        /// <summary>The button of a tab (0 = Info, 1..n = mode tabs), for app-specific painting or tooltips. Null if there is no such tab.</summary>
        public RoundedButton GetTabButton(int tabIndex)
        {
            if (tabIndex == InfoTabIndex) return _btnInfo;
            return (tabIndex >= 1 && tabIndex <= _tabs.Count) ? _tabs[tabIndex - 1] : null;
        }

        public void ApplyTheme(ThemeTokens theme)
        {
            _theme = theme ?? ThemeTokens.DarkTheme();

            _btnInfo.BorderRadius = _theme.RadiusMd;
            _frame.BorderRadius = _theme.RadiusMd;
            _frame.BorderColor = _theme.BorderColor;
            _frame.BackColor = _theme.BgElevated;
            foreach (RoundedButton tab in _tabs)
            {
                tab.BorderRadius = InnerTabRadius;
            }
            ApplySelectionColors();
            _frame.Invalidate();
        }

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            LayoutBar();
        }

        // Inner tabs use a slightly smaller radius so they nest inside the frame
        private int InnerTabRadius
        {
            get { return Math.Max(2, _theme.RadiusMd - FramePad); }
        }

        private RoundedButton CreateTabButton(int tabIndex)
        {
            RoundedButton btn = new RoundedButton
            {
                BorderRadius = InnerTabRadius,
                Font = ThemeTokens.FontCard(FontStyle.Bold)
            };
            btn.Click += (s, e) => SelectFromClick(tabIndex);
            _frame.Controls.Add(btn);
            return btn;
        }

        private void SelectFromClick(int tabIndex)
        {
            SelectedIndex = tabIndex;
            if (OnTabSelected != null) OnTabSelected(tabIndex);
        }

        private void ApplySelectionColors()
        {
            ApplyButtonColors(_btnInfo, _selectedIndex == InfoTabIndex);
            _btnInfo.Image = SvgFileRenderer.GetCachedTintedIcon(InfoIconName, InfoIconSize, InfoIconSize, _btnInfo.ForeColor);

            for (int i = 0; i < _tabs.Count; i++)
            {
                ApplyButtonColors(_tabs[i], _selectedIndex == i + 1);
            }
        }

        // The unselected tabs share the frame's colour so they blend into it
        private void ApplyButtonColors(RoundedButton btn, bool selected)
        {
            btn.NormalColor = selected ? _theme.AccentPrimary : _theme.BgElevated;
            btn.HoverColor = selected ? _theme.AccentPrimaryHover : _theme.BorderHover;
            btn.ForeColor = selected ? Color.White : _theme.TextSecondary;
            btn.Invalidate();
        }

        private void LayoutBar()
        {
            _btnInfo.Visible = _showInfoButton;
            _btnInfo.Bounds = new Rectangle(0, 0, BarHeight, BarHeight);

            int frameX = _showInfoButton ? BarHeight + InfoGap : 0;
            int frameW = Math.Max(0, this.Width - frameX);
            _frame.Bounds = new Rectangle(frameX, 0, frameW, BarHeight);

            int fixedTotal = 0;
            int flexCount = 0;
            for (int i = 0; i < _tabs.Count; i++)
            {
                int width;
                if (_fixedWidths.TryGetValue(i + 1, out width)) fixedTotal += width;
                else flexCount++;
            }

            int flexSpace = Math.Max(0, frameW - FramePad * 2 - fixedTotal);
            int flexWidth = flexCount > 0 ? flexSpace / flexCount : 0;
            int flexExtra = flexCount > 0 ? flexSpace % flexCount : 0;

            int x = FramePad;
            for (int i = 0; i < _tabs.Count; i++)
            {
                int width;
                if (!_fixedWidths.TryGetValue(i + 1, out width))
                {
                    width = flexWidth;
                    if (flexExtra > 0)
                    {
                        width++;
                        flexExtra--;
                    }
                }
                _tabs[i].Bounds = new Rectangle(x, FramePad, width, BarHeight - FramePad * 2);
                x += width;
            }
        }
    }
}
