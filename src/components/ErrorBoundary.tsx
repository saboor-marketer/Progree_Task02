import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence: a render-time crash should never leave a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[isobar] render failure", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center px-5 py-16">
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          style={{ background: "linear-gradient(178deg,#0a1a2a,#123a55 45%,#1f6285 78%,#f0a860)" }}
        />
        <div className="panel w-full max-w-xl rounded-lg p-7">
          <p className="label-mono mb-2 !text-ember/80">Unhandled render error</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
            The board crashed while drawing itself
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/65">
            A component threw during render. Reload to re-run the request pipeline, or reset local state if
            the problem repeats.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-white/60">
            {error.message}
          </pre>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded bg-[#ffb020] px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#08131f] transition-transform hover:-translate-y-px hover:brightness-110"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
              className="rounded border border-white/18 px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              Reset local state
            </button>
          </div>
        </div>
      </div>
    );
  }
}
