import esbuild from 'esbuild'
import { cp, mkdir, rm } from 'node:fs/promises'

const watch = process.argv.includes('--watch')

const nodeCommon = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  sourcemap: true,
  logLevel: 'info',
}

const rendererCommon = {
  bundle: true,
  platform: 'browser',
  target: 'es2022',
  format: 'iife',
  sourcemap: true,
  logLevel: 'info',
}

async function ensureDirs() {
  await rm('dist', { recursive: true, force: true })
  await mkdir('dist/main', { recursive: true })
  await mkdir('dist/preload', { recursive: true })
  await mkdir('dist/renderer/pet', { recursive: true })
  await mkdir('dist/renderer/control', { recursive: true })
}

async function copyStatic() {
  await cp('src/renderer/pet/index.html', 'dist/renderer/pet/index.html')
  await cp('src/renderer/pet/styles.css', 'dist/renderer/pet/styles.css')
  await cp('src/renderer/control/index.html', 'dist/renderer/control/index.html')
  await cp('src/renderer/control/styles.css', 'dist/renderer/control/styles.css')
  await cp('assets', 'dist/assets', { recursive: true })
}

async function buildAll() {
  await ensureDirs()

  const targets = [
    { ...nodeCommon, entryPoints: ['src/main/index.ts'], outfile: 'dist/main/index.cjs' },
    { ...nodeCommon, entryPoints: ['src/preload/pet.ts'], outfile: 'dist/preload/pet.cjs' },
    { ...nodeCommon, entryPoints: ['src/preload/control.ts'], outfile: 'dist/preload/control.cjs' },
    {
      ...rendererCommon,
      entryPoints: ['src/renderer/pet/index.ts'],
      outfile: 'dist/renderer/pet/index.js',
    },
    {
      ...rendererCommon,
      entryPoints: ['src/renderer/control/index.ts'],
      outfile: 'dist/renderer/control/index.js',
    },
  ]

  if (watch) {
    const contexts = await Promise.all(targets.map((t) => esbuild.context(t)))
    await Promise.all(contexts.map((c) => c.watch()))
    await copyStatic()
    console.log('[esbuild] watching…')
    await new Promise(() => {})
  } else {
    await Promise.all(targets.map((t) => esbuild.build(t)))
    await copyStatic()
    console.log('[esbuild] built')
  }
}

buildAll().catch((err) => {
  console.error(err)
  process.exit(1)
})
