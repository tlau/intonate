/*---------------------
  :: Blab
  -> model
---------------------*/

module.exports = {
  attributes  : {
    // Simple attribute:
    // name: 'STRING',

    // Or for more flexibility:
    // phoneNumber: {
    //  type: 'STRING',
    //  defaultValue: '555-555-5555'
    // }

    text: 'STRING',
    filename: 'STRING',
    contentType: 'STRING',
    length: 'INTEGER',
    audioData: 'STRING',
    wavData: 'STRING',
    createdBy: 'STRING',

  }

};
