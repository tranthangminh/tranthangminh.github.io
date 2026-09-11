using System;

namespace ModernAutoClicker.Advanced
{
    public enum MacroActionType
    {
        LeftClick = 0,
        RightClick = 1,
        MiddleClick = 2,
        DoubleClick = 3,
        DragDrop = 4,
        KeyPress = 5,
        TypeText = 6,
        Delay = 7,
        WaitColor = 8,
        IfColor = 9,
        IfColorArea = 10,
        WaitChange = 11,
        RunScript = 12
    }
}
