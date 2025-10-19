document.getElementById('convertButton').addEventListener('click', async () => {
    const pdfFile = document.getElementById('pdfFile').files[0];
    const usernameLength = parseInt(document.getElementById('usernameLength').value, 10);

    if (!pdfFile) {
        alert('Please select a PDF file to convert.');
        return;
    }

    if (!usernameLength || usernameLength <= 0) {
        alert('Please enter a valid username length.');
        return;
    }

    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('usernameLength', usernameLength);

    try {
        const response = await fetch('/convert', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            const filenameMatch = contentDisposition && contentDisposition.match(/filename="([^"]+)"/);
            const filename = filenameMatch ? filenameMatch[1] : 'converted.csv';
            
            const downloadLink = document.getElementById('downloadLink');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = filename;
            downloadLink.style.display = 'block';

            document.getElementById('clearButton').style.display = 'block'; // Show clear button
            document.getElementById('outputMessage').textContent = 'Conversion successful! Click to download.';
        } else {
            document.getElementById('outputMessage').textContent = 'Conversion failed. Please try again.';
        }
    } catch (error) {
        console.error('Error during conversion:', error);
        document.getElementById('outputMessage').textContent = 'An error occurred. Please try again.';
    }
});

document.getElementById('clearButton').addEventListener('click', () => {
    document.getElementById('pdfFile').value = null;
    document.getElementById('usernameLength').value = '';
    document.getElementById('downloadLink').style.display = 'none';
    document.getElementById('clearButton').style.display = 'none'; // Hide clear button
    document.getElementById('outputMessage').textContent = '';
});

document.getElementById('pdfFile').addEventListener('change', () => {
    document.getElementById('downloadLink').style.display = 'none';
    document.getElementById('clearButton').style.display = 'none'; // Hide clear button
    document.getElementById('outputMessage').textContent = '';
});

// Dark mode toggle functionality
const toggleModeIcon = document.getElementById('toggleMode');
toggleModeIcon.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    toggleModeIcon.innerHTML = document.body.classList.contains('dark-mode') ? '&#9788;' : '&#9728;';
});
