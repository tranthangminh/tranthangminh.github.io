namespace ModernAutoClicker.Advanced
{
    /// <summary>
    /// Column grid of the Asian step table, shared by the header labels and every step row so both always line up.
    /// The Note column takes whatever width is left.
    /// </summary>
    public static class MacroColumnLayout
    {
        public const int Gap = 5;

        public const int NoW = 28;
        public const int CheckW = 20;
        public const int WinW = 32;
        public const int ActionW = 122;
        public const int TargetW = 150;
        public const int HoldW = 44;
        public const int DelayW = 64;
        public const int RepW = 30;
        public const int DelW = 24;

        public const int NoX = 2;
        public const int CheckX = NoX + NoW + Gap;
        public const int WinX = CheckX + CheckW + Gap;
        public const int ActionX = WinX + WinW + Gap;
        public const int TargetX = ActionX + ActionW + Gap;
        public const int HoldX = TargetX + TargetW + Gap;
        public const int DelayX = HoldX + HoldW + Gap;
        public const int RepX = DelayX + DelayW + Gap;
        public const int DelX = RepX + RepW + Gap;
        public const int NoteX = DelX + DelW + Gap;
    }
}
