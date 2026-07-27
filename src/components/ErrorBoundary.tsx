import React from 'react';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/** Wraps the whole app (see App.tsx). Every specific crash found and fixed
 * this whole build (null team slots, malformed events, etc.) was caught by
 * careful, iterative testing — but there's no guarantee every edge case a
 * friend hits during wider TestFlight testing has been seen yet. Without
 * this, an uncaught error anywhere shows a hard crash or a blank screen,
 * with zero information and zero way to recover short of force-quitting.
 * With it: a plain, honest "something went wrong" screen and a way to
 * retry without losing the favorite team / settings already saved to
 * AsyncStorage (this only resets the crashed render tree, not app data). */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Same __DEV__ gating used everywhere else in this app — silent in a
    // real TestFlight/production build, visible in Metro during dev.
    if (__DEV__) {
      console.log('[ErrorBoundary] caught:', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}
