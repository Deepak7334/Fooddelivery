'use strict';

// Persistence and authentication are mocked; these tests do not verify database integration.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');
const http = require('node:http');
const express = require('express');

const PRIVATE_FIELDS = ['password', 'emailOtp', 'emailOtpExpiry', 'fcmToken', 'firebaseUid', '__v'];
const USER_ID = '111111111111111111111111';
const RESTAURANT_ID = '222222222222222222222222';
const OTHER_RESTAURANT_ID = '333333333333333333333333';
const TABLE_ID = '444444444444444444444444';
const OTHER_TABLE_ID = '555555555555555555555555';
const MISSING_ID = '666666666666666666666666';
const clone = value => JSON.parse(JSON.stringify(value));

function document(record) {
  if (!record) return null;
  const result = clone(record);
  Object.defineProperty(result, 'toObject', { value: () => clone(result) });
  return result;
}

// Implement only the query operators used by these contracts; fail closed on new ones.
function matches(record, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (expected && typeof expected === 'object') {
      assert.deepEqual(Object.keys(expected), ['$ne'], `Unsupported mock filter: ${key}`);
      return record[key] !== expected.$ne;
    }
    return record[key] === expected;
  });
}

function query(read) {
  let projection;
  let order;
  const result = {
    select(fields) { projection = fields; return result; },
    sort(fields) { order = fields; return result; },
    async exec() {
      let value = await read();
      if (order && Array.isArray(value)) {
        const [[key, direction]] = Object.entries(order);
        value = [...value].sort((a, b) => (a[key] - b[key]) * direction);
      }
      if (projection && value && !Array.isArray(value)) {
        const fields = projection.split(/\s+/);
        const projected = fields[0].startsWith('-') ? clone(value) : { _id: value._id };
        for (const field of fields) {
          if (field.startsWith('-')) delete projected[field.slice(1)];
          else if (Object.hasOwn(value, field)) projected[field] = value[field];
        }
        value = document(projected);
      }
      return value;
    },
    then(resolve, reject) { return result.exec().then(resolve, reject); },
  };
  return result;
}

function forbidden(name) {
  return new Proxy(function () { throw new Error(`Unexpected dependency call: ${name}`); }, {
    get(_target, method) {
      return () => { throw new Error(`Unexpected dependency call: ${name}.${String(method)}`); };
    },
  });
}

function loadRouter(name, mocks) {
  const filename = path.resolve(__dirname, '..', 'routes', `${name}.js`);
  const module = { exports: {} };
  const safeRequire = request => {
    if (Object.hasOwn(mocks, request)) return mocks[request];
    if (['express', 'bcryptjs', 'jsonwebtoken'].includes(request)) return require(request);
    throw new Error(`Unmocked route dependency: ${request}`);
  };
  const wrapper = vm.runInThisContext(Module.wrap(fs.readFileSync(filename, 'utf8')), { filename });
  wrapper(module.exports, safeRequire, module, filename, path.dirname(filename));
  return module.exports;
}

function authMiddleware(getUser) {
  return {
    protect(req, _res, next) { req.user = getUser(); next(); },
    authorize: () => (_req, _res, next) => next(),
  };
}

async function serve(t, mounts) {
  const app = express();
  app.use(express.json());
  for (const [prefix, router] of Object.entries(mounts)) app.use(prefix, router);
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  return (method, pathname, body) => new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const request = http.request({
      hostname: '127.0.0.1', port: server.address().port, path: pathname, method,
      agent: false,
      headers: payload === undefined ? {} : {
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload),
      },
    }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; });
      response.on('error', reject);
      response.on('end', () => {
        try { resolve({ status: response.statusCode, body: JSON.parse(text) }); }
        catch (error) { reject(new Error(`Non-JSON HTTP response (${response.statusCode}): ${text}`, { cause: error })); }
      });
    });
    request.setTimeout(5000, () => request.destroy(new Error('Loopback request timed out')));
    request.on('error', reject);
    request.end(payload);
  });
}

function assertStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body));
}

