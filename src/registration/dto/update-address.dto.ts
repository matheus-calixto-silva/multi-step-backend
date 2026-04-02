import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const VALID_UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
];

export class UpdateAddressDto {
  @Matches(/^[0-9]{8}$/, { message: 'CEP deve ter 8 dígitos numéricos' })
  cep!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(trim)
  street!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(trim)
  number!: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  complement?: string;

  @IsString()
  @IsNotEmpty()
  @Transform(trim)
  neighborhood!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(trim)
  city!: string;

  @IsString()
  @Length(2, 2, { message: 'Estado deve ser a sigla UF com 2 caracteres' })
  @IsIn(VALID_UFS, { message: 'Estado deve ser uma UF brasileira válida' })
  state!: string;
}
