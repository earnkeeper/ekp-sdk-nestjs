export function getMethodName(data: string) {
  if (!data || data.length < 10) {
    return data;
  }
  const methodId = data.substring(0, 10).toLowerCase();

  switch (methodId) {
    case '0xfa77983e':
      return 'mintNft (pancake)';
    case '0xfd825f58':
      return 'createProfile (pancake)';
    case '0xab834bab':
      return 'atomicMatch (opensea)';
    default:
      return methodId;
  }
}
