import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/glasnostic-api.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
    sourcemap: true
  },
  external: [
    'got',
    'tough-cookie',
    'lodash'
  ],
  plugins: [typescript({
    declaration: true,
    declarationDir: 'dist/',
    rootDir: 'src/'
  })]
};
