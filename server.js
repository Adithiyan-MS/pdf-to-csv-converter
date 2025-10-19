const express = require("express");
const multer = require("multer");
const path = require("path");
const pdf = require("pdf-parse");
const fs = require("fs");
const csvWriter = require("csv-writer").createObjectCsvWriter;

const app = express();

// Define main directory and subdirectories for uploads and CSVs
const MAIN_DIR = path.join(__dirname, "uploads");
const UPLOADS_DIR = path.join(MAIN_DIR, "pdfs");
const CSV_DIR = path.join(MAIN_DIR, "csvs");

// Ensure directories exist
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(CSV_DIR, { recursive: true });

const upload = multer({ dest: UPLOADS_DIR });

app.use(express.static("public"));

const extractCourseCode = (text) => {
    const courseCodeRegex = /\b[A-Z]{2}\d{4}\b/g;
    const match = courseCodeRegex.exec(text);
    return match ? match[0] : "CourseCode";
};

const convertPDFToCSV = async (inputFilePath, usernameLength) => {
    const dataBuffer = fs.readFileSync(inputFilePath);
    const data = await pdf(dataBuffer);
    // console.log("PDF parsed successfully.");

    const regex = /(\d{10})([A-Z ]+)/g;
    let matches;
    const records = [];

    while ((matches = regex.exec(data.text)) !== null) {
        const record = {
            Registration_Number: matches[1],
            Student_Name: matches[2].trim()
        };
        records.push(record);
    }
    // console.log("Records extracted:", records);

    const formattedRecords = records.map((row) => {
        const registrationNumber = row.Registration_Number;
        const name = row.Student_Name;
        let usernameValue;
        if (registrationNumber.length >= usernameLength) {
            usernameValue = registrationNumber.substring(registrationNumber.length - usernameLength);
        } else {
            usernameValue = registrationNumber;
        }
        return {
            username: usernameValue,
            firstname: registrationNumber,
            lastname: name,
            password: `${usernameValue}@Ist$`,
            email: `${usernameValue}@auist.edu`,
        };
    });

    const courseCode = extractCourseCode(data.text);
    return { formattedRecords, courseCode };
};

const getUniqueFilename = (dir, baseFilename, extension) => {
    let filename = `${baseFilename}.${extension}`;
    let counter = 1;

    while (fs.existsSync(path.join(dir, filename))) {
        filename = `${baseFilename}_${counter}.${extension}`;
        counter++;
    }

    return filename;
};

app.post("/convert", upload.single("pdf"), async (req, res) => {
    const inputFilePath = req.file.path;
    const usernameLength = parseInt(req.body.usernameLength, 10);

    try {
        const { formattedRecords, courseCode } = await convertPDFToCSV(inputFilePath, usernameLength);

        // Determine unique filenames for PDF and CSV
        const pdfFilename = getUniqueFilename(UPLOADS_DIR, `${courseCode}_final`, 'pdf');
        const csvFilename = getUniqueFilename(CSV_DIR, `${courseCode}_final`, 'csv');

        // Move the uploaded PDF to the new filename
        const newPdfPath = path.join(UPLOADS_DIR, pdfFilename);
        fs.renameSync(inputFilePath, newPdfPath);

        const formattedOutputFile = path.join(CSV_DIR, csvFilename);

        const formattedCsvWriter = csvWriter({
            path: formattedOutputFile,
            header: [
                { id: "username", title: "username" },
                { id: "firstname", title: "firstname" },
                { id: "lastname", title: "lastname" },
                { id: "password", title: "password" },
                { id: "email", title: "email" }
            ]
        });

        await formattedCsvWriter.writeRecords(formattedRecords);
        console.log(`CSV file created at: ${formattedOutputFile}`);

        res.setHeader("Content-Disposition", `attachment; filename=${csvFilename}`);
        res.download(formattedOutputFile, csvFilename, (err) => {
            if (err) {
                console.error("Error during download:", err);
                res.status(500).send("Error during download.");
            }
        });
    } catch (error) {
        console.error("Conversion error:", error);
        res.status(500).send("Error during conversion.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
