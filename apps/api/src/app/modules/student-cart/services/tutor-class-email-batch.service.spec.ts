import { CommunicationAudience } from '../../communication/enums/communication-audience.enum';
import { CommunicationChannel } from '../../communication/enums/communication-channel.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { TutorClassEmailQueueEntity } from '../entities/tutor-class-email-queue.entity';
import { TutorClassEmailBatchService } from './tutor-class-email-batch.service';

describe('TutorClassEmailBatchService', () => {
  const rows: TutorClassEmailQueueEntity[] = [];
  let nextId = 1;
  let emit: jest.Mock;
  let service: TutorClassEmailBatchService;

  beforeEach(() => {
    rows.length = 0;
    nextId = 1;
    emit = jest.fn().mockResolvedValue(undefined);
    const repo = {
      findOne: jest.fn(async ({ where }: { where: { sourceKey?: string; sentAt?: unknown; deleted?: boolean } }) => {
        return (
          rows.find((row) => {
            if (row.deleted) return false;
            if (where.sourceKey && row.sourceKey !== where.sourceKey) return false;
            if (where.sentAt != null && row.sentAt != null) return false;
            if (Object.prototype.hasOwnProperty.call(where, 'sentAt') && row.sentAt != null) {
              return false;
            }
            return true;
          }) ?? null
        );
      }),
      find: jest.fn(async () => rows.filter((row) => !row.deleted && row.sentAt == null)),
      create: jest.fn((value: Partial<TutorClassEmailQueueEntity>) => value),
      save: jest.fn(async (value: TutorClassEmailQueueEntity | TutorClassEmailQueueEntity[]) => {
        const list = Array.isArray(value) ? value : [value];
        for (const row of list) {
          if (!row.id) {
            row.id = nextId++;
            row.deleted = false;
            row.createdDate = new Date();
            rows.push(row);
          }
        }
        return Array.isArray(value) ? list : list[0];
      }),
    };
    service = new TutorClassEmailBatchService(repo as never, { emit } as never);
  });

  it('sends one booking email and one scheduling email per tutor', async () => {
    await service.enqueueBookings([
      {
        tutorUserId: 4,
        tutorName: 'Priya Sharma',
        studentName: 'Ada Lovelace',
        offeringLabel: 'Mathematics',
        deliveryMode: 'offline',
        classCount: 4,
        amountInr: 2000,
        sourceKey: 'booking:40:0',
      },
      {
        tutorUserId: 4,
        tutorName: 'Priya Sharma',
        studentName: 'Ruchi Sharma',
        offeringLabel: 'Economics',
        deliveryMode: 'online',
        classCount: 2,
        amountInr: 800,
        sourceKey: 'booking:41:0',
      },
      {
        tutorUserId: 4,
        tutorName: 'Priya Sharma',
        studentName: 'Ada Lovelace',
        offeringLabel: 'Mathematics',
        deliveryMode: 'online',
        classCount: 1,
        amountInr: 0,
        isDemo: true,
        sourceKey: 'booking:42:0',
      },
    ]);
    await service.enqueueSchedule({
      tutorUserId: 4,
      tutorName: 'Priya Sharma',
      studentName: 'Ada Lovelace',
      offeringLabel: 'Mathematics',
      deliveryMode: 'offline',
      startsAt: new Date('2026-10-02T12:30:00.000Z'),
      durationMinutes: 60,
      enrollmentId: 70,
    });

    await service.sendHourlyBatch();

    expect(emit).toHaveBeenCalledTimes(2);
    const booking = emit.mock.calls.find(
      (call) => call[0].event === CommunicationEvent.CLASS_BOOKED,
    )?.[0];
    const scheduling = emit.mock.calls.find(
      (call) => call[0].event === CommunicationEvent.CLASS_SCHEDULED,
    )?.[0];
    expect(booking).toMatchObject({
      userId: 4,
      audience: CommunicationAudience.TUTOR,
      onlyChannels: [CommunicationChannel.EMAIL],
    });
    expect(booking.payload.linesHtml).toContain('Mathematics');
    expect(booking.payload.linesHtml).toContain('Ada Lovelace');
    expect(booking.payload.linesHtml).toContain('Economics');
    expect(booking.payload.linesHtml).toContain('Ruchi Sharma');
    expect(booking.payload.linesHtml).toContain('Offline');
    expect(booking.payload.linesHtml).toContain('Online');
    expect(booking.payload.linesText).toContain('Total');
    expect(booking.payload.linesHtml).toContain('₹0 (free demo)');
    expect(booking.payload.amountPaid).toBe('₹2,800');
    expect(scheduling).toMatchObject({
      userId: 4,
      audience: CommunicationAudience.TUTOR,
      onlyChannels: [CommunicationChannel.EMAIL],
    });
    expect(scheduling.payload.linesHtml).toContain('Ada Lovelace');
    expect(scheduling.payload.linesHtml).toContain('Mathematics');
    expect(scheduling.payload.linesHtml).toContain('Offline');
    expect(scheduling.payload.linesText).toContain('6:00 PM');
    expect(rows.every((row) => row.sentAt != null)).toBe(true);

    emit.mockClear();
    await service.sendHourlyBatch();
    expect(emit).not.toHaveBeenCalled();
  });
});
