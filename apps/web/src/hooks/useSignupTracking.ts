/**
 * Signup Journey Tracking Hook
 * 
 * Tracks user signup journey events, time spent, and abandonment
 */

import { useEffect, useRef, useCallback } from 'react';
import { AnalyticsEvent } from '@tutorix/analytics';
import { trackEvent } from '../lib/analytics';

const STORAGE_KEY_SIGNUP_START = 'signup_start_time';
const STORAGE_KEY_SIGNUP_USER_ID = 'signup_user_id';
const STORAGE_KEY_SIGNUP_STEP = 'signup_current_step';
const STORAGE_KEY_STEP_START = 'signup_step_start_time';

type SignupStep = 'basic' | 'phone' | 'email' | 'completed';

interface StepTimeData {
  step: SignupStep;
  startTime: number;
  duration?: number;
}

export function useSignupTracking() {
  const stepStartTimeRef = useRef<number | null>(null);
  const totalStartTimeRef = useRef<number | null>(null);
  const currentStepRef = useRef<SignupStep>('basic');
  const userIdRef = useRef<number | null>(null);
  const isAbandonedRef = useRef(false);

  /**
   * Get time elapsed in seconds
   */
  const getTimeElapsed = (startTime: number): number => {
    return Math.round((Date.now() - startTime) / 1000);
  };

  /**
   * Save signup state to sessionStorage (survives page refresh but not tab close)
   */
  const saveState = useCallback((step: SignupStep, userId?: number) => {
    try {
      if (totalStartTimeRef.current) {
        sessionStorage.setItem(STORAGE_KEY_SIGNUP_START, totalStartTimeRef.current.toString());
      }
      if (userId) {
        sessionStorage.setItem(STORAGE_KEY_SIGNUP_USER_ID, userId.toString());
        userIdRef.current = userId;
      }
      sessionStorage.setItem(STORAGE_KEY_SIGNUP_STEP, step);
      if (stepStartTimeRef.current) {
        sessionStorage.setItem(STORAGE_KEY_STEP_START, stepStartTimeRef.current.toString());
      }
    } catch (error) {
      console.warn('Failed to save signup state:', error);
    }
  }, []);

  /**
   * Load signup state from sessionStorage
   */
  const loadState = useCallback((): { step: SignupStep; userId: number | null; startTime: number | null } | null => {
    try {
      const startTimeStr = sessionStorage.getItem(STORAGE_KEY_SIGNUP_START);
      const userIdStr = sessionStorage.getItem(STORAGE_KEY_SIGNUP_USER_ID);
      const stepStr = sessionStorage.getItem(STORAGE_KEY_SIGNUP_STEP);

      if (startTimeStr && stepStr && stepStr !== 'completed') {
        const startTime = parseInt(startTimeStr, 10);
        const userId = userIdStr ? parseInt(userIdStr, 10) : null;
        const step = stepStr as SignupStep;
        
        return { step, userId, startTime };
      }
    } catch (error) {
      console.warn('Failed to load signup state:', error);
    }
    return null;
  }, []);

  /**
   * Clear signup state
   */
  const clearState = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_SIGNUP_START);
      sessionStorage.removeItem(STORAGE_KEY_SIGNUP_USER_ID);
      sessionStorage.removeItem(STORAGE_KEY_SIGNUP_STEP);
      sessionStorage.removeItem(STORAGE_KEY_STEP_START);
      totalStartTimeRef.current = null;
      stepStartTimeRef.current = null;
      userIdRef.current = null;
      currentStepRef.current = 'basic';
    } catch (error) {
      console.warn('Failed to clear signup state:', error);
    }
  }, []);

  /**
   * Start signup tracking
   */
  const startSignup = useCallback((userId?: number) => {
    const savedState = loadState();
    
    if (savedState && !isAbandonedRef.current) {
      // Resume existing signup
      totalStartTimeRef.current = savedState.startTime;
      userIdRef.current = savedState.userId || userId || null;
      currentStepRef.current = savedState.step;
      
      trackEvent(AnalyticsEvent.SIGNUP_RESUMED, {
        step: savedState.step,
        user_id: userIdRef.current,
        time_elapsed_seconds: getTimeElapsed(savedState.startTime!),
      });
    } else {
      // New signup
      totalStartTimeRef.current = Date.now();
      userIdRef.current = userId || null;
      currentStepRef.current = 'basic';
      
      trackEvent(AnalyticsEvent.SIGNUP_STARTED, {
        user_id: userIdRef.current,
      });
    }
    
    stepStartTimeRef.current = Date.now();
    saveState(currentStepRef.current, userIdRef.current || undefined);
  }, [loadState, saveState]);

  /**
   * Track step completion
   */
  const trackStepComplete = useCallback((step: SignupStep, userId?: number) => {
    if (!stepStartTimeRef.current) {
      stepStartTimeRef.current = Date.now();
    }

    const stepDuration = getTimeElapsed(stepStartTimeRef.current);
    const totalElapsed = totalStartTimeRef.current ? getTimeElapsed(totalStartTimeRef.current) : stepDuration;

    let event: AnalyticsEvent;
    switch (step) {
      case 'basic':
        event = AnalyticsEvent.SIGNUP_BASIC_DETAILS_SUBMITTED;
        break;
      case 'phone':
        event = AnalyticsEvent.SIGNUP_PHONE_VERIFICATION_COMPLETED;
        break;
      case 'email':
        event = AnalyticsEvent.SIGNUP_EMAIL_VERIFICATION_COMPLETED;
        break;
      default:
        return;
    }

    trackEvent(event, {
      user_id: userId || userIdRef.current,
      step_duration_seconds: stepDuration,
      total_time_elapsed_seconds: totalElapsed,
    });

    // Update current step
    currentStepRef.current = step;
    stepStartTimeRef.current = Date.now();
    saveState(step, userId);
  }, [saveState]);

  /**
   * Track step start
   */
  const trackStepStart = useCallback((step: SignupStep) => {
    stepStartTimeRef.current = Date.now();
    currentStepRef.current = step;
    saveState(step);

    let event: AnalyticsEvent;
    switch (step) {
      case 'phone':
        event = AnalyticsEvent.SIGNUP_PHONE_VERIFICATION_STARTED;
        break;
      case 'email':
        event = AnalyticsEvent.SIGNUP_EMAIL_VERIFICATION_STARTED;
        break;
      default:
        return;
    }

    trackEvent(event, {
      user_id: userIdRef.current,
      step_duration_seconds: stepStartTimeRef.current ? getTimeElapsed(stepStartTimeRef.current) : 0,
    });
  }, [saveState]);

  /**
   * Track signup completion
   */
  const trackSignupCompleted = useCallback((userId?: number) => {
    if (!stepStartTimeRef.current || !totalStartTimeRef.current) {
      return;
    }

    const stepDuration = getTimeElapsed(stepStartTimeRef.current);
    const totalDuration = getTimeElapsed(totalStartTimeRef.current);

    trackEvent(AnalyticsEvent.SIGNUP_EMAIL_VERIFICATION_COMPLETED, {
      user_id: userId || userIdRef.current,
      step_duration_seconds: stepDuration,
    });

    trackEvent(AnalyticsEvent.SIGNUP_COMPLETED, {
      user_id: userId || userIdRef.current,
      total_time_seconds: totalDuration,
      step_duration_seconds: stepDuration,
    });

    // Clear state after completion
    clearState();
  }, [clearState]);

  /**
   * Track abandonment
   */
  const trackAbandonment = useCallback((reason: 'tab_close' | 'navigation' | 'timeout' = 'navigation') => {
    if (isAbandonedRef.current || !totalStartTimeRef.current) {
      return;
    }

    isAbandonedRef.current = true;
    const totalDuration = getTimeElapsed(totalStartTimeRef.current);
    const stepDuration = stepStartTimeRef.current ? getTimeElapsed(stepStartTimeRef.current) : 0;

    trackEvent(AnalyticsEvent.SIGNUP_ABANDONED, {
      user_id: userIdRef.current,
      step: currentStepRef.current,
      reason,
      total_time_elapsed_seconds: totalDuration,
      step_duration_seconds: stepDuration,
    });

    // Keep state in sessionStorage for potential resume tracking
    // Don't clear it here so we can detect resumes
  }, []);

  /**
   * Setup abandonment detection
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (totalStartTimeRef.current && !isAbandonedRef.current) {
        // Try to send abandonment event using sendBeacon (fires before page unloads)
        trackAbandonment('tab_close');
        
        // Also try to save state before leaving
        try {
          const abandonmentData = {
            step: currentStepRef.current,
            userId: userIdRef.current,
            timestamp: Date.now(),
            totalDuration: totalStartTimeRef.current ? getTimeElapsed(totalStartTimeRef.current) : 0,
          };
          // Store in sessionStorage as backup
          sessionStorage.setItem('signup_abandonment', JSON.stringify(abandonmentData));
        } catch (error) {
          console.warn('Failed to save abandonment data:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && totalStartTimeRef.current && !isAbandonedRef.current) {
        // Tab/window became hidden - user might be abandoning
        // We'll track this as abandonment after a delay if they don't return
        const timeout = setTimeout(() => {
          if (document.hidden && totalStartTimeRef.current && !isAbandonedRef.current) {
            trackAbandonment('tab_close');
          }
        }, 30000); // 30 seconds

        // Clear timeout if user returns
        const handleVisibilityReturn = () => {
          clearTimeout(timeout);
          document.removeEventListener('visibilitychange', handleVisibilityReturn);
        };
        document.addEventListener('visibilitychange', handleVisibilityReturn, { once: true });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check for abandonment data from previous session
    try {
      const abandonmentDataStr = sessionStorage.getItem('signup_abandonment');
      if (abandonmentDataStr) {
        const abandonmentData = JSON.parse(abandonmentDataStr);
        // Track that they abandoned previously
        trackEvent(AnalyticsEvent.SIGNUP_ABANDONED, {
          user_id: abandonmentData.userId,
          step: abandonmentData.step,
          reason: 'tab_close',
          total_time_elapsed_seconds: abandonmentData.totalDuration,
          timestamp: abandonmentData.timestamp,
        });
        sessionStorage.removeItem('signup_abandonment');
      }
    } catch (error) {
      console.warn('Failed to load abandonment data:', error);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [trackAbandonment]);

  return {
    startSignup,
    trackStepStart,
    trackStepComplete,
    trackSignupCompleted,
    trackAbandonment,
    clearState,
    loadState,
  };
}
