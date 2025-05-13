// Dropdowns för testtyp och kön
let ttestTypes = [

  'Age Group (Financial Stress = 5)',
  'Age 18–22 vs 31+ (Financial Stress = 5)',
  'Gender (City = Bigger City, Financial Stress = 4)'
];
let selectedTest = addDropdown('T-test Type::', ttestTypes);



let genders = (await dbQuery(
  'SELECT DISTINCT Gender FROM depression_survey WHERE Gender IS NOT NULL'
)).map(x => x.Gender);
let selectedGender = addDropdown('Gender::', genders);



// Dynamisk förklaring för valt test
// Dynamisk analystext baserat på valt test
if (selectedTest === 'Age Group (Financial Stress = 5)') {
  addMdToPage(`
PThere’s barely any difference in depression levels between people aged 23–30 and those over 31.
For both men and women, the average is around 0.81.
The t-values (–1.25 for men and 0.25 for women) show that the small difference is not statistically significant.
So, age doesn't seem to matter much in this specific group.
  `);

} else if (selectedTest === 'Age 18–22 vs 31+ (Financial Stress = 5)') {
  addMdToPage(`
Among men aged 18–22, the average depression score is 0.89, compared to 0.68 for men over 31.  
Among women, the pattern is nearly the same: 0.88 for the younger group and 0.69 for the older.  
That’s a big gap and it’s statistically significant.  
This suggests that age plays a major role when stress is high.  
In short: younger adults are more vulnerable to depression than older ones especially in tough financial times.
  `);

} else if (selectedTest === 'Gender (City = Bigger City, Financial Stress = 4)') {
  addMdToPage(`
In big cities with financial stress (level 4), women report slightly more depression than men.  
The average score is 0.73 for women and 0.71 for men.  
But the difference is very small, and the t-value (1.58) shows it's not statistically significant.  
So, gender doesn't seem to make a clear difference in this case.
  `);
}


// SQL-query beroende på val
let query = '';
if (selectedTest === 'City Type (Financial Stress = 5)') {
  query = `
    SELECT 
      CASE 
        WHEN City IN ('Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata') THEN 'Bigger City'
        ELSE 'Smaller City'
      END AS Grouping,
      Depression
    FROM depression_survey
    WHERE Gender = '${selectedGender}'
      AND CAST([Financial Stress] AS INTEGER) = 5
      AND Depression IS NOT NULL
  `;
} else if (selectedTest === 'Age Group (Financial Stress = 5)') {
  query = `
    SELECT 
      CASE
        WHEN ROUND(Age) BETWEEN 23 AND 30 THEN '23-30'
        ELSE '31+'
      END AS Grouping,
      Depression
    FROM depression_survey
    WHERE Gender = '${selectedGender}'
      AND CAST([Financial Stress] AS INTEGER) = 5
      AND Depression IS NOT NULL
  `;
} else if (selectedTest === 'Age 18–22 vs 31+ (Financial Stress = 5)') {
  query = `
    SELECT 
      CASE
        WHEN ROUND(Age) BETWEEN 18 AND 22 THEN '18–22'
        ELSE '31+'
      END AS Grouping,
      Depression
    FROM depression_survey
    WHERE Gender = '${selectedGender}'
      AND CAST([Financial Stress] AS INTEGER) = 5
      AND Depression IS NOT NULL
      AND (ROUND(Age) <= 22 OR ROUND(Age) > 30)
  `;
} else if (selectedTest === 'Gender (City = Bigger City, Financial Stress = 4)') {
  query = `
    SELECT Gender AS Grouping, Depression
    FROM depression_survey
    WHERE City IN ('Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata')
      AND CAST([Financial Stress] AS INTEGER) = 4
      AND Depression IS NOT NULL
      AND Gender IN ('Male', 'Female')
  `;
}

// Hämta och förbered data
let rawData = await dbQuery(query);
let groupNames = [...new Set(rawData.map(x => x.Grouping))];

if (groupNames.length !== 2) {
  addMdToPage('**Fel:** Två grupper krävs för t-test.');
} else {
  let group1 = rawData.filter(x => x.Grouping === groupNames[0]).map(x => Number(x.Depression));
  let group2 = rawData.filter(x => x.Grouping === groupNames[1]).map(x => Number(x.Depression));

  function tTest(g1, g2) {
    const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = (arr, m) => arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
    let m1 = mean(g1), m2 = mean(g2);
    let v1 = variance(g1, m1), v2 = variance(g2, m2);
    let n1 = g1.length, n2 = g2.length;
    let t = (m1 - m2) / Math.sqrt((v1 / n1) + (v2 / n2));
    let df = Math.min(n1 - 1, n2 - 1);
    return { tValue: t.toFixed(2), df, mean1: m1.toFixed(2), mean2: m2.toFixed(2) };
  }

  let result = tTest(group1, group2);

  addMdToPage(`
  ## T-test: ${selectedTest}  
  **Group 1 (${groupNames[0]})**: n = ${group1.length}, mean = ${result.mean1}  
  **Group 2 (${groupNames[1]})**: n = ${group2.length}, mean = ${result.mean2}  
  **t-value** = ${result.tValue}  
  _Degrees of freedom = ${result.df}_  
  _Note: Significance must be interpreted against critical t-values in stats table or tool_
  `);

  let depressedPerGroup = rawData
    .filter(x => x.Depression == 1)
    .reduce((acc, x) => {
      acc[x.Grouping] = (acc[x.Grouping] || 0) + 1;
      return acc;
    }, {});

  let pieData = [['Group', 'Number Depressed']];
  for (let key in depressedPerGroup) {
    pieData.push([key, depressedPerGroup[key]]);
  }

  drawGoogleChart({
    type: 'PieChart',
    data: pieData,
    options: {
      title: 'Depression Rate (%) per Group',
      is3D: true,
      pieSliceText: 'percentage',
      chartArea: { width: '90%', height: '90%' }
    }
  });
}
