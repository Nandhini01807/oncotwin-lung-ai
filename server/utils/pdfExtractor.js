const pdfParse = require("pdf-parse");

const extractText = async (buffer) => {
    const data = await pdfParse(buffer);

    return data.text;
};

module.exports = extractText;