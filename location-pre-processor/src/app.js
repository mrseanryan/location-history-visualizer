let fs = require('fs');

console.log('Google location data pre-processor');

if (process.argv.length !== 4) {
    console.log("Usage: node src\\index.js {path to location JSON file} {path to output JSON file}");
    process.exit(-1);
}

let inFilePath = process.argv[2];
let outFilePath = process.argv[3];
fs.readFile(inFilePath, 'utf8', function (err, contents) {
    let data = JSON.parse(contents);
    console.log(`${data.locations.length} locations found`);

    processLocations(data.locations);
});

let processLocations = (locations) => {
    const TARGET_FILE_SIZE_KB = 500;
    const TEST_FILE_SIZE_KB = 170000;
    const TEST_FILE_SIZE_COUNT = 661000;
    const TARGET_MAX_COUNT = Math.ceil(TEST_FILE_SIZE_COUNT * TARGET_FILE_SIZE_KB / TEST_FILE_SIZE_KB);

    console.log(`max points for a file of ${TARGET_FILE_SIZE_KB}Kb: ${TARGET_MAX_COUNT}`);

    let everyNthItem = Math.ceil(TEST_FILE_SIZE_COUNT / TARGET_MAX_COUNT);

    if (locations.length <= TARGET_MAX_COUNT) {
        everyNthItem = 1;
    }

    console.log(`sampling every ${everyNthItem}th item...`);

    //TODO a smarter approach would be to make N averages
    let i = 0;

    var outFile = fs.createWriteStream(outFilePath, {
    })

    outputTextToFile(outFile, '{ "locations" : [ ');
    let locationsWritten = 0;
    while(i < locations.length) {
        outputLocation(outFile, locations[i], locationsWritten === 0);

        i += everyNthItem;
        locationsWritten++;
    }
    outputTextToFile(outFile, '] }');

    console.log(`${locationsWritten} locations written to file ${outFilePath}`);
};

let outputTextToFile = (outFile, text) => {
    outFile.write(text);
};  

let outputLocation = (outFile, location, isFirst) => {
    let text = '';
    
    if (!isFirst) {
        text += ',';
    }

    text += JSON.stringify(location);

    outputTextToFile(outFile, text);
};
