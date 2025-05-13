function pivotCityTypeByAge(data) {
  const pivoted = {};
  data.forEach(row => {
    if (!pivoted[row.Age_Group]) {
      pivoted[row.Age_Group] = { Age_Group: row.Age_Group };
    }
    pivoted[row.Age_Group][row.City_Type] = row.Depression_Percent;
  });
  return Object.values(pivoted);
}

let genders = (await dbQuery(
  'SELECT DISTINCT Gender FROM depression_survey WHERE Gender IS NOT NULL'
)).map(x => x.Gender);


addMdToPage(`
### 
Among men aged 18-22 living in big cities with high financial stress, the depression rate reaches nearly 73%.
For men over 31 in the same situation, it's 41%.  
That's almost twice as high among the younger group.

The trend is clear across both charts and tables:  
Depression decreases with age  
It increases with financial stress  
Bigger city environments seem to amplify the effect

The gap between younger and older people is actually larger than the difference between small and big cities.  
That suggests age is a stronger factor than location.

Both men and women follow the same pattern:  
The more financial stress, the higher the depression rates  
The older the group, the lower the rates  
But women consistently report slightly higher levels than men, no matter the city size or stress level.

Looking at financial stress level 5:  
Women in big cities: nearly 84% report depression  
Men in big cities: just over 72%

All groups are heavily affected by financial stress.
`);

let selectedGender = addDropdown('Gender', genders, 'Male');




addMdToPage(`
### Average Depression Level (%) by City Type and Age Group for ${selectedGender}

🟥 = Bigger City  
🟦 = Smaller City
`);

let rawData = await dbQuery(`
  SELECT 
    CASE 
      WHEN City IN ('Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata') THEN 'Bigger City'
      ELSE 'Smaller City'
    END AS City_Type,
    CASE
      WHEN ROUND(Age) BETWEEN 18 AND 22 THEN '18-22'
      WHEN ROUND(Age) BETWEEN 23 AND 30 THEN '23-30'
      ELSE '31+'
    END AS Age_Group,
    ROUND(AVG(Depression) * 100, 2) AS Depression_Percent
  FROM depression_survey
  WHERE Gender = '${selectedGender}'
    AND City NOT IN ('Harsha', 'Rashi', 'City', 'M.Com', 'M.Tech', 'ME')
    AND Depression IS NOT NULL
  GROUP BY City_Type, Age_Group
  ORDER BY Age_Group, City_Type
`);

let pivotedData = pivotCityTypeByAge(rawData);

drawGoogleChart({
  type: 'ColumnChart',
  data: makeChartFriendly(pivotedData, 'Age_Group', ['Bigger City', 'Smaller City']),
  options: {
    height: 500,
    chartArea: { left: 70, right: 10 },
    title: `Average Depression (%) by Age Group (${selectedGender})`,
    vAxis: { title: 'Depression (%)', format: '#.##' },
    hAxis: { title: 'Age Group' },
    isStacked: true
  }
});

tableFromData({
  data: rawData,
  columnNames: ['City Type', 'Age Group', 'Depression (%)']
});
