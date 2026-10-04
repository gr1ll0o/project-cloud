import fs from "node:fs";

fs.writeFile('data1.txt', 'Hola mundo!', (error) => {
    if (error) console.log(error);
});