using System.Drawing;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    /// <summary>
    /// Names of the app's own icons (SVG files in the svg/ folder, embedded by build.bat) and helpers to tint them.
    /// Icons are re-tinted whenever the theme or a button's usable/gray state changes, so callers always go through here.
    /// </summary>
    public static class AppIcons
    {
        public const string Add = "add.svg";
        public const string Clone = "clone.svg";
        public const string Clear = "clear.svg";
        public const string Save = "save.svg";
        public const string Import = "import.svg";
        public const string Start = "start.svg";
        public const string MoveAndScale = "move-and-scale.svg";
        public const string Close = "close.svg";
        public const string Coordinate = "coordinate.svg";
        public const string Swap = "swap.svg";
        public const string LeftClick = "left-click.svg";
        public const string RightClick = "right-click.svg";
        public const string MiddleClick = "middle-click.svg";
        public const string Up = "up.svg";
        public const string Down = "down.svg";
        public const string Left = "left.svg";
        public const string Right = "right.svg";

        // RoundedButton draws images at most 16px
        public const int ButtonSize = 16;

        public static Image Get(string icon, Color tint, int size = ButtonSize)
        {
            return ModernAutoClicker.Info.SvgFileRenderer.GetCachedTintedIcon(icon, size, size, tint);
        }

        // IconTextButton draws its icon next to the text; other buttons use the standard image slot with the given alignment
        public static void Set(ButtonBase button, string icon, Color tint, ContentAlignment align = ContentAlignment.MiddleLeft)
        {
            if (button == null) return;
            IconTextButton iconText = button as IconTextButton;
            if (iconText != null)
            {
                iconText.Icon = Get(icon, tint);
                return;
            }
            button.Image = Get(icon, tint);
            button.ImageAlign = align;
            button.Invalidate();
        }
    }
}
