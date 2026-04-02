import { CnpjValidator } from '../cnpj.validator';

describe('CnpjValidator', () => {
  let validator: CnpjValidator;

  beforeEach(() => {
    validator = new CnpjValidator();
  });

  it('should accept a valid CNPJ (only digits)', () => {
    expect(validator.validate('11222333000181')).toBe(true);
  });

  it('should accept a valid CNPJ with formatting', () => {
    expect(validator.validate('11.222.333/0001-81')).toBe(true);
  });

  it('should reject CNPJ with all equal digits', () => {
    expect(validator.validate('11111111111111')).toBe(false);
  });

  it('should reject CNPJ with wrong check digits', () => {
    expect(validator.validate('11222333000199')).toBe(false);
  });

  it('should reject CNPJ with less than 14 digits', () => {
    expect(validator.validate('1122233300018')).toBe(false);
  });
});
