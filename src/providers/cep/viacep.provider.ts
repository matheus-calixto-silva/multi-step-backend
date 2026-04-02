import { Injectable } from '@nestjs/common';
import { CepProvider, CepResponse } from './cep-provider.interface';

@Injectable()
export class ViaCepProvider implements CepProvider {
  async lookup(cep: string): Promise<CepResponse | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        signal: controller.signal,
      });
      const data = await response.json();
      if (data.erro) return null;
      return {
        cep: data.cep,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
