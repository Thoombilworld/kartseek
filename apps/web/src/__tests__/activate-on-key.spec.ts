import { activateOnKey, buttonActivationProps, rowActivationProps } from '@/lib/a11y/activate-on-key';

/**
 * Behaviour of the keyboard-activation helpers.
 *
 * The static sweep in keyboard-access.spec.ts proves every non-interactive
 * control now *has* a key handler; this proves the handler does the right thing.
 * Both matter: a handler that fires on every key, or that swallows a nested
 * button's Space, would pass the static check and break the app.
 */

interface FakeEvent {
  key: string;
  target: unknown;
  currentTarget: unknown;
  preventDefault: () => void;
  defaultPrevented: boolean;
}

function evt(key: string, opts: { sameTarget?: boolean } = {}): FakeEvent {
  const el = { id: 'self' };
  const inner = { id: 'inner' };
  const e: FakeEvent = {
    key,
    currentTarget: el,
    target: opts.sameTarget === false ? inner : el,
    defaultPrevented: false,
    preventDefault() { e.defaultPrevented = true; },
  };
  return e;
}

const fire = (handler: unknown, e: FakeEvent) =>
  (handler as (ev: FakeEvent) => void)(e);

describe('activateOnKey', () => {
  it('fires on Enter', () => {
    let n = 0;
    fire(activateOnKey(() => n++), evt('Enter'));
    expect(n).toBe(1);
  });

  it('fires on Space and suppresses the page scroll', () => {
    let n = 0;
    const e = evt(' ');
    fire(activateOnKey(() => n++), e);
    expect(n).toBe(1);
    // Without preventDefault, pressing Space on a focused card scrolls the page.
    expect(e.defaultPrevented).toBe(true);
  });

  it('ignores every other key', () => {
    let n = 0;
    const handler = activateOnKey(() => n++);
    for (const k of ['a', 'Tab', 'Escape', 'ArrowDown', 'Shift', 'Backspace']) {
      fire(handler, evt(k));
    }
    expect(n).toBe(0);
  });

  it('does not hijack a keystroke aimed at a nested control', () => {
    // Rows and cards contain their own buttons and links. Space on an inner
    // "Approve" button must not also toggle the row that wraps it.
    let n = 0;
    fire(activateOnKey(() => n++), evt(' ', { sameTarget: false }));
    expect(n).toBe(0);
  });
});

describe('buttonActivationProps', () => {
  it('exposes the element as a focusable button', () => {
    const p = buttonActivationProps(() => {});
    expect(p.role).toBe('button');
    expect(p.tabIndex).toBe(0);
    expect(typeof p.onKeyDown).toBe('function');
  });
});

describe('rowActivationProps', () => {
  it('keeps the row role so table semantics survive', () => {
    // Overriding <tr> with role="button" would stop a screen reader announcing
    // the row's column context, which is what makes the data readable.
    const p = rowActivationProps(() => {}) as Record<string, unknown>;
    expect(p.role).toBeUndefined();
    expect(p.tabIndex).toBe(0);
  });

  it('announces expansion state when the row toggles a detail panel', () => {
    expect((rowActivationProps(() => {}, true) as Record<string, unknown>)['aria-expanded']).toBe(true);
    expect((rowActivationProps(() => {}, false) as Record<string, unknown>)['aria-expanded']).toBe(false);
    // Omitted entirely for rows that do not expand, rather than sent as false.
    expect('aria-expanded' in (rowActivationProps(() => {}) as object)).toBe(false);
  });
});
