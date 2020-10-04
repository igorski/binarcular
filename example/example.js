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

// cached DOM elements

const resultArea  = document.querySelector( "#resultArea" );
const replaceBtn  = document.querySelector( "#replaceContentBtn" );
const downloadBtn = document.querySelector( "#downloadReplacedContentBtn" );

// convenience methods

const formatJson  = json => JSON.stringify( json, ( name, val ) => typeof val === "string" ? val.replace( /\u0000/g, "" ) : val, 2 );

// attach listener to file input and show actual demo !

document.querySelector( "#fileInput" ).addEventListener( "input", async event => {

    // reset UI
    [ replaceBtn, downloadBtn ].forEach( btn => {
        btn.classList.add( "hidden" );
        btn.onclick = null;
    })

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
        `if you wish to retrieve all audio data.\n\n` +
        `Now we know the location of the data block, we can inject our own content. How about we replace everything with a sine wave?`;

        replaceBtn.classList.remove( "hidden" );
        replaceBtn.onclick = async e => await replaceAudioBlock( byteArray, headerData, offset );

        // if you were interested in retrieving the audio data, you could do so like this:
        // const parsedData = await parse( byteArray, { audio: dataType }, offset + 8 );
        // console.log( parsedData.data?.audio.slice( 0, 512 ));
    }
    return {
        data: headerData,
        byteArray
    };
}

async function replaceAudioBlock( wavFileByteArray, headerData, dataChunkIdOffset ) {
    let result;

    // add size of dataChunkId and dataChunkSize to determine where the audio should be written
    const offsetToInject = dataChunkIdOffset + 8;

    // now we know where the audio sections begins, separate the header data
    let header = wavFileByteArray.slice( 0, offsetToInject );

    // generate a 2 second sine wave tuned to A
    const { sampleRate, channelAmount } = headerData;
    const sizePerSample  = 2; // we will be rendering in 16-bit resolution (16-bits == 2 bytes)
    const bytesPerSecond = sampleRate * channelAmount;

    const sampleData   = new Array( bytesPerSecond * 2 /* seconds */ );
    const sampleAmount = sampleData.length;

    // audio generation
    const multiplier = 2 * Math.PI * 440; // 440 Hz is A "above middle C"
    for ( let i = 0, l = sampleAmount * sizePerSample; i < l; i += channelAmount ) {
        // As Math.sin is in -1 to +1 range, we multiply by 32767 (max value of unsigned short) to get a 16-bit integer
        const sample = Math.round( Math.sin( multiplier * ( i / sampleRate )) * 32767 );
        // duplicate value for all audio channels (WAV files are interleaved, so each channels sample follows the other)
        for ( let c = 0; c < channelAmount; ++c ) {
            sampleData[ i + c ] = sample;
        }
    }

    // hang on, was the WAV file 16-bit to begin with ?

    if ( headerData.bytesPerSecond !== bytesPerSecond || headerData.bitsPerSample !== 16 || headerData.blockAlign !== sizePerSample ) {
        // guess not... at least it's nice we could read those values using Numbrs! Well, we'll just update the existing value
        // we subtract 8 bytes from the dataChunkIdOffset as that is were the declaration for
        // bytesPerSecond is (bitsPerSample and blockAlign are both int16, whereas bytesPerSecond is int32, thus 8 bytes total)
        result = await write( header,
            { bytesPerSecond: INT32, blockAlign: INT16, bitsPerSample: INT16 },
            { bytesPerSecond, blockAlign: ( 16 * sizePerSample ) / 8, bitsPerSample: 16 },
            dataChunkIdOffset - 8
        );
        if ( !result.error ) {
            header = result.byteArray;
        }
    }

    // update the header to reflect the new dataChunkSize
    // we add 4 bytes to the dataChunkIdOffset as that is where the declaration of the dataChunkSize is (dataChunkId is CHAR[4], thus 4 bytes)
    result = await write( header, { dataChunkSize: INT32 }, { dataChunkSize: sampleAmount * sizePerSample }, dataChunkIdOffset + 4 );
    if ( !result.error ) {
        header = result.byteArray;
    }

    // convert the sine wave to binary

    let audioByteArray;
    result = await write( new Uint8Array( sampleAmount * sizePerSample ), { sampleData: `INT16[${sampleAmount}]`}, { sampleData });
    if ( !result.error ) {
        audioByteArray = result.byteArray;
    }

    downloadBtn.classList.remove( "hidden" );
    downloadBtn.onclick = e => {
        // combine the binary header data with the binary sine wave
        const replacedWavFile = new Uint8Array( header.length + audioByteArray.length );
        replacedWavFile.set( header );
        replacedWavFile.set( audioByteArray, header.length );
        byteArrayToFile( replacedWavFile, "generated-wave-file.wav", "audio/wav" );
    };
}
