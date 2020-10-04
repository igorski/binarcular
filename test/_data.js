// some mock data to use in tests

// this describes essentially the header of a WAV file

export const headerDefinition = {
    type:             'CHAR[4]',
    size:             'INT32',
    format:           'CHAR[4]',
    formatName:       'CHAR[4]',
    formatLength:     'INT32',
    audioFormat:      'INT16',
    channelAmount:    'INT16',
    sampleRate:       'INT32',
    bytesPerSecond:   'INT32',
    blockAlign:       'INT16',
    bitsPerSample:    'INT16',
    dataChunkId:      'CHAR[4]',
    dataChunkSize:    'INT32'
};

// example WAV header according to above spec in binary

export const binaryFile = new Uint8Array([
    82, 73, 70, 70, 166, 105, 1, 0, 87, 65,
    86, 69, 102, 109, 116, 32, 16, 0, 0, 0,
    1, 0, 1, 0, 128, 187, 0, 0, 0, 119,
    1, 0, 2, 0, 16, 0, 100, 97, 116, 97,
    130, 105, 1, 0
]);

// above binary in JSON

export const binaryAsJson = {
    type: 'RIFF',
    size: 92582,
    format: 'WAVE',
    formatName: 'fmt ',
    formatLength: 16,
    audioFormat: 1,
    channelAmount: 1,
    sampleRate: 48000,
    bytesPerSecond: 96000,
    blockAlign: 2,
    bitsPerSample: 16,
    dataChunkId: 'data',
    dataChunkSize: 92546
};
