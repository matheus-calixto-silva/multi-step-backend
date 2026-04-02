import { ViaCepProvider } from './viacep.provider';

describe('ViaCepProvider', () => {
  let provider: ViaCepProvider;

  beforeEach(() => {
    provider = new ViaCepProvider();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should return CepResponse on success', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    } as unknown as Response);

    const result = await provider.lookup('01310100');

    expect(result).toEqual({
      cep: '01310-100',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    });
  });

  it('should return null when ViaCEP responds with erro: true', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: jest.fn().mockResolvedValue({ erro: true }),
    } as unknown as Response);

    const result = await provider.lookup('99999999');

    expect(result).toBeNull();
  });

  it('should return null when fetch throws a network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await provider.lookup('01310100');

    expect(result).toBeNull();
  });

  it('should return null when request times out after 5s', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          const signal = (options as RequestInit | undefined)?.signal;
          if (signal) {
            signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }
        }),
    );

    const lookupPromise = provider.lookup('01310100');
    jest.advanceTimersByTime(5000);
    const result = await lookupPromise;

    expect(result).toBeNull();
  });
});
