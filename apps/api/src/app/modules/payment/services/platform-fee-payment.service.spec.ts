import { BadRequestException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '../../auth/enums/user-role.enum';
import { CheckoutService } from '../../commerce/services/checkout.service';
import { OrderService } from '../../commerce/services/order.service';
import { PlatformFeeService } from '../../platform-fee/services/platform-fee.service';
import { TutorOfferingService } from '../../tutor/services/tutor-offering.service';
import { TutorOfferingPtFeeService } from '../../tutor/services/tutor-offering-pt-fee.service';
import { TutorService } from '../../tutor/services/tutor.service';
import { PlatformFeePaymentEntity } from '../entities/platform-fee-payment.entity';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import { PlatformFeePaymentService } from './platform-fee-payment.service';

describe('PlatformFeePaymentService PT fee', () => {
  let service: PlatformFeePaymentService;
  let findByIdForTutor: jest.Mock;

  const tutorUser = { id: 1, role: UserRole.TUTOR } as never;

  beforeEach(async () => {
    findByIdForTutor = jest.fn().mockResolvedValue({
      id: 5,
      isInitialOnboarding: true,
    });

    const tutorService = {
      findByUserId: jest.fn().mockResolvedValue({ id: 10 }),
    };
    const tutorOfferingService = { findByIdForTutor };
    const ptFeeService = { findByTutorOfferingId: jest.fn() };

    const moduleRef = {
      get: jest.fn((token: unknown) => {
        if (token === TutorService) {
          return tutorService;
        }
        if (token === TutorOfferingService) {
          return tutorOfferingService;
        }
        if (token === TutorOfferingPtFeeService) {
          return ptFeeService;
        }
        throw new Error(`Unexpected token: ${String(token)}`);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformFeePaymentService,
        {
          provide: getRepositoryToken(PlatformFeePaymentEntity),
          useValue: { findOne: jest.fn() },
        },
        { provide: PlatformFeeService, useValue: {} },
        { provide: PaymentGatewayFactory, useValue: {} },
        { provide: CheckoutService, useValue: {} },
        { provide: OrderService, useValue: {} },
        { provide: ModuleRef, useValue: moduleRef },
      ],
    }).compile();

    service = module.get(PlatformFeePaymentService);
  });

  it('rejects initiatePtFeePayment for initial onboarding offerings', async () => {
    await expect(service.initiatePtFeePayment(tutorUser, 5)).rejects.toThrow(
      BadRequestException,
    );
    expect(findByIdForTutor).toHaveBeenCalledWith(5, 10);
  });
});
