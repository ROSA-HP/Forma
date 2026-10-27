import { describe, it } from 'node:test';
import assert from 'node:assert';
import { en } from '../i18n/en.ts';
import { ar } from '../i18n/ar.ts';

describe('i18n translations completeness', () => {
  it('ar.ts must not be missing any translation key present in en.ts', () => {
    const enKeys = Object.keys(en) as Array<keyof typeof en>;
    const arKeys = new Set(Object.keys(ar));

    const missingKeys: string[] = [];
    for (const key of enKeys) {
      if (!arKeys.has(key) || (ar as Record<string, unknown>)[key] === undefined) {
        missingKeys.push(key);
      }
    }

    assert.strictEqual(
      missingKeys.length,
      0,
      `Arabic translations (ar.ts) is missing keys: ${missingKeys.join(', ')}`
    );
  });

  it('no translation key in en.ts or ar.ts should be empty string', () => {
    for (const [key, val] of Object.entries(en)) {
      assert.ok(val && typeof val === 'string' && val.trim().length > 0, `en.${key} is empty`);
    }
    for (const [key, val] of Object.entries(ar)) {
      assert.ok(val && typeof val === 'string' && val.trim().length > 0, `ar.${key} is empty`);
    }
  });
});
