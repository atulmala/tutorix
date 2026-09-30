import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { EmailProvider, SendEmailInput, SendEmailResult } from '../email.types';

export class SesEmailProvider implements EmailProvider {
  constructor(
    private readonly client: SESv2Client,
    private readonly fromAddress: string,
  ) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const tags = input.tags
      ? Object.entries(input.tags).map(([Name, Value]) => ({ Name, Value }))
      : undefined;

    const response = await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.fromAddress,
        Destination: {
          ToAddresses: [input.to],
        },
        Content: {
          Simple: {
            Subject: { Data: input.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: input.text, Charset: 'UTF-8' },
              Html: { Data: input.html, Charset: 'UTF-8' },
            },
            Attachments: input.attachments?.map((file) => ({
              FileName: file.filename,
              RawContent: file.content,
              ContentType: file.contentType,
              ContentDisposition: 'ATTACHMENT' as const,
              ContentTransferEncoding: 'BASE64' as const,
            })),
          },
        },
        EmailTags: tags,
      }),
    );

    return { messageId: response.MessageId ?? null };
  }
}
