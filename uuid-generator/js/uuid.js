const UUID = (() => {
  function v4Bytes() {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    return b;
  }

  function v1Bytes() {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);

    const UUID_EPOCH_OFFSET = 122192928000000000n;
    const now100ns = BigInt(Date.now()) * 10000n + UUID_EPOCH_OFFSET;

    const timeLow = Number(now100ns & 0xFFFFFFFFn);
    const timeMid = Number((now100ns >> 32n) & 0xFFFFn);
    const timeHi = Number((now100ns >> 48n) & 0x0FFFn);

    b[0] = (timeLow >>> 24) & 0xff;
    b[1] = (timeLow >>> 16) & 0xff;
    b[2] = (timeLow >>> 8) & 0xff;
    b[3] = timeLow & 0xff;
    b[4] = (timeMid >>> 8) & 0xff;
    b[5] = timeMid & 0xff;
    b[6] = ((timeHi >>> 8) & 0x0f) | 0x10;
    b[7] = timeHi & 0xff;
    b[8] = (b[8] & 0x3f) | 0x80;
    b[10] = b[10] | 0x01; // multicast bit — signals random node per RFC 9562

    return b;
  }

  function v7Bytes() {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);

    const now = Date.now();
    b[0] = (now / 2 ** 40) & 0xff;
    b[1] = (now / 2 ** 32) & 0xff;
    b[2] = (now / 2 ** 24) & 0xff;
    b[3] = (now / 2 ** 16) & 0xff;
    b[4] = (now / 2 ** 8) & 0xff;
    b[5] = now & 0xff;
    b[6] = (b[6] & 0x0f) | 0x70;
    b[8] = (b[8] & 0x3f) | 0x80;

    return b;
  }

  const generators = { v1: v1Bytes, v4: v4Bytes, v7: v7Bytes };

  function format(bytes, { uppercase = false, hyphens = true } = {}) {
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    let uuid = hyphens
      ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
      : hex;
    return uppercase ? uuid.toUpperCase() : uuid;
  }

  function generate(version = 'v4', options = {}) {
    const gen = generators[version];
    if (!gen) throw new Error(`Unknown UUID version: ${version}`);
    return format(gen(), options);
  }

  async function generateBulk(version, count, options = {}) {
    const gen = generators[version];
    if (!gen) throw new Error(`Unknown UUID version: ${version}`);

    const results = [];
    const BATCH = 50;
    for (let i = 0; i < count; i += BATCH) {
      const end = Math.min(i + BATCH, count);
      for (let j = i; j < end; j++) {
        results.push(format(gen(), options));
      }
      if (i + BATCH < count) {
        await new Promise(r => requestAnimationFrame(r));
      }
    }
    return results;
  }

  return { generate, generateBulk, format };
})();