const savedAddress = { label: 'HOME', addressLine1: '12 Park Road', city: 'Chennai', pincode: '600001', isDefault: true };
function checkoutAddress(alternatePhone = '+91 91234 56780') {
  return {
    label: 'WORK', name: 'E. Kumar', address: '8 Lake Road, Chennai',
    addressLine1: '8 Lake Road', addressLine2: '', landmark: 'Library',
    area: 'Central', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu',
    pincode: '600002', latitude: 13.08, longitude: 80.27, alternatePhone, isDefault: true,
  };
}

async function authFixture(t, overrides = {}, options = {}) {
  const state = {
    user: clone({
      _id: USER_ID, name: 'Anita Rao', email: 'anita@example.test', role: 'store_owner',
      phone: '9876543210', address: '12 Park Road', addresses: [savedAddress],
      profileImage: 'data:image/png;base64,b2xk', restaurantId: RESTAURANT_ID,
      storeId: '777777777777777777777777', deliveryStatus: 'busy',
      serviceAreaIds: ['888888888888888888888888'], isActive: true,
      password: 'private-password-hash', emailOtp: '123456', emailOtpExpiry: '2099-01-01T00:00:00.000Z',
      fcmToken: 'private-device-token', firebaseUid: 'private-firebase-id', __v: 4,
      ...overrides,
    }),
    others: [{ _id: MISSING_ID, phone: '9000000000' }],
    lookups: [], updates: [], audits: [], writeError: null,
  };
  const User = {
    findById(id) { return query(() => id === state.user._id ? document(state.user) : null); },
    findOne(filter) {
      state.lookups.push(clone(filter));
      return query(() => document([state.user, ...state.others].find(user => matches(user, filter))));
    },
    findByIdAndUpdate(id, update, options) {
      state.updates.push(clone({ id, update, options }));
      return query(() => {
        if (state.writeError) throw state.writeError;
        if (id !== state.user._id) return null;
        Object.assign(state.user, clone(update.$set || {}));
        for (const key of Object.keys(update.$unset || {})) delete state.user[key];
        return document(state.user);
      });
    },
  };
  const router = loadRouter('auth', {
    '../models/User': User,
    '../models/ProfileAuditLog': { async create(entry) { state.audits.push(clone(entry)); } },
    '../middleware/auth': authMiddleware(() => options.plainUser ? clone(state.user) : document(state.user)),
    '../utils/generateOTP': forbidden('generateOTP'),
    '../utils/sendEmail': forbidden('sendEmail'),
  });
  return { state, request: await serve(t, { '/api/auth': router }) };
}

function assertPublicUser(actual, persisted) {
  assert.ok(actual);
  for (const field of PRIVATE_FIELDS) assert.equal(Object.hasOwn(actual, field), false, `Leaked ${field}`);
  for (const field of ['name', 'email', 'role', 'address', 'addresses', 'profileImage', 'restaurantId', 'storeId', 'deliveryStatus', 'serviceAreaIds', 'isActive']) {
    assert.deepEqual(actual[field], persisted[field], `Lost or changed public field ${field}`);
  }
  assert.equal(actual.id, persisted._id);
  assert.equal(actual.phone, persisted.phone || '');
}

function websitePayload(user) {
  return { name: user.name, phone: user.phone || '', address: user.address, profileImage: user.profileImage };
}

test('website ProfilePage payload updates all four fields and preserves safe session data', async t => {
  const { state, request } = await authFixture(t);
  const before = clone(state.user);
  const payload = { name: 'E. Kumar', phone: '+91 91234 56780', address: '8 Lake Road', profileImage: 'data:image/png;base64,bmV3' };
  const response = await request('PUT', '/api/auth/profile', payload);
  assertStatus(response, 200);
  assert.equal(response.body.success, true);
  assertPublicUser(response.body.user, state.user);
  assert.equal(state.updates.length, 1);
  assert.deepEqual(state.updates[0].update, { $set: { ...payload, phone: '9123456780' } });
  assert.equal(state.updates[0].options.new, true);
  assert.deepEqual(state.lookups, [{ phone: '9123456780', _id: { $ne: USER_ID } }]);
  for (const field of PRIVATE_FIELDS) assert.deepEqual(state.user[field], before[field]);
});

