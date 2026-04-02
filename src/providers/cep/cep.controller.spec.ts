import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CEP_PROVIDER } from './cep-provider.interface';
import { CepController } from './cep.controller';

const mockCepProvider = () => ({ lookup: jest.fn() });

describe('CepController', () => {
  let controller: CepController;
  let cepProvider: { lookup: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CepController],
      providers: [{ provide: CEP_PROVIDER, useFactory: mockCepProvider }],
    }).compile();

    controller = module.get<CepController>(CepController);
    cepProvider = module.get(CEP_PROVIDER);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return CepResponse when provider finds the CEP', async () => {
    const cepResponse = {
      cep: '01310-100',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    };
    cepProvider.lookup.mockResolvedValue(cepResponse);

    const result = await controller.lookup('01310100');

    expect(result).toEqual(cepResponse);
  });

  it('should throw NotFoundException when provider returns null', async () => {
    cepProvider.lookup.mockResolvedValue(null);

    await expect(controller.lookup('99999999')).rejects.toThrow(
      NotFoundException,
    );
  });
});
