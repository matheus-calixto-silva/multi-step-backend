import { IsEnum, IsString, Validate } from 'class-validator';
import { DocumentType } from '../entities/registration.entity';
import { DocumentValidator } from '../../common/validators/document.validator';

export class UpdateDocumentDto {
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsString()
  @Validate(DocumentValidator)
  document!: string;
}
