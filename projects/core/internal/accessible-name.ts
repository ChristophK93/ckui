import { collapseText, readableText } from './text';

export interface CkNameSources {
  /** Count `title` as a name. */
  readonly title: boolean;
  /** Count the element's own visible text (not `aria-hidden` or `hidden` parts). */
  readonly text: boolean;
  /** Count the text of the `<label>` elements of a form control. */
  readonly labels?: boolean;
}

/** Whether the element has an accessible name: a label attribute, a label reference or readable text. */
export function hasAccessibleName(element: Element, sources: CkNameSources): boolean {
  const attribute = (name: string): boolean => (element.getAttribute(name) ?? '').trim() !== '';
  if (attribute('aria-label') || (sources.title && attribute('title'))) {
    return true;
  }
  if (sources.text && visibleText(element) !== '') {
    return true;
  }
  const named = (node: Element | null): boolean => (node?.textContent ?? '').trim() !== '';
  const labels = (element as Partial<HTMLInputElement>).labels;
  return (
    (element.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .some((id) => id !== '' && named(element.ownerDocument.getElementById(id))) ||
    (sources.labels === true && Array.from(labels ?? []).some(named))
  );
}

/** Text that is neither in an `aria-hidden` nor in a `hidden` subtree. */
function visibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').trim();
  }
  if (
    node instanceof Element &&
    (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden'))
  ) {
    return '';
  }
  return Array.from(node.childNodes, visibleText).join('');
}

/**
 * The name of the element as text, whitespace collapsed: the elements `aria-labelledby` names,
 * `aria-label`, the text of its `<label>`s, its readable content, then `title`. Empty when it has none.
 */
export function readAccessibleName(element: Element): string {
  const named = (element.getAttribute('aria-labelledby') ?? '')
    .split(/\s+/)
    .filter((id) => id !== '')
    .map((id) => collapseText(readableText(element.ownerDocument.getElementById(id))))
    .filter((text) => text !== '')
    .join(' ');
  if (named !== '') {
    return named;
  }
  const label = collapseText(element.getAttribute('aria-label'));
  if (label !== '') {
    return label;
  }
  const labelled = Array.from((element as Partial<HTMLInputElement>).labels ?? [])
    .map((node) => collapseText(readableText(node)))
    .filter((text) => text !== '')
    .join(' ');
  return (
    labelled || collapseText(readableText(element)) || collapseText(element.getAttribute('title'))
  );
}
