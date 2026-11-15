let context: CanvasRenderingContext2D | null = null;

/** Flattens a translucent colour over an opaque one into an opaque `rgb()` string, so contrast can be measured. */
export function compositeOver(overlay: string, base: string): string {
  context ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('A 2D canvas context is needed to composite colours.');
  }
  const canvas = context;
  const paint = (colour: string): void => {
    canvas.fillStyle = '#000000';
    canvas.fillStyle = colour;
    const first = canvas.fillStyle;
    canvas.fillStyle = '#ffffff';
    canvas.fillStyle = colour;
    if (first !== canvas.fillStyle) {
      throw new Error(`Not a valid CSS colour: "${colour}".`);
    }
    canvas.fillRect(0, 0, 1, 1);
  };
  canvas.clearRect(0, 0, 1, 1);
  paint(base);
  paint(overlay);
  const [red, green, blue] = canvas.getImageData(0, 0, 1, 1).data;
  return `rgb(${red}, ${green}, ${blue})`;
}
