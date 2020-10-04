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
import { parse, seek } from '@/parser/parser';
import { write } from '@/writer/writer';

/* public API */

self.addEventListener( 'message', handleMessage, false );

/* internal methods */

function handleMessage({ data }) {
    const { byteArray } = data;
    let result;
    switch ( data.cmd ) {
        default:
            throw new Error( 'unknown cmd' );

        // note we return the ByteArray to restore ownership
        // to the main execution context

        case 'parse':
            self.postMessage({
                ...parse( byteArray, data.structureDefinition, data.offset ),
                byteArray
            }, [ byteArray.buffer ]);
            break;

        case 'seek':
            self.postMessage({
                offset: seek( byteArray, data.compareByteArray, data.offset ),
                byteArray
            }, [ byteArray.buffer ]);
            break;

        case 'write':
            self.postMessage({
                ...write( byteArray, data.structureDefinition, data.data, data.offset ),
            }, [ byteArray.buffer ]);
            break;
    }
}
