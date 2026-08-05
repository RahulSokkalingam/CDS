import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Exports a DOM element to a high-quality PDF.
 * @param elementId The ID of the HTML element to export.
 * @param filename The name of the downloaded PDF file.
 */
export async function exportToPDF(elementId: string, filename: string = "inspection-report.pdf"): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  // Create toast notification or state check if needed in the UI
  try {
    // Setup html2canvas options
    const options = {
      scale: 2, // Increase resolution
      useCORS: true, // Allow cross-origin images if any
      logging: false,
      backgroundColor: "#ffffff", // Ensure white background
      onclone: (clonedDoc: Document) => {
        // Hide elements with the 'no-pdf' class in the printed PDF
        const noPdfElements = clonedDoc.querySelectorAll(".no-pdf");
        noPdfElements.forEach((el) => {
          (el as HTMLElement).style.setProperty("display", "none", "important");
        });
      },
    };

    const canvas = await html2canvas(element, options);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // PDF dimensions (A4 portrait size)
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Handle multi-page PDF if report is very long
    while (heightLeft > 0) {
      position = heightLeft - imgHeight; // slide view up
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
