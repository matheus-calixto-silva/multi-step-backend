import { IsString, Length, Matches } from 'class-validator';

export class VerifyMfaDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Código MFA deve conter 6 dígitos numéricos' })
  @Length(6, 6, { message: 'Código MFA deve ter 6 dígitos' })
  code!: string;
}
