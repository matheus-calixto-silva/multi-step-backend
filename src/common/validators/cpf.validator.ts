import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'cpf', async: false })
export class CpfValidator implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    const cpf = value.replace(/\D/g, '');

    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const calcDigit = (slice: string, weight: number): number => {
      const sum = slice
        .split('')
        .reduce((acc, digit, i) => acc + Number(digit) * (weight - i), 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const first = calcDigit(cpf.slice(0, 9), 10);
    if (first !== Number(cpf[9])) return false;

    const second = calcDigit(cpf.slice(0, 10), 11);
    return second === Number(cpf[10]);
  }

  defaultMessage(): string {
    return 'CPF inválido';
  }
}
