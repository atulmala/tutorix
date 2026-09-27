import {
  applyAdminClassBookingStudentSearch,
  applyAdminClassBookingTutorSearch,
  personDisplayName,
} from './admin-class-booking.utils';

describe('admin-class-booking.utils', () => {
  it('applies student search on studentUser alias', () => {
    const andWhere = jest.fn();
    applyAdminClassBookingStudentSearch({ andWhere }, 'ada@example.com');
    expect(andWhere).toHaveBeenCalledWith(
      expect.stringContaining('studentUser.email ILIKE :studentSearchTerm'),
      { studentSearchTerm: '%ada@example.com%' },
    );
  });

  it('skips empty student search', () => {
    const andWhere = jest.fn();
    applyAdminClassBookingStudentSearch({ andWhere }, '   ');
    expect(andWhere).not.toHaveBeenCalled();
  });

  it('applies tutor search on tutorUser alias', () => {
    const andWhere = jest.fn();
    applyAdminClassBookingTutorSearch({ andWhere }, 'Priya');
    expect(andWhere).toHaveBeenCalledWith(
      expect.stringContaining('tutorUser.firstName ILIKE :tutorSearchTerm'),
      { tutorSearchTerm: '%Priya%' },
    );
  });

  it('formats display name', () => {
    expect(personDisplayName('Ada', 'Lovelace')).toBe('Ada Lovelace');
    expect(personDisplayName(null, 'Solo')).toBe('Solo');
  });
});
