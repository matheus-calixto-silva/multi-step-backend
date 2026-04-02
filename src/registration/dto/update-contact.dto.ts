import { Matches } from 'class-validator';

export class UpdateContactDto {
  @Matches(/^[1-9]{2}9[0-9]{8}$/, {
    message: 'Telefone deve ser celular válido (DDD + 9 dígitos)',
  })
  phone!: string;
}
