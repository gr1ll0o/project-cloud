import fs from 'node:fs';

fs.writeFile('data1.txt', 'Hola mundo!', (error:any) => {
    if (error) console.log(error);
});