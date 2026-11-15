let canvasContext: CanvasRenderingContext2D | null = null;

function toRgb(color: string): [number, number, number] {
  canvasContext ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!canvasContext) {
    throw new Error('A 2D canvas context is needed to resolve colours.');
  }
  const probe = canvasContext;
  // A rejected colour leaves fillStyle unchanged, so two different sentinels reveal it.
  probe.fillStyle = '#000000';
  probe.fillStyle = color;
  const first = probe.fillStyle;
  probe.fillStyle = '#ffffff';
  probe.fillStyle = color;
  if (first !== probe.fillStyle) {
    throw new Error(`Not a valid CSS colour: "${color}".`);
  }
  probe.clearRect(0, 0, 1, 1);
  probe.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = probe.getImageData(0, 0, 1, 1).data;
  if (alpha !== 255) {
    throw new Error(`Contrast needs an opaque colour, got "${color}".`);
  }
  return [red, green, blue];
}

function luminance([red, green, blue]: [number, number, number]): number {
  const [linearRed, linearGreen, linearBlue] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
}

/** WCAG contrast ratio of two opaque CSS colours, resolved to sRGB through a 1×1 canvas. */
export function contrastRatio(foreground: string, background: string): number {
  const [first, second] = [luminance(toRgb(foreground)), luminance(toRgb(background))];
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** The computed value of a custom property on an element, trimmed. */
export function resolveToken(element: Element, token: string): string {
  return getComputedStyle(element).getPropertyValue(token).trim();
}
