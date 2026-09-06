import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { recordError, setAttribute } from '../../lib/crashlytics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

function isDevRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/**
 * Catches React render errors. Dev builds show the stack; store builds
 * show a short recovery message and send the error to Crashlytics.
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
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isDevRuntime()) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Error info:', errorInfo);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    this.setState({
      error,
      errorInfo,
    });

    if (errorInfo.componentStack) {
      setAttribute('component_stack', errorInfo.componentStack.slice(0, 1000));
    }
    recordError(error, 'ReactErrorBoundary');
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (!isDevRuntime()) {
      return (
        <View style={[styles.container, styles.productionContainer]}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            Please close and reopen the app. If this keeps happening, contact
            info@tutorix.tech.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>App Error</Text>
          <Text style={styles.subtitle}>
            Something went wrong. Check the error details below:
          </Text>

          {this.state.error && (
            <View style={styles.errorSection}>
              <Text style={styles.sectionTitle}>Error Message:</Text>
              <Text style={styles.errorMessage}>
                {this.state.error.message || this.state.error.toString()}
              </Text>
              {this.state.error.name ? (
                <Text style={styles.errorName}>
                  Error Type: {this.state.error.name}
                </Text>
              ) : null}
            </View>
          )}

          {this.state.errorInfo ? (
            <View style={styles.errorSection}>
              <Text style={styles.sectionTitle}>Component Stack:</Text>
              <Text style={styles.errorText}>
                {this.state.errorInfo.componentStack}
              </Text>
            </View>
          ) : null}

          {this.state.error?.stack ? (
            <View style={styles.errorSection}>
              <Text style={styles.sectionTitle}>Stack Trace:</Text>
              <Text style={styles.errorText}>{this.state.error.stack}</Text>
            </View>
          ) : null}

          <Text style={styles.hint}>
            Check Metro bundler logs and Android logcat for more details
          </Text>
          <Text style={styles.hint}>
            Run: adb logcat | grep -i "ReactNative|JS|Error"
          </Text>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  productionContainer: {
    justifyContent: 'center',
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
