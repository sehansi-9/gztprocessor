// shared helpers to build and trigger CSV downloads

export const buildCsvUrl = (gazetteNumber, dateStr, scope, fileType) => {
    return `http://localhost:8000/download/${gazetteNumber}/${dateStr}/${scope}/${fileType}`;
};

export const triggerDownload = (url, suggestedFileName) => {
    const link = document.createElement("a");
    link.href = url;
    if (suggestedFileName) {
        link.download = suggestedFileName;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const downloadCsv = (gazetteNumber, dateStr, scope, fileType) => {
    const url = buildCsvUrl(gazetteNumber, dateStr, scope, fileType);
    triggerDownload(url, `${fileType}.csv`);
};


