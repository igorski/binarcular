import { types, parse, seek, write, fileToByteArray, byteArrayToFile } from "../src/index.js";
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

// EXAMPLE 1 : file reading demo

document.querySelector( "#fileInput" ).addEventListener( "input", async event => {

    const resultArea  = document.querySelector( "#resultArea" );
    const formatJson  = json => JSON.stringify( json, ( name, val ) => typeof val === "string" ? val.replace( /\u0000/g, "" ) : val, 2 );

    // get file from input event
    const { files } = event.target;
    const file      = files[ 0 ];


    if ( !file ) return; // likely selected same file

    if ( file.type === "image/jpeg" ) {

        // EXAMPLE 1: file is JPEG image
        const { data, error } = await parse( file, jpegHeader );
        resultArea.innerText = error ? "An error has occurred during file parsing" : formatJson( data );

        // perform simple validation now we can easily read the header contents
        if ( data.startOfImageMarker === 0xffd8 && data.identifier.includes( "JFIF" )) {
            resultArea.innerText += "\n\nImage looks valid to me.";
        }
    } else {

        // EXAMPLE 2 : file is WAV audio file

        let data, error;

        // first convert file into ByteArray (let's assume we will run into an error and need to do manual scanning, see below)
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
    ({ offset, byteArray } = await seek( byteArray, headerData.dataChunkId, 0 )); // search for "data"
    if ( offset === Infinity ) {
        resultArea.innerText += "\nCould not find data block though.";
    } else {
        let dataType;
        switch ( headerData.bitsPerSample ) {
            default:
            case 16:
                dataType = "INT16";
                break;
            case 8:
                dataType = "INT8";
                break;
            case 24:
                dataType = "INT24";
                break;
            case 32:
                dataType = "FLOAT32"; // max for WAV format is 32-bit floating point
                break;
        }
        // add size of Array and endianness to this data type (RIFF is always Little Endian)
        dataType = `${dataType}[${headerData.dataChunkSize}]|LE`;

        resultArea.innerText += `\nData block definition found at index ${offset}.\n` +
        `Add the summed size of dataChunkId and dataChunkSize (8 bytes) to start reading the data from index ${offset + 8}!\n\n` +
        `As the bit depth is ${headerData.bitsPerSample} and the RIFF format is Little Endian, you should parse for the "${dataType}" data-type\n` +
        `should you wish to retrieve all audio data.\n\n`;

        // if you were interested in retrieving the audio data, you could do so like this:
        // const parsedData = await parse( byteArray, { audio: dataType }, offset + 8 );
        // console.log( parsedData.data?.audio.slice( 0, 512 ));
    }
    return {
        data: headerData,
        byteArray
    };
}

// EXAMPLE 2 : generating binary file

const downloadBtn = document.querySelector( "#downloadReplacedContentBtn" );

document.querySelector( "#generateBtn" ).addEventListener( "click", async () => {
    
    // first, we will generate a stereo file containing a 2 second sine wave
    // tuned to A, at a 44.1 kHz sample rate in 16-bit resolution
    const sampleRate     = 44100;
    const channelAmount  = 2;
    const bitsPerSample  = 16;
    const sizePerSample  = bitsPerSample / 8;
    const bytesPerSecond = sampleRate * channelAmount;

    // audio generation
    const sampleData    = new Array( bytesPerSecond * 2 /* seconds */ );
    const sampleAmount  = sampleData.length;
    const dataChunkSize = sampleAmount * sizePerSample;
    const multiplier = 2 * Math.PI * 440; // 440 Hz is A "above middle C"
    for ( let i = 0, l = dataChunkSize; i < l; i += channelAmount ) {
        // As Math.sin is in -1 to +1 range, we multiply by 32767 (max value of unsigned short) to get a 16-bit integer
        const sample = Math.round( Math.sin( multiplier * ( i / sampleRate )) * 32767 );
        // duplicate value for all audio channels (WAV files are interleaved, so each channels sample follows the other)
        for ( let c = 0; c < channelAmount; ++c ) {
            sampleData[ i + c ] = sample;
        }
    }
    let result;

    // write the audio into binary
    let audioByteArray;
    result = await write( new Uint8Array( dataChunkSize ), { sampleData: `INT16[${sampleAmount}]`}, { sampleData });
    if ( !result.error ) {
        audioByteArray = result.byteArray;
    }

    // now we have content, we can create the header for the WAV file (see description of "wavHeader" above)
    const fileHeader = {
        type: "RIFF",
        size: 44 + dataChunkSize, // 44 bytes == the size of the fileHeader
        format: "WAVE",
        formatName: "fmt ",
        formatLength: 16,
        audioFormat: 1,
        channelAmount: 2,
        sampleRate,
        bytesPerSecond,
        blockAlign: channelAmount * bitsPerSample / 8,
        bitsPerSample,
        dataChunkId: "data",
        dataChunkSize
    };

    // write the header into binary
    let headerByteArray;
    result = await write( new Uint8Array( 44 ), wavHeader, fileHeader );
    if ( !result.error ) {
        headerByteArray = result.byteArray;
    }

    downloadBtn.classList.remove( "hidden" );
    downloadBtn.onclick = e => {
        // combine the binary header data with the binary sine wave
        const replacedWavFile = new Uint8Array( headerByteArray.length + audioByteArray.length );
        replacedWavFile.set( headerByteArray );
        replacedWavFile.set( audioByteArray, headerByteArray.length );
        byteArrayToFile( replacedWavFile, "generated-wave-file.wav", "audio/wav" );
    };
});
