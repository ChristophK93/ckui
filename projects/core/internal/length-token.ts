/** Pixels of a length token (`--ck-space-1`), resolved through a probe so `rem` and `px` both work. */
export function tokenPixels(container: HTMLElement, token: string, fallback: number): number {
  const probe = container.ownerDocument.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;inline-size:var(${token}, ${fallback}px)`;
  container.append(probe);
  const pixels = probe.offsetWidth;
  probe.remove();
  return pixels;
}
