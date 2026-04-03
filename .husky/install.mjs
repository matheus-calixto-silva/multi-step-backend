if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
  process.exit(0);
}

try {
  const { default: husky } = await import('husky');
  husky();
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') {
    throw error;
  }
}
