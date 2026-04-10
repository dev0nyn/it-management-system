export default {
  '*.{ts,tsx}': [
    (files) => `bash -c 'ESLINT_USE_FLAT_CONFIG=false npx eslint --fix ${files.join(' ')}'`,
    'prettier --write',
  ],
  '*.{json,md}': ['prettier --write'],
}
