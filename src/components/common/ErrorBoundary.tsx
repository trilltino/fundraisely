/**
 * ERRORBOUNDARY.TSX - React Error Boundary Component
 *
 * This is a React class component that implements the Error Boundary pattern to catch JavaScript
 * errors anywhere in the child component tree, log those errors, and display a fallback UI instead
 * of crashing the entire application. It serves as the last line of defense against unhandled
 * exceptions in the React component tree.
 *
 * ROLE IN THE APPLICATION:
 * - Wraps the entire application in App.tsx to catch all runtime errors
 * - Prevents the white screen of death when components throw errors
 * - Provides user-friendly error messaging instead of technical stack traces
 * - Offers a recovery mechanism (page refresh) for users
 * - Logs errors to console for debugging and monitoring
 * - Essential for production resilience and user experience
 *
 * ERROR BOUNDARY PATTERN:
 * React Error Boundaries catch errors during:
 * - Rendering phase (component lifecycle methods)
 * - Constructor execution
 * - getDerivedStateFromError and componentDidCatch lifecycle methods
 *
 * Error Boundaries do NOT catch errors in:
 * - Event handlers (use try-catch instead)
 * - Asynchronous code (setTimeout, promises)
 * - Server-side rendering
 * - Errors thrown in the error boundary itself
 *
 * LIFECYCLE METHODS USED:
 * 1. static getDerivedStateFromError(error):
 *    - Called during render phase when an error is thrown
 *    - Returns new state to trigger fallback UI
 *    - Must be static and pure (no side effects)
 *    - Updates hasError flag and stores error message
 *
 * 2. componentDidCatch(error, errorInfo):
 *    - Called during commit phase after an error is thrown
 *    - Can perform side effects (logging, analytics)
 *    - Receives error object and React error info with component stack
 *    - Logs to console for debugging
 *
 * STATE MANAGEMENT:
 * - hasError: Boolean flag indicating if an error was caught
 * - errorMessage: Human-readable error message from Error object
 * - State persists until component unmounts or page refreshes
 * - State update triggers re-render with fallback UI
 *
 * FALLBACK UI:
 * When an error is caught, displays:
 * - Red-themed alert box with rounded corners
 * - "Something went wrong" heading
 * - Error message text (from error.message)
 * - "Refresh Page" button to recover
 * - Centered layout with max-width for readability
 *
 * USER RECOVERY:
 * - Refresh button triggers window.location.reload()
 * - Full page reload clears error state and React component tree
 * - User returns to last known good state (likely landing page)
 * - Simple but effective recovery mechanism
 *
 * INTEGRATION:
 * - Imported and used in App.tsx as top-level wrapper
 * - Wraps all routes and main application content
 * - Children prop receives entire app component tree
 * - Single error boundary covers whole application
 *
 * STYLING:
 * - Tailwind CSS utility classes for consistent design
 * - Red color scheme (bg-red-100, text-red-700) for error emphasis
 * - Responsive padding and margins
 * - Shadow and rounded corners for elevated card appearance
 * - Hover effect on refresh button
 *
 * PRODUCTION CONSIDERATIONS:
 * - In production, consider sending errors to monitoring service (Sentry, LogRocket)
 * - Could display different messages based on error type
 * - Could provide "Report Issue" functionality
 * - Could implement retry logic for transient errors
 * - Could show more helpful recovery suggestions based on context
 *
 * LIMITATIONS:
 * - Only catches errors in React component tree
 * - Does not catch errors in event handlers or async code
 * - Cannot recover from errors in the error boundary itself
 * - Page refresh loses any unsaved state
 *
 * DEPENDENCIES:
 * - React Component class for error boundary pattern
 * - React ErrorInfo type for component stack information
 *
 * FUTURE ENHANCEMENTS:
 * - Integrate with error monitoring service (Sentry)
 * - Add error categorization (network, syntax, runtime)
 * - Provide context-specific recovery suggestions
 * - Add "Copy Error" button for user bug reports
 * - Store error details in localStorage for support tickets
 * - Implement automatic retry for recoverable errors
 */

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg max-w-2xl mx-auto mt-4">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p>{this.state.errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;