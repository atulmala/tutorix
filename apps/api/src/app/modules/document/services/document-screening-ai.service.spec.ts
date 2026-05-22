import {
  mapAiResultToScreeningStatus,
  parseAiResponseText,
} from './document-screening-ai.service';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';

describe('DocumentScreeningAiService helpers', () => {
  const threshold = 0.85;

  describe('parseAiResponseText', () => {
    it('parses valid JSON from model output', () => {
      const raw =
        'Here is the result: {"accept":true,"nameMatch":true,"confidence":0.92,"reason":"Looks valid"}';
      expect(parseAiResponseText(raw)).toEqual({
        accept: true,
        nameMatch: true,
        confidence: 0.92,
        reason: 'Looks valid',
      });
    });

    it('returns null for invalid JSON', () => {
      expect(parseAiResponseText('not json')).toBeNull();
    });

    it('clamps confidence to 0-1', () => {
      const raw = '{"accept":true,"nameMatch":true,"confidence":1.5,"reason":"x"}';
      expect(parseAiResponseText(raw)?.confidence).toBe(1);
    });
  });

  describe('mapAiResultToScreeningStatus', () => {
    it('passes Aadhaar when accept and nameMatch are true', () => {
      const result = mapAiResultToScreeningStatus(
        DocumentTypeEnum.AADHAAR_CARD,
        {
          accept: true,
          nameMatch: true,
          confidence: 0.9,
          reason: 'Valid Aadhaar front',
        },
        threshold,
      );
      expect(result.status).toBe(DocumentScreeningStatusEnum.PASSED_AUTOMATED);
    });

    it('queues PAN for human when name does not match', () => {
      const result = mapAiResultToScreeningStatus(
        DocumentTypeEnum.PAN_CARD,
        {
          accept: true,
          nameMatch: false,
          confidence: 0.9,
          reason: 'Name mismatch',
        },
        threshold,
      );
      expect(result.status).toBe(DocumentScreeningStatusEnum.PENDING_HUMAN);
    });

    it('passes education doc when confidence meets threshold', () => {
      const result = mapAiResultToScreeningStatus(
        DocumentTypeEnum.CLASS_XII_MARKSHEET,
        {
          accept: true,
          nameMatch: true,
          confidence: 0.9,
          reason: 'Official marksheet',
        },
        threshold,
      );
      expect(result.status).toBe(DocumentScreeningStatusEnum.PASSED_AUTOMATED);
    });

    it('queues education doc for human when confidence is below threshold', () => {
      const result = mapAiResultToScreeningStatus(
        DocumentTypeEnum.HIGHEST_DEGREE_CERTIFICATE,
        {
          accept: true,
          nameMatch: true,
          confidence: 0.7,
          reason: 'Possibly valid',
        },
        threshold,
      );
      expect(result.status).toBe(DocumentScreeningStatusEnum.PENDING_HUMAN);
    });

    it('queues ID doc for human on parse failure', () => {
      const result = mapAiResultToScreeningStatus(
        DocumentTypeEnum.PAN_CARD,
        null,
        threshold,
      );
      expect(result.status).toBe(DocumentScreeningStatusEnum.PENDING_HUMAN);
    });

    it('queues education doc for human on parse failure', () => {
      const result = mapAiResultToScreeningStatus(
        DocumentTypeEnum.CLASS_XII_MARKSHEET,
        null,
        threshold,
      );
      expect(result.status).toBe(DocumentScreeningStatusEnum.PENDING_HUMAN);
    });
  });
});
