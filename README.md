# typed-file-parser

A small library that allows you to read the contents of a binary file into an
Object structure, doing all the nasty type conversion for you.

A practical use case being validating whether a file header contains all the
appropriate fields and values. Or a more advanced use case being parsing meta
data from a file to determine where the meaningful data is stored.

## Compatibility

_typed-file-parser_ should work fine on Internet Explorer 10 and up. You can
test for this by querying the result of the _isSupported()_-method:

```
import { isSupported } from 'typed-file-parser';
if ( isSupported() ) {
    ...do stuff!
} else {
    ...do other, less cool stuff!
}
```

NOTE: if you require support for 64-bit types there are [additional requirements](https://caniuse.com/?search=bigint).
Pass boolean _true_ to _isSupported()_ to determine whether the environment supports 64-bit conversion.

## Installation

You can get it via NPM:

```
npm install typed-file-parser
```

### Project integration

The parser is compatible with CommonJS, ES6 modules, AMD/RequireJS or can be included in a document via script tags.
See the contents of the _/dist/_ folder and include as your project sees fit.

## Build instructions

The project dependencies are maintained by NPM, you can resolve them using:

```
npm install
```

When using CommonJS or ES6 modules for your project, it is recommended to require/import the source code directly.
However, the project can also be built directly for the browser using a simple NPM task:

```
npm run build
```

After which a folder dist/ is created which contains the prebuilt AMD/RequireJS library as well as a script that can be included directly in a document.
The source code is transpiled to ES5 for maximum browser compatibility.

## Unit testing

Unit tests are run via jest, you can run the tests by running:

```
npm run test
```

Unit tests go in the ./test-folder. The file name for a unit test must be equal to the file it is testing, but contain the suffix ".spec", e.g. functions.js should have a test file functions.spec.js.

## Defining a structure

Defining a structure is nothing more than declaring an Object where the keys
define a name meaningful to your purpose and the value is a String describing:

* one of the available type enumerations (note the imported key and its value are equal)
* optional Array declaration by adding a numerical value between brackets (_[n]_) the
  value will be an array of given length _n_
* optional pipeline separator modifier defining the endianness of the file's byte order
  (either _|BE_ for Big Endian or _|LE_ for Little Endian). When unspecified, the
  endianness of the clients system is used (assuming the file has been encoded on/by a similar
  system, which usually means Little Endian these days).

An example structure that defines the header of a .WAV file (see http://soundfile.sapp.org/doc/WaveFormat)
would look like:

```
const wavHeader = {
    type:           'CHAR[4]',
    size:           'INT32',
    format:         'CHAR[4]',
    formatName:     'CHAR[4]',
    formatLength:   'INT32',
    audioFormat:    'INT16',
    channelAmount:  'INT16',
    sampleRate:     'INT32',
    bytesPerSecond: 'INT32',
    blockAlign:     'INT16',
    bitsPerSample:  'INT16',
    dataChunkId:    'CHAR[4]',
    dataChunkSize:  'INT32'
};
```

Note that the order of the keys (and more importantly: their type definition) should match
the order of the values as described the particular file's type!

All available data types are listed in the _{ types }_ export. Note that definitions
for _CHAR_ will return as a String. If you want an 8-bit integer/byte value, use
_BYTE_ or _INT8_ instead.

## Reading a chunk of data into an Object of a specific structure type

There are three different methods with which you can supply binary data for parsing:

* _parseFile_ when file data is a reference to a File on the clients machine (async)
* _parseByteArray_ when file data is an Uint8Array
* _parseBase64_ when file data is a base64 encoded String

Each of the methods has the same signature:

```
parseFn( fileReference, structureDefinition, offset )
```

Where:

* _fileReference_ is the file to parse (one of File, Uint8Array or String)
* _structureDefinition_ is an Object defining a structure (as described above)
* _offset_ is a numerical index of where in the file's byte Array reading should start
  this defaults to 0 to start reading from the beginning of the file.

### Example

If we intend to parse a .WAV audio file using the structure definition as defined
above, we can read the header like so:

```
import { parseFile } from 'typed-file-parser';
async function readWaveHeader( fileReference ) {
    const { data, end, error } = await parseFile( fileReference, wavHeader );
    console.log( data );  // will contain the properties of a WAV file header
    console.log( end );   // will describe the end offset of the header ()
    console.log( error ); // when true, a file reading error occurred
}
```

If all has been read successfully, _data_ is an Object that follows
the structure of _wavHeader_ and is populated with the actual file data.

_end_ describes at what offset in given file the structure's definition has ended.
This can be used for subsequent read operations where binary data is retrieved,
should you need to do so. In the example of reading a wave file, this could imply
that, depending on WAV file type, an Array consisting of either INT16 or FLOAT32
can be read from that offset.

In case of an error, the error Object will have been defined. This indicates
that an error occurred during parsing. The _data_ Object will be populated
with all data that could've been harvested up until the error occurred.

You can also view the demo provided in this repository's _index.html_ file.

## Performance

Depending on the files you're working with, memory allocation can be a problem.
The parse methods will only read the block that is requested (e.g. from the
requested offset and for the size of the requested structureDefinition) and
should be light on resources.

Depending on your use case, you might take additional steps which should be
taking the following guidelines into consideration:

* Use base64 only when you have no choice as a base64 String describes the
  file in its entirety. Also, the way JavaScript handles Strings is by
  allocating the entire value (and not by reference!)
* If you intend to do multiple reads on a file (for instance: first reading
  its header to determine where in the file the meaningful content begins) it
  is recommended to use the _fileToByteArray_-method to create a single
  reusable byteArray and use the _parseByteArray_-method instead.
