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
