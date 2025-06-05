const fs = require('fs');
const path = require('path');

const INFILE1 = path.join(__dirname, 'prompt.txt');
const INFILE2 = path.join(__dirname, 'user_input.txt');
const OUTFILE = path.join(__dirname, 'compared_result.txt');

function fileToArray(filePath) {
    try {
        const text = fs.readFileSync(filePath, 'utf8');
        return text.trim().split(/\s+/);
    } catch (err) {
        console.error(`Error reading file ${filePath}:`, err.message);
        return [];
    }
}

function countMatchingWords(array1, array2) {
    const shortestLength = Math.min(array1.length, array2.length);
    const longestLength = Math.max(array1.length, array2.length);
    let matches = 0;

    for (let i = 0; i < shortestLength; i++) {
        if (array1[i].toLowerCase() === array2[i].toLowerCase()) {
            matches++;
        }
    }

    return [matches, longestLength];
}

function writeOutput(array, filePath) {
    if (array.length === 2) {
        const result = `${array[0]}/${array[1]}`;
        try {
            fs.writeFileSync(filePath, result);
            console.log(`Successfully written to ${filePath}: ${result}`);
        } catch (err) {
            console.error(`Error writing to file ${filePath}:`, err.message);
        }
    } else {
        console.error("The array should have exactly two values.");
    }
}

function main() {
    setInterval(() => {
        const words1 = fileToArray(INFILE1);
        const words2 = fileToArray(INFILE2);

        if (words1.length > 0 || words2.length > 0) {
            const result = countMatchingWords(words1, words2);
            writeOutput(result, OUTFILE);
        }
    }, 500);
}

main();
