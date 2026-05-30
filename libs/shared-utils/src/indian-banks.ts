export const INDIAN_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Indian Bank',
  'Central Bank of India',
  'Bank of India',
  'IDBI Bank',
  'IDFC FIRST Bank',
  'Yes Bank',
  'IndusInd Bank',
  'Federal Bank',
  'RBL Bank',
  'Bandhan Bank',
  'AU Small Finance Bank',
  'Karur Vysya Bank',
  'South Indian Bank',
  'City Union Bank',
  'DCB Bank',
  'Standard Chartered Bank',
  'HSBC Bank',
] as const;

export const OTHER_BANK_OPTION = 'My bank is not in the list';

export type IndianBankName = (typeof INDIAN_BANKS)[number];
