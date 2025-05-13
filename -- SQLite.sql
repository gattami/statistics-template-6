-- SQLite

SELECT * FROM depression_survey LIMIT 10;

-- 1) Räkna hur många män totalt som är 18–22 år
SELECT COUNT(*) AS cnt_18_22_male
FROM depression_survey
WHERE
    Gender = 'Male'
    AND CAST(Age AS INTEGER) BETWEEN 18 AND 22;

SELECT CAST(Age AS INTEGER) AS Age, COUNT(*) AS cnt
FROM depression_survey
WHERE
    Gender = 'Male'
    AND CAST(Age AS INTEGER) BETWEEN 18 AND 22
GROUP BY
    CAST(Age AS INTEGER)
ORDER BY Age;

SELECT 
  ROWID AS id,
  Age,
  [Financial Stress],
  Depression
FROM depression_survey
WHERE Gender = 'Male'
  AND CAST(Age AS INTEGER) BETWEEN 18 AND 22
LIMIT 10;

WITH
  AgeGroups(AgeGroup, MinAge, MaxAge) AS (
    VALUES
      ('18-22', 18, 22),
      ('23-30', 23, 30),
      ('31+',   31, 200)
  )
SELECT
  ag.AgeGroup,
  CAST(ds.[Financial Stress] AS INTEGER) AS StressLevel,
  ROUND(AVG(ds.Depression) * 100.0, 2) AS DepressionRate
FROM
  depression_survey AS ds
  JOIN AgeGroups AS ag
    ON CAST(ds.Age AS INTEGER) BETWEEN ag.MinAge AND ag.MaxAge
WHERE
  ds.Gender = 'Male'
  AND ds.Depression      IS NOT NULL
  AND ds.[Financial Stress] IS NOT NULL
  AND CAST(ds.[Financial Stress] AS INTEGER) BETWEEN 1 AND 5
GROUP BY
  ag.AgeGroup,
  StressLevel
ORDER BY
  CASE ag.AgeGroup
    WHEN '18-22' THEN 1
    WHEN '23-30' THEN 2
    ELSE 3
  END,
  StressLevel;

SELECT typeof([Financial Stress]), [Financial Stress], COUNT(*) 
FROM depression_survey 
GROUP BY [Financial Stress];

SELECT 
  CASE
    WHEN ROUND(Age) BETWEEN 18 AND 22 THEN '18-22'
    WHEN ROUND(Age) BETWEEN 23 AND 30 THEN '23-30'
    ELSE '31+'
  END AS AgeGroup,
  COUNT(*) AS Antal
FROM depression_survey
WHERE Gender = 'Male'
  AND CAST([Financial Stress] AS INTEGER) = 5
  AND Depression IS NOT NULL
  AND Age IS NOT NULL
GROUP BY AgeGroup;