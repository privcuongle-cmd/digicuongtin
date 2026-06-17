export const generateId = (prefix: string, items: { id: string }[]) => {
  const ids = (items || [])
    .map(item => item.id)
    .filter(id => id && id.startsWith(prefix))
    .map(id => {
      const numPart = id.replace(prefix, '');
      return parseInt(numPart, 10);
    })
    .filter(num => !isNaN(num));
  
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return `${prefix}${(maxId + 1).toString().padStart(4, '0')}`;
};

export const resolveIdCollision = (proposedId: string, existingIds: string[]): string => {
  const existingSet = new Set((existingIds || []).map(id => id.trim().toUpperCase()));
  const currentId = proposedId.trim();
  
  if (!existingSet.has(currentId.toUpperCase())) {
    return currentId;
  }
  
  // Match prefix and numeric part, e.g. HDN0010 -> "HDN" and "0010"
  const match = currentId.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) {
    let counter = 1;
    while (existingSet.has(`${currentId}_${counter}`.toUpperCase())) {
      counter++;
    }
    return `${currentId}_${counter}`;
  }
  
  const prefix = match[1];
  const numStr = match[2];
  let num = parseInt(numStr, 10);
  const padLength = numStr.length;
  
  while (existingSet.has(`${prefix}${num.toString().padStart(padLength, '0')}`.toUpperCase())) {
    num++;
  }
  
  return `${prefix}${num.toString().padStart(padLength, '0')}`;
};

