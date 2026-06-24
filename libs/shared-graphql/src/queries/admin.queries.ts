import { gql } from '@apollo/client';

export const GET_ADMIN_DASHBOARD_STATS = gql`
  query GetAdminDashboardStats {
    adminDashboardStats {
      tutorSignupCount
      studentSignupCount
      tutorOnlineUsers
      studentOnlineUsers
      tutorActiveSessions
      studentActiveSessions
    }
  }
`;

export const GET_ADMIN_TUTORS = gql`
  query GetAdminTutors($input: AdminTutorListInput!) {
    adminTutors(input: $input) {
      totalCount
      page
      pageSize
      totalPages
      items {
        id
        firstName
        lastName
        email
        mobile
        mobileCountryCode
        mobileNumber
        certificationStage
        daysInStage
        pendingAdminDocumentReview
        testTutor
      }
    }
  }
`;

export const GET_ADMIN_TUTOR_STAGE_COUNTS = gql`
  query GetAdminTutorStageCounts($search: String) {
    adminTutorStageCounts(search: $search) {
      stage
      count
      pendingDocumentReviewCount
    }
  }
`;

export const GET_ADMIN_STUDENTS = gql`
  query GetAdminStudents($input: AdminStudentListInput!) {
    adminStudents(input: $input) {
      totalCount
      page
      pageSize
      totalPages
      items {
        id
        firstName
        lastName
        email
        mobile
        mobileCountryCode
        mobileNumber
        onboardingStage
        onBoardingComplete
        daysInStage
      }
    }
  }
`;

export const GET_ADMIN_STUDENT_STAGE_COUNTS = gql`
  query GetAdminStudentStageCounts {
    adminStudentStageCounts {
      stage
      count
    }
  }
`;

export const GET_ADMIN_TUTOR_DETAIL = gql`
  query GetAdminTutorDetail($tutorId: Int!) {
    adminTutorDetail(tutorId: $tutorId) {
      id
      certificationStage
      yearsOfExperience
      regFeePaid
      testTutor
      canSetAvailability
      availabilityConfiguredAt
      regFeeAmount
      regFeeAmountToBePaid
      regFeeDate
      user {
        firstName
        lastName
        email
        mobile
        mobileCountryCode
        mobileNumber
        createdDate
        profilePicture
        profilePictureThumbnailMedium
        profilePictureThumbnailLarge
        profilePictureOriginalUrl
        bankDetails {
          bankName
          ifscCode
          gstNumber
          panNumber
          accountNumberMasked
          accountNumber
          isComplete
        }
      }
      addresses {
        id
        type
        street
        subArea
        city
        state
        country
        postalCode
        fullAddress
        createdDate
        updatedDate
      }
      qualifications {
        id
        qualificationType
        boardOrUniversity
        degreeName
        gradeType
        gradeValue
        yearObtained
        fieldOfStudy
        displayOrder
        createdDate
        updatedDate
      }
      experiences {
        id
        jobTitle
        employerName
        employerAddress
        employmentType
        startDate
        endDate
        isCurrent
        createdDate
        updatedDate
      }
      offerings {
        id
        offeringName
        offeringDisplayName
        offeringFullLabel
        status
        attemptsUsed
        attemptsRemaining
        lastScore
        lastMaxScore
        lastAttemptAt
        passedAt
        lastTimeTakenSeconds
        createdDate
        rateCard {
          freeDemoOffered
          offlineEnabled
          offlineBaseRate
          offlineBaseDiscountPct
          offlineSlab2DiscountPct
          offlineSlab3DiscountPct
          onlineEnabled
          onlineBaseRate
          onlineBaseDiscountPct
          onlineSlab2DiscountPct
          onlineSlab3DiscountPct
          offlineBatchSize
          onlineBatchSize
          isComplete
        }
      }
      documents {
        id
        name
        documentType
        filename
        mimeType
        previewUrl
        viewUrl
        createdDate
        screening {
          status
          summaryNotes
          confidence
          automatedAt
          reviewerNote
          reviewedAt
        }
      }
    }
  }
`;

export const GET_ADMIN_STUDENT_DETAIL = gql`
  query GetAdminStudentDetail($studentId: Int!) {
    adminStudentDetail(studentId: $studentId) {
      id
      onboardingStage
      onboardingStageEnteredAt
      onBoardingComplete
      parentRelation
      parentName
      studentType
      schoolClass
      board
      boardOther
      user {
        firstName
        lastName
        email
        mobile
        mobileCountryCode
        mobileNumber
        createdDate
        profilePicture
        profilePictureThumbnailMedium
        profilePictureThumbnailLarge
        profilePictureOriginalUrl
      }
      addresses {
        id
        street
        subArea
        city
        state
        country
        postalCode
        fullAddress
        primary
        createdDate
        updatedDate
      }
    }
  }
`;

export const GET_ADMIN_PROFICIENCY_TESTS = gql`
  query GetAdminProficiencyTests {
    adminProficiencyTests {
      id
      studyArea
      board
      classLabel
      subjects
      questionCount
      offeringIds
    }
  }
`;

export const GET_ADMIN_PROFICIENCY_TEST_DETAIL = gql`
  query GetAdminProficiencyTestDetail($testId: Int!) {
    adminProficiencyTestDetail(testId: $testId) {
      id
      name
      time
      score
      passPercentage
      questions {
        id
        question
        questionType
        difficulty
        answers {
          id
          text
          answer
        }
      }
    }
  }
`;

export const GET_ADMIN_ORDERS = gql`
  query GetAdminOrders($input: AdminOrderListInput!) {
    adminOrders(input: $input) {
      items {
        id
        orderNumber
        status
        paymentMethod
        payerRole
        source
        userId
        payerName
        payerEmail
        subtotalInr
        discountInr
        amountDueInr
        amountPaidInr
        paidAt
        createdDate
      }
      totalCount
      page
      pageSize
      totalPages
    }
  }
`;

export const GET_ADMIN_ORDER_DETAIL = gql`
  query GetAdminOrderDetail($orderId: Int!) {
    adminOrderDetail(orderId: $orderId) {
      id
      orderNumber
      status
      paymentMethod
      payerRole
      source
      subtotalInr
      discountInr
      taxInr
      pointsRedeemed
      pointsValueInr
      amountDueInr
      amountPaidInr
      billingName
      billingEmail
      billingPhone
      billingStateCode
      paidAt
      createdDate
      payer {
        userId
        name
        email
        mobile
      }
      items {
        id
        itemType
        description
        quantity
        unitRateInr
        lineSubtotalInr
        discountInr
        waiverApplied
        cgstInr
        sgstInr
        igstInr
        gstRatePercent
        referenceType
        referenceId
        fulfillmentStatus
      }
      invoice {
        id
        invoiceNumber
        orderNumber
        amountDueInr
        amountPaidInr
        paymentMethod
        issuedAt
        pdfUrl
      }
      paymentAttempts {
        id
        provider
        gatewayOrderId
        gatewayPaymentId
        amountInr
        status
        gatewaySettlementId
        settlementUtr
        settledAt
      }
    }
  }
`;