test('unchanged website save returns safe complete user without writing or exposing private fields', async t => {
  const { state, request } = await authFixture(t);
  const before = clone(state.user);
  const response = await request('PUT', '/api/auth/profile', websitePayload(state.user));
  assertStatus(response, 200);
  assertPublicUser(response.body.user, before);
  assert.deepEqual(state.user, before);
  assert.deepEqual(state.updates, []);
  assert.deepEqual(state.lookups, []);
  assert.deepEqual(state.audits, []);
});

for (const plainUser of [false, true]) {
  test(`/auth/me retains role/profile fields and removes every secret (${plainUser ? 'plain object' : 'document'})`, async t => {
    const { state, request } = await authFixture(t, {}, { plainUser });
    const before = clone(state.user);
    const response = await request('GET', '/api/auth/me');
    assertStatus(response, 200);
    assertPublicUser(response.body.user, before);
    assert.deepEqual(state.user, before, 'Serialization must not mutate the authenticated user');
    assert.deepEqual(state.updates, []);
  });
}

for (const [raw, expected] of [
  ['E Kumar', 'E Kumar'], ['E. Kumar', 'E. Kumar'], ['  E. Kumar  ', 'E. Kumar'],
  ['123 E Kumar', 'E Kumar'], ['1.2e+30 E. Kumar', 'E. Kumar'], ['9E-12 E Kumar', 'E Kumar'],
]) {
  test(`profile and /me preserve initials and sanitize numeric prefixes: ${JSON.stringify(raw)}`, async t => {
    const { state, request } = await authFixture(t, { name: raw });
    const me = await request('GET', '/api/auth/me');
    assertStatus(me, 200);
    assert.equal(me.body.user.name, expected);
    assert.equal(state.user.name, raw, '/me must not change stored data');
    // Force the write path too, including when the clean name equals the raw name.
    state.user.name = 'Previous Name';
    const saved = await request('PUT', '/api/auth/profile', { name: raw });
    assertStatus(saved, 200);
    assert.equal(saved.body.user.name, expected);
    assert.equal(state.user.name, expected);
  });
}

test('explicit blank phone uses $unset, not a sparse-index-colliding empty string', async t => {
  const { state, request } = await authFixture(t);
  const response = await request('PUT', '/api/auth/profile', { phone: '' });
  assertStatus(response, 200);
  assert.deepEqual(state.updates[0].update, { $unset: { phone: '' } });
  assert.equal(Object.hasOwn(state.user, 'phone'), false);
  assert.equal(response.body.user.phone, '');
  assert.deepEqual(state.lookups, []);
});

for (const phone of [undefined, '9876543210']) {
  test(`explicit phone wins over checkout alternatePhone (existing phone ${phone ? 'present' : 'absent'})`, async t => {
    const { state, request } = await authFixture(t, { phone });
    const newAddress = checkoutAddress('9000000000'); // Alternate belongs to someone else; it must be ignored for profile phone.
    const response = await request('PUT', '/api/auth/profile', { phone: '+91 91234 56780', newAddress });
    assertStatus(response, 200);
    assert.equal(state.user.phone, '9123456780');
    assert.equal(response.body.user.phone, '9123456780');
    assert.deepEqual(state.lookups, [{ phone: '9123456780', _id: { $ne: USER_ID } }]);
    assert.deepEqual(state.user.addresses, [savedAddress, newAddress]);
  });

  test(`explicit blank cannot be refilled from newAddress (existing phone ${phone ? 'present' : 'absent'})`, async t => {
    const { state, request } = await authFixture(t, { phone });
    const response = await request('PUT', '/api/auth/profile', { phone: '', newAddress: checkoutAddress() });
    assertStatus(response, 200);
    assert.equal(Object.hasOwn(state.user, 'phone'), false);
    assert.equal(response.body.user.phone, '');
    assert.equal(Object.hasOwn(state.updates[0].update.$set || {}, 'phone'), false);
    if (phone) assert.deepEqual(state.updates[0].update.$unset, { phone: '' });
    assert.deepEqual(state.lookups, []);
  });
}

