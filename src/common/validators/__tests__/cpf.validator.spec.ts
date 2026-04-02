import { CpfValidator } from '../cpf.validator';

describe('CpfValidator', () => {
  let validator: CpfValidator;

  beforeEach(() => {
    validator = new CpfValidator();
  });

  it('should accept a valid CPF (only digits)', () => {
    expect(validator.validate('52998224725')).toBe(true);
  });

  it('should accept a valid CPF with formatting', () => {
    expect(validator.validate('529.982.247-25')).toBe(true);
  });

  it('should reject CPF with all equal digits', () => {
    expect(validator.validate('11111111111')).toBe(false);
  });

  it('should reject CPF with wrong first check digit', () => {
    expect(validator.validate('52998224715')).toBe(false);
  });

  it('should reject CPF with wrong second check digit', () => {
    expect(validator.validate('52998224724')).toBe(false);
  });

  it('should reject CPF with less than 11 digits', () => {
    expect(validator.validate('1234567')).toBe(false);
  });
});
