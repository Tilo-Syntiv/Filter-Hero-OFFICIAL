const SIZE_KEY = "fh-quote-size";
const MESSAGE_KEY = "fh-quote-message";
const CART_KEY = "fh-quote-cart";

export type QuoteHandoff = {
  size?: string;
  message?: string;
  cart?: string;
};

function read(key: string) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function write(key: string, value: string | undefined) {
  try {
    if (value) sessionStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function clear(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function stashQuoteHandoff(opts: QuoteHandoff) {
  write(SIZE_KEY, opts.size);
  write(MESSAGE_KEY, opts.message);
  write(CART_KEY, opts.cart);
}

export function takeQuoteHandoff(): QuoteHandoff {
  const size = read(SIZE_KEY);
  const message = read(MESSAGE_KEY);
  const cart = read(CART_KEY);
  clear(SIZE_KEY);
  clear(MESSAGE_KEY);
  clear(CART_KEY);
  return {
    ...(size ? { size } : {}),
    ...(message ? { message } : {}),
    ...(cart ? { cart } : {}),
  };
}