for (const formatted of ['+91 91234 56780', '09123456780', '91234-56780']) {
  test(`checkout newAddress appends and normalizes missing profile phone: ${formatted}`, async t => {
    const { state, request } = await authFixture(t, { phone: undefined });
    const newAddress = checkoutAddress(formatted);
    const response = await request('PUT', '/api/auth/profile', { newAddress });
    assertStatus(response, 200);
    assert.equal(state.user.phone, '9123456780');
    assert.deepEqual(state.user.addresses, [savedAddress, newAddress]);
    assert.equal(state.user.address, '12 Park Road');
    assert.deepEqual(state.lookups, [{ phone: '9123456780', _id: { $ne: USER_ID } }]);
    assertPublicUser(response.body.user, state.user);
  });
}

for (const alternate of ['12345', '9000000000']) {
  test(`omitted phone keeps existing number rather than validating/using alternate ${alternate}`, async t => {
    const { state, request } = await authFixture(t);
    const newAddress = checkoutAddress(alternate);
    const response = await request('PUT', '/api/auth/profile', { newAddress });
    assertStatus(response, 200);
    assert.equal(state.user.phone, '9876543210');
    assert.deepEqual(state.user.addresses, [savedAddress, newAddress]);
    assert.deepEqual(state.lookups, []);
  });
}

for (const fallback of [false, true]) {
  const source = fallback ? 'checkout alternatePhone' : 'explicit phone';
  test(`duplicate normalized ${source} returns 409 without persisting any profile/address changes`, async t => {
    const { state, request } = await authFixture(t, { phone: undefined });
    const before = clone(state.user);
    const body = fallback ? { newAddress: checkoutAddress('+91 90000 00000') } : { phone: '+91 90000 00000', address: 'Must not save' };
    const response = await request('PUT', '/api/auth/profile', body);
    assertStatus(response, 409);
    assert.equal(response.body.success, false);
    assert.deepEqual(state.lookups, [{ phone: '9000000000', _id: { $ne: USER_ID } }]);
    assert.deepEqual(state.updates, []);
    assert.deepEqual(state.audits, []);
    assert.deepEqual(state.user, before);
  });

  for (const invalid of ['12345', '12345678901', 'letters-only', '+91']) {
    test(`invalid ${source} ${invalid} returns 400 without persisting changes`, async t => {
      const { state, request } = await authFixture(t, { phone: undefined });
      const before = clone(state.user);
      const body = fallback ? { newAddress: checkoutAddress(invalid) } : { phone: invalid, name: 'Must Not Save' };
      const response = await request('PUT', '/api/auth/profile', body);
      assertStatus(response, 400);
      assert.equal(response.body.success, false);
      assert.deepEqual(state.updates, []);
      assert.deepEqual(state.audits, []);
      assert.deepEqual(state.user, before);
    });
  }

  test(`unique-index race for ${source} maps error 11000 to 409`, async t => {
    const { state, request } = await authFixture(t, { phone: undefined });
    const before = clone(state.user);
    state.writeError = Object.assign(new Error('Simulated duplicate key'), { code: 11000 });
    const body = fallback ? { newAddress: checkoutAddress() } : { phone: '9123456780' };
    const response = await request('PUT', '/api/auth/profile', body);
    assertStatus(response, 409);
    assert.equal(state.updates.length, 1);
    assert.deepEqual(state.audits, []);
    assert.deepEqual(state.user, before);
  });
}

for (const addresses of [[checkoutAddress()], []]) {
  test(`checkout full addresses replacement ${addresses.length ? 'edits' : 'deletes'} saved addresses`, async t => {
    const { state, request } = await authFixture(t);
    const response = await request('PUT', '/api/auth/profile', { addresses });
    assertStatus(response, 200);
    assert.deepEqual(state.updates[0].update, { $set: { addresses } });
    assert.deepEqual(state.user.addresses, addresses);
    assert.equal(state.user.phone, '9876543210');
    assertPublicUser(response.body.user, state.user);
  });
}

