using System.Text;

namespace ModernAutoClicker
{
    /// <summary>
    /// Rebuilds the text typed during action recording, like a tiny editor: real keys append, Backspace deletes the last character.
    /// Vietnamese input methods (Unikey / EVKey in Unicode mode) swallow the tone/accent key and instead inject
    /// Backspace(s) + Unicode characters; when such an injected edit arrives right after a real key, that real key
    /// never reached the target app, so it is dropped before the edit is applied ("her" -> "hẻ", "ddungs" -> "đúng").
    /// Pure logic (no hooks, no clock) so it can be fed recorded event sequences in tests.
    /// </summary>
    public class RecordedTextBuffer
    {
        // An injected edit this soon after a real key means the input method swallowed that key
        public const int SwallowWindowMs = 30;

        private readonly StringBuilder _text = new StringBuilder();
        private bool _lastRealKeyMayBeSwallowed;
        private int _lastRealKeyTick;

        public int Length { get { return _text.Length; } }

        public void AddRealText(string text, int tick)
        {
            if (string.IsNullOrEmpty(text)) return;
            _text.Append(text);
            _lastRealKeyMayBeSwallowed = true;
            _lastRealKeyTick = tick;
        }

        public void AddInjectedText(string text, int tick)
        {
            if (string.IsNullOrEmpty(text)) return;
            DropSwallowedRealKey(tick);
            _text.Append(text);
        }

        /// <summary>
        /// Applies a Backspace to the text being typed. Returns false when there is nothing to delete
        /// (the caller then records Backspace as its own Key Press step).
        /// </summary>
        public bool Backspace(bool injected, int tick)
        {
            if (injected) DropSwallowedRealKey(tick);
            else _lastRealKeyMayBeSwallowed = false;

            if (_text.Length == 0) return false;
            _text.Length--;
            return true;
        }

        public bool EndsWith(string text)
        {
            if (string.IsNullOrEmpty(text) || text.Length > _text.Length) return false;
            return string.CompareOrdinal(_text.ToString(_text.Length - text.Length, text.Length), text) == 0;
        }

        /// <summary>
        /// Takes back the last typed characters when the key that typed them turns out to be the key of a Press &amp; Click.
        /// </summary>
        public bool RemoveLast(string text)
        {
            if (!EndsWith(text)) return false;
            _text.Length -= text.Length;
            _lastRealKeyMayBeSwallowed = false;
            return true;
        }

        public string Take()
        {
            string result = _text.ToString();
            _text.Length = 0;
            _lastRealKeyMayBeSwallowed = false;
            return result;
        }

        // Only the first injected event of a rewrite can drop the real key that triggered it
        private void DropSwallowedRealKey(int tick)
        {
            if (_lastRealKeyMayBeSwallowed && unchecked(tick - _lastRealKeyTick) <= SwallowWindowMs && _text.Length > 0)
            {
                _text.Length--;
            }
            _lastRealKeyMayBeSwallowed = false;
        }
    }
}
