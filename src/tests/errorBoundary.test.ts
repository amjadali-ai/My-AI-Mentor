import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

describe('Global ErrorBoundary Component (ErrorBoundary.tsx)', () => {
  it('updates state to hasError: true via getDerivedStateFromError', () => {
    const testError = new Error('Simulated runtime failure in component');
    const newState = ErrorBoundary.getDerivedStateFromError(testError);

    expect(newState.hasError).toBe(true);
    expect(newState.error).toBe(testError);
    expect(newState.error?.message).toBe('Simulated runtime failure in component');
  });

  it('resets error state when handleReset is called', () => {
    const onResetMock = vi.fn();
    const instance = new ErrorBoundary({ children: null, onReset: onResetMock });

    // Attach mock updater so setState functions on unmounted unit test instance
    (instance as any).updater = {
      isMounted: () => true,
      enqueueSetState: (inst: any, partialState: any) => {
        const update = typeof partialState === 'function' ? partialState(inst.state, inst.props) : partialState;
        Object.assign(inst.state, update);
      },
    };

    // Set error state as if an error was caught
    instance.state = {
      hasError: true,
      error: new Error('Initial crash'),
      errorInfo: { componentStack: 'at FaultyComponent' },
      showDetails: true,
      copied: false,
      exportingBackup: false,
      exportSuccess: false,
    };

    instance.handleReset();

    expect(onResetMock).toHaveBeenCalledTimes(1);
    expect(instance.state.hasError).toBe(false);
    expect(instance.state.error).toBeNull();
    expect(instance.state.errorInfo).toBeNull();
    expect(instance.state.showDetails).toBe(false);
  });

  it('safely handles onReset exceptions without crashing the reset cycle', () => {
    const faultyResetMock = vi.fn().mockImplementation(() => {
      throw new Error('Callback failed');
    });
    const instance = new ErrorBoundary({ children: null, onReset: faultyResetMock });

    (instance as any).updater = {
      isMounted: () => true,
      enqueueSetState: (inst: any, partialState: any) => {
        const update = typeof partialState === 'function' ? partialState(inst.state, inst.props) : partialState;
        Object.assign(inst.state, update);
      },
    };

    instance.state = {
      hasError: true,
      error: new Error('Initial crash'),
      errorInfo: null,
      showDetails: false,
      copied: false,
      exportingBackup: false,
      exportSuccess: false,
    };

    // Should not throw even if onReset throws
    expect(() => instance.handleReset()).not.toThrow();
    expect(instance.state.hasError).toBe(false);
  });

  it('provides scope identifier for targeted diagnostics', () => {
    const globalBoundary = new ErrorBoundary({ children: null, scope: 'Global Root Entry' });
    expect(globalBoundary.props.scope).toBe('Global Root Entry');

    const viewBoundary = new ErrorBoundary({ children: null, scope: 'Active View' });
    expect(viewBoundary.props.scope).toBe('Active View');
  });
});
