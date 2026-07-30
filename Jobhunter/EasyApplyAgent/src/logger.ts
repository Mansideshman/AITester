function timestamp() {
  return new Date().toISOString().split('T')[1].replace('Z', '');
}

export const log = {
  info: (msg: string) => console.log(`[${timestamp()}] ${msg}`),
  warn: (msg: string) => console.warn(`[${timestamp()}] ⚠ ${msg}`),
  error: (msg: string) => console.error(`[${timestamp()}] ✖ ${msg}`),
  success: (msg: string) => console.log(`[${timestamp()}] ✔ ${msg}`),
};
