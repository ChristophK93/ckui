/** Ctrl or Meta held: a shortcut of the browser or the app, not ours. AltGr counts as Ctrl+Alt on Windows. */
export function hasCommandKey(event: KeyboardEvent): boolean {
  return event.metaKey || (event.ctrlKey && !event.getModifierState('AltGraph'));
}

/** A key that types one character, for typeahead. */
export function isPrintableKey(event: KeyboardEvent): boolean {
  return (
    event.key.length === 1 &&
    !event.metaKey &&
    ((!event.ctrlKey && !event.altKey) || event.getModifierState('AltGraph'))
  );
}
