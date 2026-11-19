/**
 * Marks a consumer's `<label>` as required: a `--required` modifier on the label and one
 * `aria-hidden` marker span at its end. Reuses a marker that is already in the label (server
 * render) instead of adding a second.
 */
export function syncRequiredMarker(
  label: HTMLElement,
  required: boolean,
  classes: { readonly label: string; readonly marker: string },
): void {
  const markers = Array.from(label.children).filter((child) =>
    child.classList.contains(classes.marker),
  );
  label.classList.toggle(`${classes.label}--required`, required);
  if (!required) {
    markers.forEach((marker) => marker.remove());
    return;
  }
  markers.slice(1).forEach((marker) => marker.remove());
  if (markers.length === 0) {
    const marker = label.ownerDocument.createElement('span');
    marker.setAttribute('aria-hidden', 'true');
    marker.className = classes.marker;
    marker.textContent = ' *';
    label.append(marker);
  }
}
