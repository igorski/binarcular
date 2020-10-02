/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2020 Igor Zinken https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 import { types as dataTypes, getSizeForStructure } from '@/definitions/types';
 import Parser from '@/workers/parser.worker';

 export const types = dataTypes; // expose to the public

/**
 * Whether the environment supports use of binarcular
 * Note that for 64-bit usage there are additional requirements
 */
export function isSupported( use64bit = false, scope = window ) {
    if ( use64bit && typeof scope.BigInt !== 'function' ) {
        return false;
    }
    return [
        'FileReader', 'atob', 'Uint8Array', 'DataView'
    ].every( fn => typeof scope[fn] === 'function' );
};

/**
 * Parse binary file and map the data starting from the given offset to an Object
 * with given structure. The data is read for as long as there is data available in
 * the byteArray and the structure hasn't been filled yet.
 *
 * This method returns a structure containing:
 * a data Object which is a filled data structure
 * a numerical end offset which indicates at what offset in given file the
 * structure's definition has ended. This can be used for subsequent read operations
 * where binary data is retrieved.
 * a boolean indicating whether an error occured during parsing.
 * a reference to the ByteArray used for reading. If input was Uint8Array, the
 * calling context must update its reference with the returned byteArray as
 * buffer ownership had been transferred to the Worker.
 *
 * @param {Uint8Array|File|String} input either byte array, file or base64 String
 * @param {Object} structure key/values where key is the target name of the
 *                 property and the value is one of the enumerated types listed above.
 * @param {Number=} offset to read from, optional and defaults to 0
 * @return {{
 *     data: Object,
 *     end: Number,
 *     error: Boolean,
 *     byteArray: Uint8Array
 * }}
 */
export async function parse( input, structureDefinition = {}, offset = 0 ) {
    let byteArray = input;
    try {
        if ( typeof input === 'string' ) {
            // convert base64 into byteArray
            byteArray = Uint8Array.from( window.atob( input.split( 'base64,' ).pop()), c => c.charCodeAt( 0 ));
        } else if ( input instanceof File ) {
            byteArray = await fileToByteArray(
                input, offset, getSizeForStructure( structureDefinition )
            );
        }
    } catch {
        // I/O conversion Error, handled below
    }

    if ( !( byteArray instanceof Uint8Array )) {
        throw new Error( `input should be either String, File or Uint8Array got ${typeof input} instead` );
    }

    return new Promise(( resolve, reject ) => {
        invokeWorker( resolve, reject, {
            cmd: 'parse',
            byteArray,
            structureDefinition,
            offset,
        }, [ byteArray.buffer ]);
    });
};

/**
 * Scan given ByteArray until bytes matching given stringOrByteArray are found,
 * starting from given offset (default to 0 for start of file).
 * Returns the offset at which content was found.
 */
export async function seek( byteArray, stringOrByteArray, offset = 0 ) {
    const compareByteArray = ( typeof stringOrByteArray === 'string' ) ?
        // transform String to bytes
        new Uint8Array( stringOrByteArray.split( '' ).map( c => c.charCodeAt( 0 )))
    : stringOrByteArray;

    return new Promise(( resolve, reject ) => {
        invokeWorker( resolve, reject, {
            cmd: 'seek',
            byteArray,
            compareByteArray,
            offset,
        }, [ byteArray.buffer ]);
    });
}

/**
 * Converts given File to a ByteArray of requested size
 */
export async function fileToByteArray( fileReference, offset = 0, size = fileReference.size ) {
    const reader = new FileReader();
    return new Promise(( resolve, reject ) => {
        reader.onload = ({ target }) => {
            resolve( new Uint8Array( target.result ));
        }
        reader.onerror = reject;
        reader.readAsArrayBuffer( fileReference.slice( offset, Math.min( fileReference.size, offset + size )));
    });
}

/* internal methods */

function invokeWorker( resolve, reject, params, optTransferables ) {
    const worker = new Parser();
    worker.onmessage = ({ data }) => {
        resolve( data );
        worker.terminate();
    };
    worker.onerror = error => {
        reject( error );
        worker.terminate();
    };
    worker.postMessage( params, optTransferables );
}
