import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  HardDriveDownload,
  FileCode,
} from 'lucide-react';
import { exportAllData } from '../../lib/db';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetError: () => void }) => ReactNode);
  onReset?: () => void;
  scope?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
  exportingBackup: boolean;
  exportSuccess: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
      exportingBackup: false,
      exportSuccess: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Safe console logging for diagnostic verification
    console.error('[@MyAIMentor ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReset = (): void => {
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.error('Error during ErrorBoundary onReset callback:', e);
      }
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
      exportingBackup: false,
      exportSuccess: false,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleCopyDetails = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const diagnosticReport = [
      '========================================',
      'MY AI MENTOR - RUNTIME ERROR REPORT',
      '========================================',
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
      `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      `Scope: ${this.props.scope || 'Global App Root'}`,
      '',
      '--- ERROR DETAILS ---',
      `Name: ${error?.name || 'Error'}`,
      `Message: ${error?.message || 'Unknown error'}`,
      '',
      '--- ERROR STACK ---',
      error?.stack || 'No error stack trace available',
      '',
      '--- COMPONENT STACK ---',
      errorInfo?.componentStack || 'No component stack trace available',
      '========================================',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(diagnosticReport);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch {
      // Fallback for environments where clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = diagnosticReport;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      } catch (err) {
        console.error('Failed to copy error report to clipboard', err);
      }
      document.body.removeChild(textarea);
    }
  };

  handleEmergencyBackup = async (): Promise<void> => {
    this.setState({ exportingBackup: true, exportSuccess: false });
    try {
      const dataString = await exportAllData(false);
      const blob = new Blob([dataString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.href = url;
      link.download = `my-ai-mentor-emergency-backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.setState({ exportingBackup: false, exportSuccess: true });
      setTimeout(() => this.setState({ exportSuccess: false }), 4000);
    } catch (err) {
      console.error('Failed to export emergency backup:', err);
      this.setState({ exportingBackup: false });
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showDetails, copied, exportingBackup, exportSuccess } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback support
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback({
          error: error || new Error('Unknown error'),
          resetError: this.handleReset,
        });
      }
      return fallback;
    }

    const errorMessage = error?.message || 'An unexpected runtime error occurred.';
    const errorName = error?.name || 'Application Error';

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6"
      >
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header Banner */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  My AI Mentor
                </span>
                <span className="text-xs text-slate-500">Global Error Recovery</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Something unexpected happened
              </h1>
              <p className="text-sm text-slate-400">
                The application encountered an unhandled exception. Your saved data in local storage
                remains safe and untouched.
              </p>
            </div>
          </div>

          {/* Error Summary Box */}
          <div className="bg-slate-950/80 border border-rose-500/20 rounded-xl p-4 text-sm space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorName}</span>
            </div>
            <p className="font-mono text-xs text-slate-300 break-words leading-relaxed pl-6">
              {errorMessage}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              Reload App
            </button>

            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-xl border border-slate-700 transition active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              Try to Recover
            </button>

            <button
              type="button"
              onClick={this.handleEmergencyBackup}
              disabled={exportingBackup}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-medium text-sm rounded-xl border border-emerald-500/30 transition active:scale-[0.98] disabled:opacity-50"
              title="Download an immediate offline copy of all your local records"
            >
              {exportSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Backup Saved!
                </>
              ) : (
                <>
                  <HardDriveDownload className="w-4 h-4" />
                  {exportingBackup ? 'Exporting...' : 'Emergency Backup'}
                </>
              )}
            </button>
          </div>

          {/* Collapsible Technical Diagnostics */}
          <div className="border-t border-slate-800/80 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Technical diagnostic details</span>
                {showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={this.handleCopyDetails}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Diagnostics</span>
                  </>
                )}
              </button>
            </div>

            {showDetails && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {error?.stack && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Error Stack Trace
                    </span>
                    <pre className="font-mono text-[11px] leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {errorInfo?.componentStack && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Component Hierarchy
                    </span>
                    <pre className="font-mono text-[11px] leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center text-xs text-slate-500">
            Protected by My AI Mentor Global Error Boundary • All local data preserved
          </div>
        </div>
      </div>
    );
  }
}
export default ErrorBoundary;
