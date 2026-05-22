import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { DocumentScreeningAiService } from './document-screening-ai.service';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import {
  buildDynamicScreeningUserText,
  DOCUMENT_SCREENING_STATIC_SYSTEM,
} from '../document-screening-prompts';

jest.mock('@anthropic-ai/sdk');

describe('DocumentScreeningAiService prompt caching', () => {
  let service: DocumentScreeningAiService;
  let messagesCreate: jest.Mock;

  beforeEach(async () => {
    messagesCreate = jest.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '{"accept":true,"nameMatch":true,"confidence":0.9,"reason":"Valid"}',
        },
      ],
      usage: {
        input_tokens: 1200,
        output_tokens: 40,
        cache_creation_input_tokens: 1100,
        cache_read_input_tokens: 0,
      },
    });

    (Anthropic as unknown as jest.Mock).mockImplementation(() => ({
      messages: { create: messagesCreate },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentScreeningAiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ANTHROPIC_API_KEY') return 'test-key';
              if (key === 'DOCUMENT_SCREENING_PROMPT_CACHING_ENABLED') return 'true';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(DocumentScreeningAiService);
  });

  it('sends cached static system block and dynamic user message with image', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const result = await service.screenDocument(
      DocumentTypeEnum.PAN_CARD,
      'image/png',
      png,
      'Atul Mala',
    );

    expect(messagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: [
          expect.objectContaining({
            type: 'text',
            text: DOCUMENT_SCREENING_STATIC_SYSTEM,
            cache_control: { type: 'ephemeral' },
          }),
        ],
        messages: [
          expect.objectContaining({
            role: 'user',
            content: [
              expect.objectContaining({ type: 'image' }),
              expect.objectContaining({
                type: 'text',
                text: buildDynamicScreeningUserText(
                  DocumentTypeEnum.PAN_CARD,
                  'Atul Mala',
                ),
              }),
            ],
          }),
        ],
      }),
    );

    expect(result.usage).toEqual({
      inputTokens: 1200,
      outputTokens: 40,
      cacheCreationInputTokens: 1100,
      cacheReadInputTokens: 0,
    });
  });

  it('omits cache_control when prompt caching is disabled', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentScreeningAiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ANTHROPIC_API_KEY') return 'test-key';
              if (key === 'DOCUMENT_SCREENING_PROMPT_CACHING_ENABLED') return 'false';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const disabledService = module.get(DocumentScreeningAiService);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    await disabledService.screenDocument(
      DocumentTypeEnum.PAN_CARD,
      'image/png',
      png,
      'Atul Mala',
    );

    const call = messagesCreate.mock.calls.at(-1)?.[0];
    expect(call.system[0].cache_control).toBeUndefined();
  });
});
