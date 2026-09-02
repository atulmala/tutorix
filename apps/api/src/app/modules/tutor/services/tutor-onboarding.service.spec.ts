import { BadRequestException, Logger } from '@nestjs/common';
import { TutorCertificationStageEnum } from '../enums/tutor.enums';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { TutorOnboardingService } from './tutor-onboarding.service';

describe('TutorOnboardingService', () => {
  const tutor = {
    id: 4,
    userId: 11,
    certificationStage: TutorCertificationStageEnum.interview,
    onBoardingComplete: false,
  };

  function createService(overrides?: {
    alreadyComplete?: boolean;
    stage?: TutorCertificationStageEnum;
    docsPassed?: boolean;
    emitError?: Error;
  }) {
    const emit = jest.fn().mockImplementation(() => {
      if (overrides?.emitError) {
        return Promise.reject(overrides.emitError);
      }
      return Promise.resolve(undefined);
    });
    const updateCertificationStage = jest.fn().mockResolvedValue({
      ...tutor,
      certificationStage: TutorCertificationStageEnum.interview,
    });
    const updatedTutor = {
      ...tutor,
      certificationStage: TutorCertificationStageEnum.complete,
      onBoardingComplete: true,
    };
    const updateOnboardingStatus = jest.fn().mockResolvedValue(updatedTutor);
    const ensureWalletForUser = jest.fn().mockResolvedValue(undefined);
    const evaluateTutorOnboardingDocuments = jest.fn().mockResolvedValue({
      passed: overrides?.docsPassed ?? true,
    });
    const userFindOne = jest
      .fn()
      .mockResolvedValue({ id: tutor.userId, firstName: 'Ada' });

    const service = new TutorOnboardingService(
      {
        updateCertificationStage,
        updateOnboardingStatus,
      } as never,
      { evaluateTutorOnboardingDocuments } as never,
      { ensureWalletForUser } as never,
      { emit } as never,
      { findOne: userFindOne } as never,
    );

    return {
      service,
      emit,
      updateCertificationStage,
      updateOnboardingStatus,
      ensureWalletForUser,
      evaluateTutorOnboardingDocuments,
      tutorInput: {
        ...tutor,
        certificationStage:
          overrides?.stage ?? TutorCertificationStageEnum.interview,
        onBoardingComplete: overrides?.alreadyComplete ?? false,
      },
    };
  }

  it('emits TUTOR_ONBOARDING_APPROVED on first approval', async () => {
    const {
      service,
      emit,
      tutorInput,
      updateCertificationStage,
      ensureWalletForUser,
    } = createService();

    await service.approveTutorOnboarding(tutorInput as never);

    expect(updateCertificationStage).toHaveBeenCalledWith(
      tutor.id,
      TutorCertificationStageEnum.complete,
    );
    expect(ensureWalletForUser).toHaveBeenCalledWith(tutor.userId);
    expect(emit).toHaveBeenCalledWith({
      event: CommunicationEvent.TUTOR_ONBOARDING_APPROVED,
      userId: tutor.userId,
      entityType: 'tutor-onboarding-approved',
      entityId: String(tutor.id),
      payload: { firstName: 'Ada' },
    });
  });

  it('does not emit when onboarding is already complete', async () => {
    const { service, emit, tutorInput, updateCertificationStage } =
      createService({ alreadyComplete: true });

    const result = await service.approveTutorOnboarding(tutorInput as never);

    expect(result).toBe(tutorInput);
    expect(updateCertificationStage).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('does not emit when the tutor is not in interview stage', async () => {
    const { service, emit } = createService({
      stage: TutorCertificationStageEnum.docs,
    });

    await expect(
      service.approveTutorOnboarding({
        ...tutor,
        certificationStage: TutorCertificationStageEnum.docs,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(emit).not.toHaveBeenCalled();
  });

  it('still completes approval if communication emit fails', async () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { service, tutorInput, updateOnboardingStatus } = createService({
      emitError: new Error('smtp down'),
    });

    try {
      const result = await service.approveTutorOnboarding(tutorInput as never);
      expect(updateOnboardingStatus).toHaveBeenCalled();
      expect(result.onBoardingComplete).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('emits TUTOR_APPLICATION_REVIEW when documents step completes', async () => {
    const { service, emit, updateCertificationStage } = createService({
      stage: TutorCertificationStageEnum.docs,
    });

    await service.completeDocsStep({
      ...tutor,
      certificationStage: TutorCertificationStageEnum.docs,
    } as never);

    expect(updateCertificationStage).toHaveBeenCalledWith(
      tutor.id,
      TutorCertificationStageEnum.interview,
    );
    expect(emit).toHaveBeenCalledWith({
      event: CommunicationEvent.TUTOR_APPLICATION_REVIEW,
      userId: tutor.userId,
      entityType: 'tutor-application-review',
      entityId: String(tutor.id),
      payload: { firstName: 'Ada' },
    });
  });

  it('still completes documents step if application-review emit fails', async () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { service, updateCertificationStage } = createService({
      stage: TutorCertificationStageEnum.docs,
      emitError: new Error('smtp down'),
    });

    try {
      await service.completeDocsStep({
        ...tutor,
        certificationStage: TutorCertificationStageEnum.docs,
      } as never);
      expect(updateCertificationStage).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
