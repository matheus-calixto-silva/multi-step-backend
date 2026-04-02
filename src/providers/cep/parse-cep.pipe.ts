import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseCepPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^\d{8}$/.test(value)) {
      throw new BadRequestException(
        'CEP inválido: deve conter exatamente 8 dígitos numéricos',
      );
    }
    return value;
  }
}
