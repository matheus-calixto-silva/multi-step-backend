import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'cnpj', async: false })
export class CnpjValidator implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    const cnpj = value.replace(/\D/g, '');

    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const calcDigit = (slice: string, weights: number[]): number => {
      const sum = slice
        .split('')
        .reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const first = calcDigit(cnpj.slice(0, 12), weights1);
    if (first !== Number(cnpj[12])) return false;

    const second = calcDigit(cnpj.slice(0, 13), weights2);
    return second === Number(cnpj[13]);
  }

  defaultMessage(): string {
    return 'CNPJ inválido';
  }
}
