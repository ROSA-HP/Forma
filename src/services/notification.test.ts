import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getStableNotificationId,
  REST_TIMER_NOTIFICATION_ID,
  ROUND_TIMER_NOTIFICATION_ID,
} from './notification.ts';

test('notifications: reminder ids are deterministic for the same schedule and weekday', () => {
  const a = getStableNotificationId('schedule-abc', 3);
  const b = getStableNotificationId('schedule-abc', 3);
  assert.equal(a, b, 'rescheduled reminders must reuse the same id so they replace, not duplicate');
});

test('notifications: every selected weekday gets its own id for a schedule', () => {
  const ids = new Set<number>();
  for (let day = 0; day < 7; day++) {
    ids.add(getStableNotificationId('schedule-weekly', day));
  }
  assert.equal(ids.size, 7, 'one notification per weekday must not overwrite the others');
});

test('notifications: different schedules map to different ids', () => {
  const ids = new Set<number>();
  for (let i = 0; i < 200; i++) {
    ids.add(getStableNotificationId(`schedule-${i}`, 0));
  }
  assert.equal(ids.size, 200);
});

test('notifications: generated ids are positive 32-bit integers', () => {
  for (const id of [
    getStableNotificationId('a', 0),
    getStableNotificationId('a very long schedule identifier', 6),
    getStableNotificationId('', 3),
  ]) {
    assert.ok(Number.isInteger(id), 'Capacitor requires an integer id');
    assert.ok(id > 0 && id < 2 ** 31, 'Capacitor requires a positive 32-bit int');
  }
});

test('notifications: reminder ids never collide with the reserved timer ids', () => {
  const reserved = new Set([REST_TIMER_NOTIFICATION_ID, ROUND_TIMER_NOTIFICATION_ID]);
  const generated: number[] = [];
  for (let i = 0; i < 5000; i++) {
    for (let day = 0; day < 7; day++) {
      generated.push(getStableNotificationId(`schedule-${i}`, day));
    }
  }
  const collisions = generated.filter((id) => reserved.has(id));
  assert.deepEqual(
    collisions,
    [],
    'a reminder id must never equal the rest/round timer id, or scheduling a timer would cancel the reminder'
  );
});
