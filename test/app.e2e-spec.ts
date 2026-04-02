import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';

describe('Registration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /registrations should create a registration and return an id', async () => {
    const response = await request(app.getHttpServer())
      .post('/registrations')
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(typeof response.body.id).toBe('string');
  });

  it('GET /registrations/:id should return 404 for unknown id', async () => {
    await request(app.getHttpServer())
      .get('/registrations/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('GET /cep/:cep should return 400 for invalid CEP format', async () => {
    await request(app.getHttpServer()).get('/cep/invalid').expect(400);
  });
});
