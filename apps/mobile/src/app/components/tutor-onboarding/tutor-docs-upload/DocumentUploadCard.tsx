import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { OnboardingDocType, SlotDoc } from './document-upload.types';
import { isImageMime } from './document-upload.utils';

type DocumentUploadCardProps = {
  slot: {
    documentType: OnboardingDocType;
    title: string;
    description: string;
  };
  doc?: SlotDoc;
  localPreviewUri?: string;
  err?: string;
  busy: boolean;
  profileLoading: boolean;
  onPickFile: () => void;
  passed: boolean;
  rejected: boolean;
  humanPending: boolean;
  awaitingBatch: boolean;
};

function DocumentThumbnail({
  previewUrl,
  title,
  showVerifiedStamp,
}: {
  previewUrl?: string;
  title: string;
  showVerifiedStamp?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!previewUrl || failed) {
    return (
      <View style={styles.thumbnailEmpty}>
        <Text style={styles.thumbnailEmptyIcon}>📄</Text>
        <Text style={styles.thumbnailEmptyText}>No file uploaded</Text>
      </View>
    );
  }

  return (
    <View style={styles.thumbnailWrap}>
      <Image
        source={{ uri: previewUrl }}
        style={styles.thumbnailImage}
        resizeMode="contain"
        onError={() => setFailed(true)}
        accessibilityLabel={`${title} preview`}
      />
      {showVerifiedStamp && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedBadgeText}>✓</Text>
        </View>
      )}
    </View>
  );
}

export function DocumentUploadCard({
  slot,
  doc,
  localPreviewUri,
  err,
  busy,
  profileLoading,
  onPickFile,
  passed,
  rejected,
  humanPending,
  awaitingBatch,
}: DocumentUploadCardProps) {
  const hasFile = Boolean(doc?.storageKey);
  const mime = doc?.mimeType ?? '';
  const previewUrl =
    localPreviewUri ??
    (hasFile && doc?.previewUrl && isImageMime(mime) ? doc.previewUrl : undefined);
  const showPdfPlaceholder = hasFile && !previewUrl && !localPreviewUri;
  const replaceDisabled = passed || busy || profileLoading;

  return (
    <View style={styles.card}>
      {showPdfPlaceholder ? (
        <View style={styles.thumbnailEmpty}>
          <Text style={styles.thumbnailEmptyIcon}>📄</Text>
          <Text style={styles.thumbnailEmptyText}>Document uploaded</Text>
        </View>
      ) : (
        <DocumentThumbnail
          previewUrl={previewUrl}
          title={slot.title}
          showVerifiedStamp={passed && hasFile}
        />
      )}

      <Text style={styles.title}>{slot.title}</Text>
      <Text style={styles.description}>{slot.description}</Text>

      {hasFile && (
        <View style={styles.statusBlock}>
          {passed ? (
            <Text style={styles.statusAccepted}>
              Accepted — you can proceed once all documents pass.
            </Text>
          ) : rejected ? (
            <Text style={styles.statusRejected}>
              Not accepted
              {doc?.filename ? (
                <Text style={styles.statusMuted}> ({doc.filename})</Text>
              ) : null}
            </Text>
          ) : humanPending ? (
            <Text style={styles.statusPending}>
              Under admin review — you'll be notified when there's an outcome.
            </Text>
          ) : awaitingBatch ? (
            <Text style={styles.statusPending}>
              Uploaded — verification is queued.
              {doc?.filename ? (
                <Text style={styles.statusMuted}> ({doc.filename})</Text>
              ) : null}
            </Text>
          ) : (
            <Text style={styles.statusPending}>
              Uploaded — pending verification
              {doc?.filename ? (
                <Text style={styles.statusMuted}> ({doc.filename})</Text>
              ) : null}
            </Text>
          )}
          {rejected && doc?.screening?.summaryNotes?.trim() && (
            <Text style={styles.rejectionNote}>{doc.screening.summaryNotes.trim()}</Text>
          )}
        </View>
      )}

      {err ? <Text style={styles.errorText}>{err}</Text> : null}

      <TouchableOpacity
        style={[
          styles.pickButton,
          replaceDisabled && styles.pickButtonDisabled,
        ]}
        onPress={onPickFile}
        disabled={replaceDisabled}
        activeOpacity={0.7}
      >
        {busy ? (
          <ActivityIndicator color="#1e293b" />
        ) : (
          <Text
            style={[
              styles.pickButtonText,
              replaceDisabled && styles.pickButtonTextDisabled,
            ]}
          >
            {passed ? 'Accepted' : hasFile ? 'Replace' : 'Upload'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  thumbnailEmpty: {
    height: 112,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  thumbnailEmptyIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  thumbnailEmptyText: {
    fontSize: 12,
    color: '#64748b',
  },
  thumbnailWrap: {
    height: 112,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginBottom: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 20,
  },
  statusBlock: {
    marginTop: 8,
  },
  statusAccepted: {
    fontSize: 14,
    fontWeight: '500',
    color: '#047857',
  },
  statusRejected: {
    fontSize: 14,
    fontWeight: '500',
    color: '#b91c1c',
  },
  statusPending: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400e',
  },
  statusMuted: {
    fontWeight: '400',
    color: '#64748b',
  },
  rejectionNote: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
    marginTop: 8,
  },
  pickButton: {
    marginTop: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94a3b8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickButtonDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  pickButtonTextDisabled: {
    color: '#94a3b8',
  },
});
