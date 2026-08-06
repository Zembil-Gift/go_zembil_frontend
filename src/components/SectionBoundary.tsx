import React from "react";

interface Props {
  children: React.ReactNode;
  /** Rendered instead of the section when it throws. Defaults to nothing. */
  fallback?: React.ReactNode;
  /** Shown in the console so a swallowed section is still traceable. */
  name?: string;
}

/**
 * Keeps one broken section from taking down the page it sits on.
 *
 * A section that throws while rendering — a shape the API didn't promise, a
 * field that's suddenly undefined — would otherwise unmount the whole React
 * tree and leave a blank site. Here it collapses to its fallback and every
 * sibling section carries on with its own data.
 *
 * Class component because React only exposes error boundaries that way.
 */
export default class SectionBoundary extends React.Component<
  Props,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Section "${this.props.name ?? "unknown"}" failed:`, error);
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
