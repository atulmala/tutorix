import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { recordError } from '../../lib/crashlytics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors and display them
 * This helps debug black screen issues on Android
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo,
    });

    // Record error to Crashlytics
    try {
      const errorMessage = `ErrorBoundary: ${error.message}\nComponent Stack: ${errorInfo.componentStack}`;
      recordError(error, 'ReactErrorBoundary');
      // Also log the full error details
      recordError(errorMessage, 'ReactErrorBoundaryDetails');
    } catch (crashlyticsError) {
      console.warn('[ErrorBoundary] Failed to record error to Crashlytics:', crashlyticsError);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>⚠️ App Error</Text>
            <Text style={styles.subtitle}>
              Something went wrong. Check the error details below:
            </Text>
            
            {this.state.error && (
              <View style={styles.errorSection}>
                <Text style={styles.sectionTitle}>Error Message:</Text>
                <Text style={styles.errorMessage}>
                  {this.state.error.message || this.state.error.toString()}
                </Text>
                {this.state.error.name && (
                  <Text style={styles.errorName}>
                    Error Type: {this.state.error.name}
                  </Text>
                )}
              </View>
            )}

            {this.state.errorInfo && (
              <View style={styles.errorSection}>
                <Text style={styles.sectionTitle}>Component Stack:</Text>
                <Text style={styles.errorText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              </View>
            )}

            {this.state.error?.stack && (
              <View style={styles.errorSection}>
                <Text style={styles.sectionTitle}>Stack Trace:</Text>
                <Text style={styles.errorText}>
                  {this.state.error.stack}
                </Text>
              </View>
            )}

            <Text style={styles.hint}>
              💡 Check Metro bundler logs and Android logcat for more details
            </Text>
            <Text style={styles.hint}>
              Run: adb logcat | grep -i "ReactNative\|JS\|Error"
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  errorSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    fontFamily: 'monospace',
  },
  errorMessage: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorName: {
    fontSize: 14,
    color: '#f57c00',
    fontWeight: '600',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
});