async function tableFixture(t, options = {}) {
  const state = {
    restaurants: [
      { _id: RESTAURANT_ID, bookingEnabled: true, ...options.restaurant },
      { _id: OTHER_RESTAURANT_ID, bookingEnabled: true },
    ],
    tables: clone(options.tables || [
      { _id: TABLE_ID, restaurantId: RESTAURANT_ID, number: 7, maxGuests: 8, isActive: true },
      { _id: OTHER_TABLE_ID, restaurantId: OTHER_RESTAURANT_ID, number: 1, maxGuests: 2 },
    ]),
    events: [], insertFailures: 0, failMarker: false,
  };
  const record = (op, details = {}) => state.events.push(clone({ op, ...details }));
  const remove = id => { state.tables = state.tables.filter(table => table._id !== id); };
  const tableDocument = value => {
    const table = document(value);
    if (table) Object.defineProperty(table, 'deleteOne', { value: async () => {
      record('table.deleteOne', { id: table._id, marker: state.restaurants.find(r => r._id === table.restaurantId)?.defaultTablesSeeded });
      remove(table._id);
      return { acknowledged: true, deletedCount: 1 };
    } });
    return table;
  };
  const Restaurant = {
    findById(id) { return query(() => document(state.restaurants.find(r => r._id === id))); },
    async updateOne(filter, update) {
      record('restaurant.updateOne', { filter, update });
      if (state.failMarker) throw new Error('Simulated marker persistence failure');
      const restaurant = state.restaurants.find(r => matches(r, filter));
      if (restaurant) Object.assign(restaurant, clone(update.$set));
      return { acknowledged: true, matchedCount: restaurant ? 1 : 0 };
    },
  };
  const Table = {
    find(filter) { return query(() => state.tables.filter(table => matches(table, filter)).map(tableDocument)); },
    findOne(filter) {
      record('table.findOne', { filter });
      return query(() => tableDocument(state.tables.find(table => matches(table, filter))));
    },
    // Keep the old operation functional so an ordering regression fails on state, not on a missing mock.
    findOneAndDelete(filter) {
      record('table.findOneAndDelete', { filter });
      return query(() => {
        const table = state.tables.find(value => matches(value, filter));
        if (table) remove(table._id);
        return document(table);
      });
    },
    async countDocuments(filter) { return state.tables.filter(table => matches(table, filter)).length; },
    async insertMany(values) {
      record('table.insertMany', { values });
      if (state.insertFailures > 0) {
        state.insertFailures--;
        throw new Error('Simulated transient table insert failure');
      }
      const tables = values.map((value, index) => ({ _id: `seeded-${index + 1}`, isActive: true, ...clone(value) }));
      state.tables.push(...tables);
      return tables.map(tableDocument);
    },
  };
  const common = {
    '../models/Restaurant': Restaurant, '../models/Table': Table,
    '../models/User': forbidden('User'), '../models/Booking': { find: () => query(() => []) },
    '../utils/sendEmail': forbidden('sendEmail'),
  };
  const booking = loadRouter('booking', {
    ...common,
    '../middleware/auth': authMiddleware(() => ({ _id: USER_ID, id: USER_ID, role: 'restaurant', restaurantId: RESTAURANT_ID })),
  });
  const adminMocks = {
    ...common,
    '../middleware/auth': authMiddleware(() => ({ _id: USER_ID, id: USER_ID, role: 'admin' })),
    '../utils/generateOTP': forbidden('generateOTP'), '../utils/emailTemplates': forbidden('emailTemplates'),
  };
  for (const name of ['Food', 'Order', 'Category', 'Store', 'Product', 'Settings']) {
    adminMocks[`../models/${name}`] = forbidden(name);
  }
  const admin = loadRouter('admin', adminMocks);
  return { state, request: await serve(t, { '/api/booking': booking, '/api/admin': admin }) };
}

const availabilityPath = `/api/booking/availability/${RESTAURANT_ID}/2035-06-15`;
const insertCalls = state => state.events.filter(event => event.op === 'table.insertMany');
const deletePath = (actor, id) => actor === 'owner'
  ? `/api/booking/restaurant/tables/${id}`
  : `/api/admin/restaurants/${RESTAURANT_ID}/tables/${id}`;

