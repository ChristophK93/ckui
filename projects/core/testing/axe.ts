import axe from 'axe-core';

/** Runs axe-core on the element and fails with a readable list of violations. */
export async function expectNoAxeViolations(element: Element): Promise<void> {
  const results = await axe.run(element);
  if (results.violations.length > 0) {
    const lines = results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.help}\n` +
        violation.nodes.map((node) => `    ${node.target.join(' ')}`).join('\n'),
    );
    throw new Error(`Found ${results.violations.length} axe violation(s):\n${lines.join('\n')}`);
  }
}
