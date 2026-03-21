/**
 * Helper functions for PlacementForm component
 */

// Helper function to get abbreviations for aircraft and engine types
export const getTypeAbbreviation = (type: string, category: 'aircraft' | 'engine'): string => {
  if (category === 'aircraft') {
    const aircraftMap: { [key: string]: string } = {
      'fixed-wing': 'FW',
      'rotary-wing': 'RW'
    };
    return aircraftMap[type] || type.toUpperCase();
  } else {
    const engineMap: { [key: string]: string } = {
      'single-engine-piston': 'SEP',
      'multi-engine-piston': 'MEP',
      'single-engine-turboprop': 'SET',
      'multi-engine-turboprop': 'MET',
      'multi-engine-jet': 'JET',
      'single-engine-turbine': 'SET',
      'twin-engine-piston': 'TEP',
      'twin-engine-turbine': 'TET'
    };
    return engineMap[type] || type.toUpperCase();
  }
};

// Helper function to format number with commas
export const formatNumberWithCommas = (value: string): string => {
  if (!value) return "";
  // Remove all non-digit characters
  const numericValue = value.replace(/\D/g, "");
  if (!numericValue) return "";
  // Format with commas
  return Number(numericValue).toLocaleString("en-US");
};

// Helper function to remove commas from formatted number
export const removeCommas = (value: string): string => {
  return value.replace(/,/g, "");
};

// Helper function to format date to UK format (DD/MM/YYYY)
export const formatDateToUK = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper function to parse UK format date (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
export const parseUKDate = (ukDateString: string): string => {
  if (!ukDateString) return "";
  const parts = ukDateString.split('/');
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};
