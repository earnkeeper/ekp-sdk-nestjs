export function documents(type) {
  return `${path(type)}.*`;
}

export function path(type) {
  return `$.${collection(type)}`;
}

export function collection(type) {
  return type.name;
}
