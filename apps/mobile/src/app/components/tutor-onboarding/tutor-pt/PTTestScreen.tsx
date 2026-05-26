import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { stripHtml } from './stripHtml';

type Answer = { id: number; text: string; answer?: boolean };
type Question = {
  id: number;
  question: string;
  questionType: string;
  difficulty: number;
  answers: Answer[];
};

type PTTestScreenProps = {
  questions: Question[];
  timeMinutes?: number;
  onFinish: (
    answers: { questionId: number; answerId: number }[],
    timeTakenSeconds: number
  ) => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const DEFAULT_TIME_MINUTES = 30;

export const PTTestScreen: React.FC<PTTestScreenProps> = ({
  questions,
  timeMinutes = DEFAULT_TIME_MINUTES,
  onFinish,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(
    {}
  );
  const durationSec = (timeMinutes || DEFAULT_TIME_MINUTES) * 60;
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  const currentQuestion = questions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;

  const submitTest = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const answers = Object.entries(selectedAnswers).map(([qId, aId]) => ({
      questionId: parseInt(qId, 10),
      answerId: aId,
    }));
    const timeTakenSeconds = Math.round(
      (Date.now() - startTimeRef.current) / 1000
    );
    onFinish(answers, timeTakenSeconds);
  }, [selectedAnswers, onFinish, isSubmitting]);

  useEffect(() => {
    if (timeLeft <= 0) {
      submitTest();
      return;
    }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, submitTest]);

  const handleSelectAnswer = (answerId: number) => {
    if (!currentQuestion) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answerId,
    }));
  };

  const handleNext = () => {
    if (isLast) {
      submitTest();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentIndex((i) => i - 1);
    }
  };

  if (!currentQuestion) {
    return (
      <View style={styles.block}>
        <Text style={styles.mutedText}>No questions available.</Text>
      </View>
    );
  }

  const selectedId = selectedAnswers[currentQuestion.id];
  const canProceed = selectedId != null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.block}>
      {/* Timer */}
      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>Time remaining</Text>
        <Text
          style={[
            styles.timerValue,
            timeLeft <= 300 && styles.timerValueDanger,
          ]}
        >
          {formatTime(timeLeft)}
        </Text>
      </View>

      {/* Question progress */}
      <Text style={styles.progressText}>
        Question {currentIndex + 1} of {questions.length}
      </Text>

      {/* Question */}
      <View style={styles.questionBlock}>
        <Text style={styles.questionText}>
          {stripHtml(currentQuestion.question)}
        </Text>
        <View style={styles.answersBlock}>
          {currentQuestion.answers?.map((a) => (
            <Pressable
              key={a.id}
              style={[
                styles.answerOption,
                a.answer && styles.answerOptionCorrect,
                selectedId === a.id && styles.answerOptionSelected,
              ]}
              onPress={() => handleSelectAnswer(a.id)}
            >
              <View
                style={[
                  styles.radioOuter,
                  selectedId === a.id && styles.radioOuterSelected,
                ]}
              >
                {selectedId === a.id && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.answerText}>{stripHtml(a.text)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.buttonRow}>
        {!isFirst && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Previous</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, (!canProceed || isSubmitting) && styles.primaryButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed || isSubmitting}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting
              ? 'Submitting...'
              : isLast
                ? 'Finish'
                : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  block: {
    gap: 24,
    paddingBottom: 32,
  },
  mutedText: {
    fontSize: 14,
    color: '#64748b',
  },
  timerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timerLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  timerValueDanger: {
    color: '#dc2626',
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
  },
  questionBlock: {
    gap: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  answersBlock: {
    gap: 8,
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  answerOptionSelected: {
    borderColor: '#5fa8ff',
    backgroundColor: 'rgba(95, 168, 255, 0.05)',
  },
  answerOptionCorrect: {
    borderColor: '#34d399',
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#5fa8ff',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5fa8ff',
  },
  answerText: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
