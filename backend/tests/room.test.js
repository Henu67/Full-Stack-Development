import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server.js';
import Room from '../models/Room.js';

let mongoServer;
let token;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Register a user and get token
  const res = await request(app).post('/api/auth/register').send({
    name: 'Room User',
    email: 'roomuser@example.com',
    password: 'password123',
  });
  token = res.body.token;
}, 120000); // 2 minutes timeout for downloading mongodb binary

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    if (key !== 'users') { // keep user so token remains valid
      await collections[key].deleteMany({});
    }
  }
});

describe('Rooms API', () => {
  it('should create a room', async () => {
    const res = await request(app)
      .post('/api/rooms/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Room',
        description: 'Test Room Description',
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('name', 'Test Room');
    expect(res.body).toHaveProperty('inviteCode');
  });

  it('should fetch user rooms', async () => {
    await request(app)
      .post('/api/rooms/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'My New Room',
      });
    
    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
  });
});
