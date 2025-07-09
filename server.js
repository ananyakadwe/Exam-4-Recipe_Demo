const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

async function fetchMealsByLetter(letter) {
  try {
    const apiUrl = `https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`;
    const response = await axios.get(apiUrl);
    return response.data.meals || [];
  } catch (error) {
    console.error(`Error fetching meals for letter ${letter}:`, error.message);
    return [];
  }
}

app.get('/api/search-meals', async (req, res) => {
  const { mainIngredient } = req.query;

  if (mainIngredient && mainIngredient.trim() !== '') {
    try {
      const apiUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(mainIngredient.trim())}`;
      console.log(`Fetching by ingredient: ${apiUrl}`);
      const response = await axios.get(apiUrl);
      const meals = response.data.meals;

      if (!meals) {
        return res.json([]); 
      }

      const formattedMeals = meals.map(meal => ({
        id: meal.idMeal,
        name: meal.strMeal,
        thumbnail: meal.strMealThumb
      }));

      res.json(formattedMeals);
    } catch (error) {
      console.error('Error fetching data by ingredient from TheMealDB API:', error.message);
      res.status(500).json({ error: 'Failed to fetch meals by ingredient.' });
    }
  } else {
    try {
      console.log('Fetching all meals by iterating through alphabet...');
      const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
      let allMeals = [];

      const results = await Promise.allSettled(
        alphabet.map(letter => fetchMealsByLetter(letter))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allMeals = allMeals.concat(result.value);
        }
      });

      const uniqueMeals = Array.from(new Map(allMeals.map(meal => [meal.idMeal, meal])).values());


      const formattedMeals = uniqueMeals.map(meal => ({
        id: meal.idMeal,
        name: meal.strMeal,
        thumbnail: meal.strMealThumb
      }));

      formattedMeals.sort((a, b) => a.name.localeCompare(b.name));

      res.json(formattedMeals);

    } catch (error) {
      console.error('Error fetching all meals from TheMealDB API:', error.message);
      res.status(500).json({ error: 'Failed to fetch all possible meals.' });
    }
  }
});

app.listen(port, () => {
  console.log(`Meal Finder Backend listening at http://localhost:${port}`);
  console.log(`Open your browser at http://localhost:${port}/ to view the frontend.`);
});