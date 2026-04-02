import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { DocumentType } from '../../registration/entities/registration.entity';
import { CpfValidator } from './cpf.validator';
import { CnpjValidator } from './cnpj.validator';

@ValidatorConstraint({ name: 'document', async: false })
export class DocumentValidator implements ValidatorConstraintInterface {
  private readonly cpfValidator = new CpfValidator();
  private readonly cnpjValidator = new CnpjValidator();

  validate(value: string, args: ValidationArguments): boolean {
    const obj = args.object as { documentType?: DocumentType };

    if (obj.documentType === DocumentType.CPF) {
      return this.cpfValidator.validate(value);
    }

    if (obj.documentType === DocumentType.CNPJ) {
      return this.cnpjValidator.validate(value);
    }

    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as { documentType?: DocumentType };
    if (obj.documentType === DocumentType.CPF) return 'CPF inválido';
    if (obj.documentType === DocumentType.CNPJ) return 'CNPJ inválido';
    return 'Documento inválido';
  }
}
