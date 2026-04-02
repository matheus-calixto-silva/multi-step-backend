import { ApiProperty } from '@nestjs/swagger';
import {
  DocumentType,
  RegistrationStep,
} from '../entities/registration.entity';

export class RegistrationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ enum: DocumentType, nullable: true })
  documentType!: DocumentType | null;

  @ApiProperty({ nullable: true })
  document!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  cep!: string | null;

  @ApiProperty({ nullable: true })
  street!: string | null;

  @ApiProperty({ nullable: true })
  number!: string | null;

  @ApiProperty({ nullable: true })
  complement!: string | null;

  @ApiProperty({ nullable: true })
  neighborhood!: string | null;

  @ApiProperty({ nullable: true })
  city!: string | null;

  @ApiProperty({ nullable: true })
  state!: string | null;

  @ApiProperty({ enum: RegistrationStep })
  currentStep!: RegistrationStep;

  @ApiProperty({ nullable: true })
  mfaVerifiedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;
}
