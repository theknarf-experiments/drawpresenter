export default new Proxy({}, { get: () => () => {} });
export const readFile = () => {};
export const writeFile = () => {};
export const promises = new Proxy({}, { get: () => () => {} });
