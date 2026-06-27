import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('package metadata', () => {
    it('does not require react-bootstrap and documents UI-kit agnostic canvas', () => {
        const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
            version?: string;
            peerDependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
            keywords?: string[];
            description?: string;
        };

        expect(pkg.version).toBe('0.2.0');
        expect(pkg.peerDependencies?.['react-bootstrap']).toBeUndefined();
        expect(pkg.devDependencies?.['react-bootstrap']).toBeUndefined();
        expect(pkg.keywords?.some((k) => /bootstrap/i.test(k))).toBe(false);
        expect(pkg.description?.toLowerCase()).toContain('ui-kit agnostic');
    });
});
