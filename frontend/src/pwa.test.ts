import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const publicDir = resolve(process.cwd(), 'public');

describe('PWA shell assets', () => {
  it('defines an installable manifest with required icons', () => {
    const manifestPath = resolve(publicDir, 'manifest.webmanifest');
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      name?: string;
      start_url?: string;
      display?: string;
      icons?: { src: string; sizes: string; type: string }[];
    };

    expect(manifest.name).toBe('Amani Circle');
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons?.some((icon) => icon.sizes === '192x192' && icon.type === 'image/png')).toBe(true);
    expect(manifest.icons?.some((icon) => icon.sizes === '512x512' && icon.type === 'image/png')).toBe(true);
  });

  it('caches only static shell assets and avoids API response caching', () => {
    const serviceWorker = readFileSync(resolve(publicDir, 'sw.js'), 'utf-8');

    expect(serviceWorker).toContain('offline.html');
    expect(serviceWorker).toContain('isStaticShellRequest');
    expect(serviceWorker).toContain("pathname.startsWith('/api/')");
    expect(serviceWorker).toContain("pathname.startsWith('/auth/')");
    expect(serviceWorker).toContain("pathname.startsWith('/public/')");
  });
});
