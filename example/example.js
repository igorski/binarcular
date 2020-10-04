import { types, parse, seek, fileToByteArray } from "../src/index.js";
const { CHAR, INT8, INT16, INT32 } = types;

// header for JPEG files (see https://en.wikipedia.org/wiki/JPEG_File_Interchange_Format)
// note Big Endianness being enforced as it is part of the JPEG spec.

const jpegHeader = {
    startOfImageMarker:   `${INT16}|BE`, // should be 0xffd8
    applicationUseMarker: `${INT16}|BE`, // should be 0xffe0
    length:               INT16,
    identifier:           `${CHAR}[5]`,  // should be "JFIF" with a null byte terminator
    version:              `${INT8}[2]`,  // first byte major, seocond minor version
    densityUnits:         INT8,
    xDensity:             `${INT16}|BE`,
    yDensity:             `${INT16}|BE`,
    xThumbnail:           INT8,
    yThumbnail:           INT8
};

// header for WAV files (see http://soundfile.sapp.org/doc/WaveFormat)

const wavHeader = {
    type:             `${CHAR}[4]`, // should be "RIFF"
    size:             INT32,
    format:           `${CHAR}[4]`, // should be "WAVE"
    formatName:       `${CHAR}[4]`, // should be "fmt " (note empty char!) but can be "JUNK"
    formatLength:     INT32,
    audioFormat:      INT16,
    channelAmount:    INT16,
    sampleRate:       INT32,
    bytesPerSecond:   INT32,
    blockAlign:       INT16,
    bitsPerSample:    INT16,
    dataChunkId:      `${CHAR}[4]`, // should be "data"
    dataChunkSize:    INT32
};

// cached DOM elements and convenience methods

const resultArea = document.querySelector( "#resultArea" );
const formatJson = json => JSON.stringify( json, ( name, val ) => typeof val === "string" ? val.replace( /\u0000/g, "" ) : val, 2 );

// attach listener to file input and actual demo !

document.querySelector( "#fileInput" ).addEventListener( "input", async event => {
    // get file from input event
    const { files } = event.target;
    const file      = files[ 0 ];

    if ( !file ) return; // likely selected same file

    if ( file.type === "image/jpeg" ) {
        // EXAMPLE 1: file is JPEG image
        const { data, error } = await parse( file, jpegHeader );
        resultArea.innerText = error ? "An error has occurred during file parsing" : formatJson( data );
        // simple validation
        if ( data.startOfImageMarker === 0xffd8 && data.identifier.includes( "JFIF" )) {
            resultArea.innerText += "\n\nImage looks valid to me.";
        }
    } else {
        let data, error;

        // EXAMPLE 2 : file is WAV audio file
        // first convert file into ByteArray (let"s assume we will run into an error and need to do manual scanning, see below)
        let byteArray = await fileToByteArray( file );

        // NOTE: when passing around a byteArray you should always update its reference
        // to match the object returned by the parse and scan methods

        ({ data, error, byteArray } = await parse( byteArray, wavHeader ));
        resultArea.innerText = error ? "An error has occurred during file parsing" : formatJson( data );

        // EXAMPLE 2.1 format not found. most likely file contains metadata which deviates from the WAV spec

        if ( ! data.formatName?.includes( "fmt" )) {
            ({ data, byteArray } = await attemptWavCorrection( byteArray, data ));
            if ( !data ) return; // file is properly broken
            resultArea.innerText = formatJson( data ); // update existing view content
        }

        // simple validation
        if ( data.type === "RIFF" && data.format === "WAVE" && data.dataChunkId === "data" ) {
            resultArea.innerText += "\n\nWave looks valid to me.";
        }

        // EXAMPLE 2.2 show how further data can be read
        ({ data, byteArray } = await findWavAudioBlock( byteArray, data ));
    }
});

/* "advanced" examples */

async function attemptWavCorrection( byteArray, headerData ) {
    // try to find the "fmt " declaration within the ByteArray
    let offset;
    ({ offset, byteArray } = await seek( byteArray, "fmt " ));
    if ( offset === Infinity ) {
        resultArea.innerText = "Could not find valid format declaration in WAV file. File is corrupted";
        return {};
    }
    // attempt to read the parts of the header that failed to be read (this could be done more neatly, but you get the point...)
    const halfWavHeader = {
        formatName:       `${CHAR}[4]`, // should be "fmt " (note empty char!) but can be "JUNK"
        formatLength:     INT32,
        audioFormat:      INT16,
        channelAmount:    INT16,
        sampleRate:       INT32,
        bytesPerSecond:   INT32,
        blockAlign:       INT16,
        bitsPerSample:    INT16,
        dataChunkId:      `${CHAR}[4]`, // should be "data"
        dataChunkSize:    INT32
    };
    const secondAttempt = await parse( byteArray, halfWavHeader, offset );
    if ( secondAttempt.error ) {
        resultArea.innerText = "An error occurred during reattempted file parsing.";
        return;
    }
    // combine the separate headers into the "fixed" one
    return {
        data: { ...headerData, ...secondAttempt.data },
        byteArray: secondAttempt.byteArray
    };
}

async function findWavAudioBlock( byteArray, headerData ) {
    let offset;
    ({ offset, byteArray } = await seek( byteArray, headerData.dataChunkId, 0 ));
    if ( offset === Infinity ) {
        resultArea.innerText += "\nCould not find data block though.";
    } else {
        let dataType;
        switch ( headerData.bitsPerSample ) {
            default:
                dataType = "FLOAT32"; // max 32-bit floating point
                break;
            case 16:
                dataType = "INT16";
                break;
            case 24:
                dataType = "INT24";
                break;
        }
        // add size of Array and endianness to this data type (RIFF is always Little Endian)
        dataType = `${dataType}[${headerData.dataChunkSize}]|LE`;

        resultArea.innerText += `\nData block definition found at index ${offset}.\n` +
        `Add the summed size of dataChunkId and dataChunkSize (8 bytes) to start reading the data from index ${offset + 8}!\n` +
        `As the bit depth is ${headerData.bitsPerSample} and the RIFF format is Little Endian, you should parse for the "${dataType}" data-type.`;

        // if you were interested in retrieving the audio data, you could do so like this:
        // const parsedData = await parse( byteArray, { audio: dataType }, offset + 8 );
        // console.log( parsedData.data?.audio.slice( 0, 512 ));
    }
    return {
        data: headerData,
        byteArray
    };
}
