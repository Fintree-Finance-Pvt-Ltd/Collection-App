

import  fs from "fs/promises";

export function normalizeTosmsDate(input) {
  if (!input) return null;
  
  // if already Date object
  if (input instanceof Date) {
    return input.toLocaleDateString("en-GB"); // dd/mm/yyyy
  }

  // if string in yyyy-mm-dd format
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-");
    return `${d}-${m}-${y}`;
  }

  return input; // fallback
}
export  function cleanupFiles(files) {
  if (!files?.length) return;
  for (const f of files) {
    if (f?.path && fs.existsSync(f.path)) {
      try {
        fs.unlinkSync(f.path);
      } catch (err) {
        console.error("Error deleting file:", f.path, err);
      }
    }
  }
}
