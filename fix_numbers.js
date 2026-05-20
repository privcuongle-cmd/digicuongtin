const fs = require('fs');
const file = 'src/context/AppContext.tsx';
let content = fs.readFileSync(file, 'utf8');

// First add parseFormattedNumber to imports
if (!content.includes('parseFormattedNumber')) {
  // It should be imported from '../lib/utils'
  content = content.replace(
    "import { formatDateTime, padPhone, formatSnForDb, parseSnFromDb } from '../lib/utils';",
    "import { formatDateTime, padPhone, formatSnForDb, parseSnFromDb, parseFormattedNumber } from '../lib/utils';"
  );
  if (!content.includes('parseFormattedNumber')) {
    // try slightly different formats
    content = content.replace(
      "import { formatDateTime, padPhone",
      "import { formatDateTime, padPhone, parseFormattedNumber"
    );
  }
}

// Now replace all Number(x) || 0 for money fields
// We can use a regex to match Number(xxx) || 0
content = content.replace(/Number\((p\.salePrice)\) \|\| 0/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((p\.costPrice)\) \|\| 0/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((d\.price \|\| d\.Price \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((d\.importPriceTotal \|\| d\.ImportPriceTotal \|\|[^)]+)\)/g, 'parseFormattedNumber($1)');

content = content.replace(/Number\((inv\.finalAmount \|\| inv\.total \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((inv\.paidAmount \|\| inv\.paid \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((inv\.debt)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((inv\.oldDebt)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((inv\.totalDebt)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((inv\.discount \|\| 0)\)/g, 'parseFormattedNumber($1)');

content = content.replace(/Number\((ret\.totalGoods \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((ret\.discount \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((ret\.totalAmount \|\| ret\.totalRefund \|\| ret\.total \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((ret\.paidAmount \|\| ret\.paid \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((ret\.receivedAmount \|\| ret\.received \|\| 0)\)/g, 'parseFormattedNumber($1)');

content = content.replace(/Number\((c\.totalSpent)\) \|\| 0/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((c\.debt)\) \|\| 0/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((s\.debt)\) \|\| 0/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((s\.importPrice)\) \|\| 0/g, 'parseFormattedNumber($1)');

content = content.replace(/Number\((imp\.totalAmount \|\| imp\.total \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((imp\.paidAmount \|\| imp\.paid \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((imp\.debt)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((imp\.discount \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((imp\.returnCost \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((imp\.shippingFee \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((imp\.otherCost \|\| 0)\)/g, 'parseFormattedNumber($1)');

content = content.replace(/Number\((c\.amount \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((m\.cost \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((t\.repairCost \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((t\.shippingCost \|\| t\.shippingcost \|\| 0)\)/g, 'parseFormattedNumber($1)');
content = content.replace(/Number\((w\.balance \|\| 0)\)/g, 'parseFormattedNumber($1)');

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced numbers successfully.')
