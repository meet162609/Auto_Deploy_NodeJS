// test/test.js
const request = require('supertest');
const app = require('../index.js');

describe('GET /will', function () {
  it('responds with Hello World', function (done) {
    request(app)
      .get('/will')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect({ response: 'Hello World' }, done);
  });
});