for (const actor of ['owner', 'admin']) {
  test(`${actor}: deleting last table BEFORE first availability saves marker before delete and prevents reseeding`, async t => {
    const { state, request } = await tableFixture(t);
    const foreign = clone(state.tables[1]);
    const response = await request('DELETE', deletePath(actor, TABLE_ID));
    assertStatus(response, 200);
    assert.deepEqual(state.events, [
      { op: 'table.findOne', filter: { _id: TABLE_ID, restaurantId: RESTAURANT_ID } },
      { op: 'restaurant.updateOne', filter: { _id: RESTAURANT_ID }, update: { $set: { defaultTablesSeeded: true } } },
      { op: 'table.deleteOne', id: TABLE_ID, marker: true },
    ]);
    assert.equal(state.restaurants[0].defaultTablesSeeded, true);
    assert.equal(state.restaurants[1].defaultTablesSeeded, undefined);
    assert.deepEqual(state.tables, [foreign]);
    for (let attempt = 0; attempt < 2; attempt++) {
      const available = await request('GET', availabilityPath);
      assertStatus(available, 200);
      assert.deepEqual(available.body.tables, []);
    }
    assert.deepEqual(insertCalls(state), []);
    assert.deepEqual(state.tables, [foreign]);
  });

  test(`${actor}: marker persistence failure prevents deletion, and a later retry can succeed`, async t => {
    const { state, request } = await tableFixture(t);
    const before = clone({ tables: state.tables, restaurants: state.restaurants });
    state.failMarker = true;
    const response = await request('DELETE', deletePath(actor, TABLE_ID));
    assertStatus(response, 500);
    assert.deepEqual(state.tables, before.tables);
    assert.deepEqual(state.restaurants, before.restaurants);
    assert.deepEqual(state.events.map(event => event.op), ['table.findOne', 'restaurant.updateOne']);
    state.failMarker = false;
    assertStatus(await request('DELETE', deletePath(actor, TABLE_ID)), 200);
    assert.equal(state.tables.some(table => table._id === TABLE_ID), false);
    assert.equal(state.restaurants[0].defaultTablesSeeded, true);
    const available = await request('GET', availabilityPath);
    assertStatus(available, 200);
    assert.deepEqual(available.body.tables, []);
    assert.deepEqual(insertCalls(state), []);
  });

  for (const id of [OTHER_TABLE_ID, MISSING_ID]) {
    test(`${actor}: ${id === OTHER_TABLE_ID ? 'another restaurant\'s' : 'missing'} table returns 404 without touching tables or markers`, async t => {
      const { state, request } = await tableFixture(t);
      const before = clone({ tables: state.tables, restaurants: state.restaurants });
      const response = await request('DELETE', deletePath(actor, id));
      assertStatus(response, 404);
      assert.deepEqual(state.tables, before.tables);
      assert.deepEqual(state.restaurants, before.restaurants);
      assert.deepEqual(state.events, [{ op: 'table.findOne', filter: { _id: id, restaurantId: RESTAURANT_ID } }]);
    });
  }
}

test('fresh restaurant receives default tables exactly once, with customer-facing slots', async t => {
  const { state, request } = await tableFixture(t, { tables: [] });
  const response = await request('GET', availabilityPath);
  assertStatus(response, 200);
  assert.deepEqual(response.body.tables.map(({ number, maxGuests }) => ({ number, maxGuests })), [
    { number: 1, maxGuests: 4 }, { number: 2, maxGuests: 6 },
  ]);
  for (const table of response.body.tables) {
    assert.deepEqual(table.availableSlots, ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '18:00-20:00', '20:00-22:00']);
  }
  assert.equal(state.restaurants[0].defaultTablesSeeded, true);
  const again = await request('GET', availabilityPath);
  assertStatus(again, 200);
  assert.deepEqual(again.body.tables, response.body.tables);
  assert.equal(insertCalls(state).length, 1);
});

