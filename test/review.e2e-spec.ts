import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/app.setup';
import { AppModule } from './../src/app.module';

const as = (id: string, role = 'member') => ({ 'x-user-id': id, 'x-user-name': id, 'x-user-role': role });

describe('Reviews (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterEach(() => app.close());

  it('full lifecycle: create -> vote -> stats -> book summary', async () => {
    const http = request(app.getHttpServer());
    const created = await http
      .post('/book/1/reviews')
      .set(as('alice'))
      .send({ rating: 5, title: 'Brilliant', content: 'Could not put it down, everything works so well here.' })
      .expect(201);

    await http.put(`/reviews/${created.body.id}/vote`).set(as('bob')).send({ value: 'helpful' }).expect(200);
    const stats = await http.get('/book/1/reviews/stats').expect(200);
    expect(stats.body.count).toBe(1);
    expect(stats.body.highlightReviews.mostHelpful.id).toBe(created.body.id);
    const book = await http.get('/book/1').expect(200);
    expect(book.body.ratingCount).toBe(1);
  });

  it('enforces auth and roles', async () => {
    const http = request(app.getHttpServer());
    await http.post('/book/1/reviews').send({}).expect(401);
    await http.get('/admin/reviews/queue').set(as('alice')).expect(403);
    await http.get('/admin/reviews/queue').set(as('lib', 'librarian')).expect(200);
  });

  it('validates payloads', () =>
    request(app.getHttpServer())
      .post('/book/1/reviews')
      .set(as('alice'))
      .send({ rating: 7, title: 'x', content: 'short', hacker: true })
      .expect(400));
});
