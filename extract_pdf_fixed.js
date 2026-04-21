const fs = require('fs');
const pdf = require('./node_modules/pdf-parse/dist/pdf-parse/cjs/index.cjs');

let dataBuffer = fs.readFileSync('docccccc.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text.substring(0, 500));
}).catch(err => {
    console.error(err);
});
