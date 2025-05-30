// 1. Dropdown för kön
let genders = (await dbQuery(
  'SELECT DISTINCT Gender FROM depression_survey WHERE Gender IS NOT NULL'
)).map(x => x.Gender);
let selectedGender = addDropdown('Gender', genders, 'Male');

// 2. Rubrik
addMdToPage(`### Depression (%) vs Financial Stress per City Type (${selectedGender})`);




// 3. Hämta datan och gruppera
let rawData = await dbQuery(`
  SELECT 
    CASE 
      WHEN City IN ('Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata') 
        THEN 'Bigger City'
      ELSE 'Smaller City'
    END AS City_Type,
    CAST([Financial Stress] AS INTEGER) AS StressLevel,
    ROUND(AVG(Depression) * 100.0, 2) AS DepressionRate
  FROM depression_survey
  WHERE Gender = '${selectedGender}'
    AND [Financial Stress] IS NOT NULL
    AND CAST([Financial Stress] AS INTEGER) BETWEEN 1 AND 5
    AND Depression IS NOT NULL
  GROUP BY City_Type, StressLevel
  ORDER BY City_Type, StressLevel
`);

// diagram
function pivotByCityType(data) {
  const result = {};
  const types = ['Bigger City', 'Smaller City'];
  data.forEach(row => {
    const level = parseInt(row.StressLevel);
    if (!result[level]) {
      result[level] = { StressLevel: level };
      types.forEach(t => result[level][t] = null);
    }
    result[level][row.City_Type] = row.DepressionRate;
  });
  return Object.values(result).sort((a, b) => a.StressLevel - b.StressLevel);
}

let pivotedData = pivotByCityType(rawData);

// 5. Rita linjediagram
drawGoogleChart({
  type: 'LineChart',
  data: makeChartFriendly(pivotedData, 'StressLevel', ['Bigger City', 'Smaller City']),
  options: {
    title: `Depression (%) vs Financial Stress Level (${selectedGender})`,
    height: 500,
    hAxis: { title: 'Financial Stress (1–5)' },
    vAxis: { title: 'Depression (%)', format: '#.##' },
    curveType: 'function',
    pointSize: 5,
    legend: { position: 'top' },
    colors: ['#e6194b', '#3cb44b']
  }
});

// 6. Visa tabell med korrelation
function calculatePearson(x, y) {
  const n = x.length;
  const avgX = x.reduce((a, b) => a + b) / n;
  const avgY = y.reduce((a, b) => a + b) / n;

  let numerator = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - avgX;
    const dy = y[i] - avgY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  return Math.round((numerator / Math.sqrt(denomX * denomY)) * 1000) / 1000;
}

// 7. Räkna korrelation per City Type
let correlations = ['Bigger City', 'Smaller City'].map(type => {
  const subset = rawData.filter(row => row.City_Type === type);
  const x = subset.map(r => parseInt(r.StressLevel));
  const y = subset.map(r => parseFloat(r.DepressionRate));
  return {
    'City Type': type,
    'Korrelation r': calculatePearson(x, y)
  };
});

// 8. Visa korrelation i tabell
tableFromData({
  data: correlations,
  columnNames: ['City Type', 'Korrelation r']
});


