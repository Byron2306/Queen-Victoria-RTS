type DebugValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Readonly<Record<string, unknown>>
  | readonly unknown[];

const state: Record<string, DebugValue> = {};

let overlay: HTMLPreElement | null = null;
let frameHandle = 0;

function safeStringify(value: DebugValue): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function canvasMetrics(): Record<string, unknown> {
  if (typeof document === 'undefined') {
    return {};
  }

  const canvas =
    document.querySelector('canvas');

  const rect =
    canvas?.getBoundingClientRect();

  return {
    innerWidth:
      typeof window !== 'undefined'
        ? window.innerWidth
        : undefined,
    innerHeight:
      typeof window !== 'undefined'
        ? window.innerHeight
        : undefined,
    devicePixelRatio:
      typeof window !== 'undefined'
        ? window.devicePixelRatio
        : undefined,
    canvasWidth:
      canvas?.width,
    canvasHeight:
      canvas?.height,
    cssWidth:
      rect?.width,
    cssHeight:
      rect?.height,
  };
}

function render(): void {
  if (!overlay) {
    return;
  }

  state.viewport = canvasMetrics();

  overlay.textContent =
    Object.entries(state)
      .map(([key, value]) =>
        `${key}: ${safeStringify(value)}`,
      )
      .join('\n');

  frameHandle =
    requestAnimationFrame(render);
}

export function publishLiveDebug(
  key: string,
  value: DebugValue,
): void {
  state[key] = value;
}

export function installLiveDebugOverlay(): void {
  if (
    typeof document === 'undefined' ||
    overlay
  ) {
    return;
  }

  overlay =
    document.createElement('pre');

  overlay.id = 'qv-live-debug';

  Object.assign(
    overlay.style,
    {
      position: 'fixed',
      left: '8px',
      top: '8px',
      zIndex: '2147483647',
      pointerEvents: 'none',
      margin: '0',
      padding: '8px 10px',
      maxWidth: '92vw',
      maxHeight: '88vh',
      overflow: 'hidden',
      whiteSpace: 'pre-wrap',
      font:
        '11px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      color: '#b9ffca',
      background:
        'rgba(0, 0, 0, 0.78)',
      border:
        '1px solid rgba(185, 255, 202, 0.45)',
      borderRadius: '6px',
    },
  );

  document.body.appendChild(overlay);

  publishLiveDebug(
    'debug',
    'installed',
  );

  window.addEventListener(
    'error',
    (event) => {
      publishLiveDebug(
        'error',
        {
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      );
    },
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      publishLiveDebug(
        'unhandledrejection',
        String(event.reason),
      );
    },
  );

  cancelAnimationFrame(frameHandle);
  frameHandle =
    requestAnimationFrame(render);
}
