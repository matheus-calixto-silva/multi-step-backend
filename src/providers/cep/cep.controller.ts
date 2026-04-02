import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CEP_PROVIDER,
  CepProvider,
  CepResponse,
} from './cep-provider.interface';
import { ParseCepPipe } from './parse-cep.pipe';

@ApiTags('cep')
@Controller('cep')
export class CepController {
  constructor(
    @Inject(CEP_PROVIDER) private readonly cepProvider: CepProvider,
  ) {}

  @Get(':cep')
  async lookup(@Param('cep', ParseCepPipe) cep: string): Promise<CepResponse> {
    const result = await this.cepProvider.lookup(cep);
    if (!result) {
      throw new NotFoundException(`CEP ${cep} não encontrado`);
    }
    return result;
  }
}
