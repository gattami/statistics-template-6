// 1. Dropdown för kön
let genders = (await dbQuery(
  'SELECT DISTINCT Gender FROM depression_survey WHERE Gender IS NOT NULL'
)).map(x => x.Gender);
let selectedGender = addDropdown('Gender', genders, 'Male');

addMdToPage(`
  ## 
Student Depression Dataset: Analyzing Mental Health Trends and Predictors Among Students
`);



addMdToPage(`
  ## 
 I chose the hypothesis that students who feel more financial stress are also more likely to feel depressed.
 I also wanted to see if this relationship is different depending on where the student live in a bigger or smaller citym 
 and whether gender plays a role.In addition, I believe that younger students may feel more depressed than older students, possibly
  because of school pressure or financial dependence.

  Here I divided the students into three age groups:

• 18-22 (youngest group)

• 23-30 (middle group)

• 31+ (older students)
  
`);

// 2. Rubrik
addMdToPage(`### Depression Rate (%) vs Financial Stress per Age Group (${selectedGender})`);

// 3. Hämta och gruppera data
let rawData = await dbQuery(`
  SELECT 
    CASE
      WHEN ROUND(Age) BETWEEN 18 AND 22 THEN '18-22'
      WHEN ROUND(Age) BETWEEN 23 AND 30 THEN '23-30'
      ELSE '31+'
    END AS AgeGroup,
    CAST([Financial Stress] AS INTEGER) AS StressLevel,
    ROUND(AVG(Depression) * 100.0, 2) AS DepressionRate
  FROM depression_survey
  WHERE Gender = '${selectedGender}'
    AND [Financial Stress] IS NOT NULL
    AND CAST([Financial Stress] AS INTEGER) BETWEEN 1 AND 5
    AND Depression IS NOT NULL
    AND Age IS NOT NULL
  GROUP BY AgeGroup, StressLevel
  ORDER BY AgeGroup, StressLevel
`);

// 4. Pivotera till rätt format för Google Chart
function pivotByAgeGroup(data) {
  const result = {};
  const allGroups = ['18-22', '23-30', '31+'];

  data.forEach(row => {
    const level = parseInt(row.StressLevel, 10);
    const group = row.AgeGroup;
    const value = parseFloat(row.DepressionRate);

    if (isNaN(level) || isNaN(value)) return;

    if (!result[level]) {
      result[level] = { StressLevel: level };
      allGroups.forEach(g => result[level][g] = null);
    }

    result[level][group] = value;
  });

  return Object.values(result).sort((a, b) => a.StressLevel - b.StressLevel);
}

let pivotedData = pivotByAgeGroup(rawData);

// 5. Rita linjediagrammet
drawGoogleChart({
  type: 'LineChart',
  data: makeChartFriendly(pivotedData, 'StressLevel', ['18-22', '23-30', '31+']),
  options: {
    height: 500,
    title: `Depression (%) vs Financial Stress by Age (${selectedGender})`,
    hAxis: { title: 'Financial Stress Level (1-5)', minValue: 1, maxValue: 5 },
    vAxis: { title: 'Depression Rate (%)', format: '#.##' },
    pointSize: 5,
    curveType: 'function',
    legend: { position: 'top' },
    colors: ['#e6194b', '#3cb44b', '#4363d8']
  }
});

// 6. Visa tabellen
tableFromData({
  data: rawData,
  columnNames: ['Age Group', 'Financial Stress', 'Depression (%)']
});
