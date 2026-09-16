import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type LocalityValueInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  editable?: boolean;
  error?: boolean;
  trailing?: React.ReactNode;
  /** Show a start-aligned, horizontally scrollable preview of a selected locality. */
  preview?: boolean;
};

export const LocalityValueInput: React.FC<LocalityValueInputProps> = ({
  value,
  onChangeText,
  onFocus,
  placeholder,
  editable = true,
  error,
  trailing,
  preview = false,
}) => {
  const [editing, setEditing] = useState(!preview);

  useEffect(() => {
    if (preview) {
      setEditing(false);
    }
  }, [preview, value]);

  const showPreview = preview && !editing && value.length > 0;

  return (
    <View style={[styles.wrap, error && styles.wrapError]}>
      {showPreview ? (
        <ScrollView
          key={value}
          horizontal
          nestedScrollEnabled
          bounces
          showsHorizontalScrollIndicator
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.previewContent}
        >
          <Pressable
            onPress={() => {
              if (!editable) return;
              setEditing(true);
              onFocus?.();
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit locality"
          >
            <Text style={styles.previewText}>{value}</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setEditing(true);
            onFocus?.();
          }}
          onBlur={() => {
            if (preview) setEditing(false);
          }}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          editable={editable}
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus={editing && preview}
        />
      )}
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  wrapError: {
    borderColor: '#dc2626',
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#143055',
  },
  previewContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 44,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#143055',
    flexShrink: 0,
  },
  trailing: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
