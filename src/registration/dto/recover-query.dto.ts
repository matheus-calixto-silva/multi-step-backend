import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class RecoverQueryDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email!: string;
}
