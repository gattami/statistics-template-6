// 1. Hämta kön och rendera dropdown
let genders = (await dbQuery(
  'SELECT DISTINCT Gender FROM depression_survey WHERE Gender IS NOT NULL'
)).map(x => x.Gender);
let selectedGender = addDropdown('Gender', genders, 'Male');

addMdToPage(`
### Depression and Financial Stress

For both men and women, depression levels clearly increase as financial stress rises.  
This trend is consistent and linear across all stress levels.

At the highest level of financial stress (level 5):  
- Men in big cities: 84.7%  
- Women in big cities: 83.95%  
- Men in smaller cities: 80.56%  
- Women in smaller cities: 80.35%

The pattern is the same for both genders:  
• More financial stress = more depression  
• Bigger cities = slightly higher depression levels  

Financial stress plays the biggest role, but living in a bigger city seems to add a bit more pressure.
`);


// 2. Rubrik
addMdToPage(`### Depression (%) vs Financial Stress per City Type (${selectedGender})`);

// 3. Hämta och gruppera data per stadstyp och stressnivå
let rawData = await dbQuery(`
  SELECT 
    CASE 
      WHEN City IN ('Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata') THEN 'Bigger City'
      ELSE 'Smaller City'
    END AS City_Type,
    CAST([Financial Stress] AS INTEGER) AS StressLevel,
    ROUND(AVG(Depression) * 100.0, 2) AS DepressionRate
  FROM depression_survey
  WHERE Gender = '${selectedGender}'
    AND [Financial Stress] IS NOT NULL
    AND CAST([Financial Stress] AS INTEGER) BETWEEN 1 AND 5
    AND Depression IS NOT NULL
    AND City NOT IN ('Harsha', 'Rashi', 'City', 'M.Com', 'M.Tech', 'ME')
  GROUP BY City_Type, StressLevel
  ORDER BY StressLevel, City_Type
`);

// 4. Pivotera till format för linjediagram
function pivotByCityType(data) {
  const pivot = {};
  data.forEach(row => {
    const level = parseInt(row.StressLevel, 10);
    if (!pivot[level]) {
      pivot[level] = { StressLevel: level };
    }
    pivot[level][row.City_Type] = row.DepressionRate;
  });
  return Object.values(pivot).sort((a, b) => a.StressLevel - b.StressLevel);
}

let pivotedData = pivotByCityType(rawData);

// 5. Rita diagram
drawGoogleChart({
  type: 'LineChart',
  data: makeChartFriendly(pivotedData, 'StressLevel', ['Bigger City', 'Smaller City']),
  options: {
    height: 500,
    title: `Depression (%) vs Financial Stress (${selectedGender})`,
    hAxis: { title: 'Financial Stress (1–5)' },
    vAxis: { title: 'Depression (%)', format: '#.##' },
    pointSize: 5,
    curveType: 'function',
    legend: { position: 'top' },
    colors: ['#e6194b', '#3cb44b']
  }
});

// 6. Visa tabellen
tableFromData({
  data: rawData,
  columnNames: ['City Type', 'Financial Stress', 'Depression (%)']
});
