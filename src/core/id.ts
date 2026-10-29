let counter = 0;

/** 短、唯一、对序列化友好的节点 id */
export function uid(prefix = 'n'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
