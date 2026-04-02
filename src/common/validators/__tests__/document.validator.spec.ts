import { ValidationArguments } from 'class-validator';
import { DocumentType } from '../../../registration/entities/registration.entity';
import { DocumentValidator } from '../document.validator';

function makeArgs(documentType?: DocumentType): ValidationArguments {
  return {
    object: { documentType },
    value: '',
    constraints: [],
    targetName: 'UpdateDocumentDto',
    property: 'document',
  };
}

describe('DocumentValidator', () => {
  let validator: DocumentValidator;

  beforeEach(() => {
    validator = new DocumentValidator();
  });

  describe('validate', () => {
    it('should return true for a valid CPF with type CPF', () => {
      // CPF válido: 529.982.247-25
      expect(
        validator.validate('52998224725', makeArgs(DocumentType.CPF)),
      ).toBe(true);
    });

    it('should return true for a valid CNPJ with type CNPJ', () => {
      // CNPJ válido: 11.222.333/0001-81
      expect(
        validator.validate('11222333000181', makeArgs(DocumentType.CNPJ)),
      ).toBe(true);
    });

    it('should return false for a CPF with type CNPJ', () => {
      expect(
        validator.validate('52998224725', makeArgs(DocumentType.CNPJ)),
      ).toBe(false);
    });

    it('should return false for a CNPJ with type CPF', () => {
      expect(
        validator.validate('11222333000181', makeArgs(DocumentType.CPF)),
      ).toBe(false);
    });

    it('should return false when documentType is absent', () => {
      expect(validator.validate('52998224725', makeArgs(undefined))).toBe(
        false,
      );
    });
  });

  describe('defaultMessage', () => {
    it('should return "CPF inválido" when type is CPF', () => {
      expect(validator.defaultMessage(makeArgs(DocumentType.CPF))).toBe(
        'CPF inválido',
      );
    });

    it('should return "CNPJ inválido" when type is CNPJ', () => {
      expect(validator.defaultMessage(makeArgs(DocumentType.CNPJ))).toBe(
        'CNPJ inválido',
      );
    });

    it('should return "Documento inválido" when type is absent', () => {
      expect(validator.defaultMessage(makeArgs(undefined))).toBe(
        'Documento inválido',
      );
    });
  });
});