const bookingPayload = {
  restaurantId: RESTAURANT_ID, tableNumber: 7, timeSlot: '18:00-20:00', partySize: 2,
  customerName: 'E. Kumar', phone: '9123456780', date: '2035-06-15',
};

test('explicitly inactive tables stay unavailable, reject booking, and never trigger defaults', async t => {
  const { state, request } = await tableFixture(t, { tables: [
    { _id: TABLE_ID, restaurantId: RESTAURANT_ID, number: 7, maxGuests: 8, isActive: false },
  ] });
  const response = await request('GET', availabilityPath);
  assertStatus(response, 200);
  assert.deepEqual(response.body.tables, []);
  assertStatus(await request('POST', '/api/booking/customer/bookings', bookingPayload), 400);
  assert.equal(state.tables[0].isActive, false);
  assert.equal(state.restaurants[0].defaultTablesSeeded, true);
  assert.deepEqual(insertCalls(state), []);
});

test('legacy missing isActive remains available alongside active tables, unlike explicit false', async t => {
  const { state, request } = await tableFixture(t, { tables: [
    { _id: TABLE_ID, restaurantId: RESTAURANT_ID, number: 7, maxGuests: 8 },
    { _id: MISSING_ID, restaurantId: RESTAURANT_ID, number: 8, maxGuests: 4, isActive: false },
    { _id: OTHER_TABLE_ID, restaurantId: RESTAURANT_ID, number: 9, maxGuests: 2, isActive: true },
  ] });
  const response = await request('GET', availabilityPath);
  assertStatus(response, 200);
  assert.deepEqual(response.body.tables.map(table => table.number), [7, 9]);
  assert.equal(state.restaurants[0].defaultTablesSeeded, true);
  assert.deepEqual(insertCalls(state), []);
});

for (const tables of [[], [{ _id: TABLE_ID, restaurantId: RESTAURANT_ID, number: 7, maxGuests: 8, isActive: true }]]) {
  test(`disabled restaurant with ${tables.length ? 'existing' : 'no'} tables exposes no availability or seeding`, async t => {
    const { state, request } = await tableFixture(t, { restaurant: { bookingEnabled: false }, tables });
    const before = clone({ tables: state.tables, restaurants: state.restaurants });
    const response = await request('GET', availabilityPath);
    assertStatus(response, 200);
    assert.deepEqual(response.body.tables, []);
    assert.equal(response.body.bookingEnabled, false);
    assertStatus(await request('POST', '/api/booking/customer/bookings', bookingPayload), 400);
    assert.deepEqual(state.tables, before.tables);
    assert.deepEqual(state.restaurants, before.restaurants);
    assert.deepEqual(state.events, []);
  });
}

test('failed default insertion leaves marker unset and retries on next availability request', async t => {
  const { state, request } = await tableFixture(t, { tables: [] });
  state.insertFailures = 1;
  const failed = await request('GET', availabilityPath);
  assertStatus(failed, 200);
  assert.deepEqual(failed.body.tables, []);
  assert.equal(state.restaurants[0].defaultTablesSeeded, undefined);
  assert.deepEqual(state.tables, []);
  assert.equal(state.events.some(event => event.op === 'restaurant.updateOne'), false);
  const retried = await request('GET', availabilityPath);
  assertStatus(retried, 200);
  assert.deepEqual(retried.body.tables.map(table => table.number), [1, 2]);
  assert.equal(state.restaurants[0].defaultTablesSeeded, true);
  assert.equal(insertCalls(state).length, 2);
});

test('failed seeding marker is retried without duplicating already inserted defaults', async t => {
  const { state, request } = await tableFixture(t, { tables: [] });
  state.failMarker = true;
  assertStatus(await request('GET', availabilityPath), 500);
  assert.equal(state.tables.length, 2);
  assert.equal(state.restaurants[0].defaultTablesSeeded, undefined);
  state.failMarker = false;
  const response = await request('GET', availabilityPath);
  assertStatus(response, 200);
  assert.deepEqual(response.body.tables.map(table => table.number), [1, 2]);
  assert.equal(state.restaurants[0].defaultTablesSeeded, true);
  assert.equal(insertCalls(state).length, 1);
});
