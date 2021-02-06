const sleep = (ms: number) =>
  new Promise((res) => setTimeout(() => res(true), ms));
