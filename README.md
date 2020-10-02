# Binarcular

A library that allows you to read the contents of a binary file into a JSON Object,
taking care of all data type conversion into JavaScript-friendly values. You can search for data
by value, slice blocks into separate, meaningful structures or just read the entire file,
all inside your browser.

Practical use cases are:

* Validating whether a file header contains the appropriate description, automatically
  converted to the data types
* Scanning a file for specific meta data
* Using found meta data to locate where other meaningful data is stored... and extract it

See API and Example below.

## Compatibility

_binarcular_ should work fine on Internet Explorer 10 and up. You can verify
support at runtime by querying the result of the _isSupported()_-method:

```
import { isSupported } from 'binarcular';
if ( isSupported( optRequire64bitConversion = false ) ) {
    ...do stuff!
} else {
    ...do other, less cool stuff! Actually, not cool at all!! >=/
}
```

NOTE: if you require support for 64-bit types there are [additional requirements](https://caniuse.com/?search=bigint). Pass boolean _true_ for optional argument _optRequire64bitConversion_ to determine whether the environment supports 64-bit conversion.

## Installation

You can get it via NPM:

```
npm install binarcular
```

### Project integration

The parser is compatible with CommonJS / ES6 modules or can be included in a document
using AMD/RequireJS. See the contents of the _/dist/_ folder and include as your project sees fit.

## API

The module exports the following:

```
import {

    isSupported:     fn( optUseBase64Boolean = false ),
    types:           Object<String>,
    parse:           async fn( dataSource, structureDefinition, optReadOffset = 0 ),
    seek:            async fn( uint8Array,    searchStringOrByteArray, optReadOffset = 0),
    fileToByteArray: async fn( file, optSliceOffset = 0, optSliceSize = file.size )

} from 'binarcular';
```

We'll look into each of these below:

### Reading a chunk of data into an Object of a specific structure type

The _parse_ method is reponsible for this:

```
async parse( dataSource, structureDefinition, optReadOffset = 0 )
```

Where:

* _dataSource_ is the file to parse (can be either _File_, _Uint8Array_ or (base64 encoded) _String_)
* _structureDefinition_ is an Object defining a data structure (described below)
* _optReadOffset_ is a numerical index describing where in the file's ByteArray reading should start
  this defaults to 0 to start at the beginning of the file.

When the Promise resolves, the result is the following structure:

```
{
    data: Object,
    end: Number,
    error: Boolean,
    byteArray: Uint8Array
}
```

If all has been read successfully, _data_ is an Object that follows
the structure of _wavHeader_ and is populated with the actual file data.

_end_ describes at what offset in given file the structure's definition has ended.
This can be used for subsequent read operations where different data types are
extracted from the binary data.

If _error_ is true, this indicates that something went wrong during parsing. The _data_
Object will be populated with all data that could've been harvested up until the error occurred.
This allow you to harvest what you can from corrupted files.

#### A note on using Uint8Array as dataSource

You can see that another property is defined in the result, namely _byteArray_.
If the _dataSource_ provided to the parse method was a _Uint8Array_ which you intend to
reuse inside your project, be sure to reassign your byteArray reference to the
returned instance.

The rationale here is that for minimal overhead, the ownership of the ByteArray's binary
content is transferred during the read operations. _You will not be able to perform
any actions on your ByteArray without updating the reference_.

### Looking for a specific entry in a file

If you are working with a file where the content of interest is preceded by some
metadata at an arbitrary point, it makes sense to first look for this metadata
declaration so you know from where you can retrieve the actual data of interest.

For this purpose you can use _seek_:

```
async seek( uint8Array, searchStringOrByteArray, optReadOffset = 0 )
```

where:

* _uint8Array_ is the ByteArray containing the binary data.
* _searchStringOrByteArray_ can be either a String (in case the meta data is a
character sequence) or a Uint8Array holding a byte sequence that functions as the "search query".
* _optReadOffset_ determines the offset within the data from where to start searching, this
defaults to 0 to read from the start.

The method returns a numerical index at which the data was found or _Infinity_
if no match were found.

### Converting a File reference to a ByteArray

```
async fileToByteArray( fileReference, optSliceOffset = 0, optSliceSize = fileReference.size )
```

where:

* _fileReference_ is the File of which the contents should be read into a _Uint8Array_.
* _optSliceOffset_ is the optional offset from where to read the data, defaults to 0 to
start from the beginning.
* _optSliceSize_ is the optional size of the resulting ByteArray. This defaults to the
size of the file to read the file in its entirety. When using a custom _optSliceOffset_
overflow checking is performed to prevent reading out of the file boundaries.

## Example

Let's say we want to read the binary data of a well known proprietary format.
First up we will get to...

### Define a structure

Defining a structure is nothing more than declaring an Object where the keys
define names meaningful to your purpose and the values consist of Strings describing:

* one of the available type enumerations (note the name of the imported type is equal to its value)
* optional Array declaration where by adding a numerical value between brackets (_[n]_), will
  make the value an Array of given length _n_
* optional modifier defining the endianness of the file's byte order, separated by a pipeline
  (either _|BE_ for Big Endian or _|LE_ for Little Endian). When unspecified, the
  endianness of the clients system is used (assuming the file has been encoded on/by a similar
  system, which usually means Little Endian these days).

An example structure that defines the [header of a .WAV file](http://soundfile.sapp.org/doc/WaveFormat)
would look like:

```
const wavHeader = {
    type:           'CHAR[4]',
    size:           'INT32|LE',
    format:         'CHAR[4]',
    formatName:     'CHAR[4]',
    formatLength:   'INT32|LE',
    audioFormat:    'INT16|LE',
    channelAmount:  'INT16|LE',
    sampleRate:     'INT32|LE',
    bytesPerSecond: 'INT32|LE',
    blockAlign:     'INT16|LE',
    bitsPerSample:  'INT16|LE',
    dataChunkId:    'CHAR[4]',
    dataChunkSize:  'INT32|LE'
};
```

Note that the order of the keys (and more importantly: their type definition) should match
the order of the values as described the particular file's type!

#### A teeny tiny note on Endianness

Note that specifying endianness can be omitted if you're certain that the files
encoding matches that of the platform you will be parsing the file on (most likely
only Big Endian will require an explicit definition). _And I hope you will never
be in the unfortunate situation where you work with a file that uses different
endianness for different blocks!_.

#### Back to talking types

All available data types are listed in the _{ types }_ export. Note that definitions
for _CHAR_ will return as a String. If you want an 8-bit integer/byte value, use
_BYTE_ or _INT8_ instead.

We can now proceed to read the file:

```
import { parse } from 'binarcular';

async function readWaveHeader( fileReference ) {
    const { data, end, error, byteArray } = await parse( fileReference, wavHeader, 0 );

    console.log( data );  // will contain the properties of a WAV file header
    console.log( end );   // will describe the end offset of the header
    console.log( error ); // when true, a file reading error occurred
}
```

You can also view the [demo](https://htmlpreview.github.io/?https://github.com/igorski/typed-file-parser/blob/master/dist/index.html) provided in this repository's _example.html_ file, which
parses .WAV files and provides advanced examples using seeking, slicing and error
correction before finally providing you with the instruction on how to extract the
meaningful data from the file.

## Performance

Depending on the file types you're working with, memory allocation can be a problem.

The parser will only read the block that is requested (e.g. starting from the
requested offset and only for the size of the requested _structureDefinition_) and
should thus be light on resources. Additionally, all read operations happen in a
dedicated Web Worker which keeps your main application responsive (you can safely
parse several hundred megabytes of data without blocking your UI).

Depending on your use case, it helps to take the following guidelines into consideration:

* Use base64 _only when you have no choice_ as a base64 String describes the
  file _in its entirety_. Also, the way JavaScript handles Strings is by
  allocating the entire value (and not by reference!) whenever you assign
  it to a new variable.
* If you intend to do multiple reads on the same file (for instance: first reading
  its header to determine where in the file the meaningful content begins) it
  is recommended to use the _fileToByteArray()_-method to create a single
  reusable byteArray. This also makes sense if you need to read the file in its entirety.

## Build instructions

In case you want to aid in development of the library:

The project dependencies are maintained by NPM, you can resolve them using:

```
npm install
```

You can develop (and test against the example app) by running:

```
npm run dev
```

To create a production build:

```
npm run build
```

After which a folder _dist/_ is created which contains the prebuilt AMD/RequireJS
and CommonJS/ES module libraries (as well as the example application).

The source code is transpiled to ES5 for maximum browser compatibility.

## Unit testing

Unit tests are run via jest, you can run the tests by running:

```
npm run test
```

Unit tests go in the _./test_-folder. The file name for a unit test must be equal to the file it is testing, but contain the suffix ".spec", e.g. _functions.js_ should have a test file _functions.spec.js_.
