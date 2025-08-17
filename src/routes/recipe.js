const express = require('express');
const { body, validationResult } = require('express-validator');
const OpenAI = require('openai');
const { logger } = require('../utils/logger');
const { optionalAuth } = require('../middleware/auth');
const { recipeGenerationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validation rules for recipe generation
const recipeValidation = [
  body('ingredients')
    .isString()
    .isLength({ min: 3, max: 500 })
    .withMessage('Ingredients must be between 3 and 500 characters'),
  body('cuisine')
    .optional()
    .isString()
    .isIn(['korean', 'italian', 'asian', 'mexican', 'american', 'mediterranean', 'indian', 'french', ''])
    .withMessage('Invalid cuisine type'),
  body('cookingTime')
    .optional()
    .isString()
    .isIn(['quick', 'medium', 'long', 'extended', ''])
    .withMessage('Invalid cooking time'),
  body('dietary')
    .optional()
    .isString()
    .isIn(['vegetarian', 'vegan', 'gluten-free', 'low-carb', 'keto', 'high-protein', ''])
    .withMessage('Invalid dietary restriction'),
  body('skillLevel')
    .optional()
    .isString()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid skill level')
];

// POST /api/recipe/generate-recipe
router.post('/generate-recipe', 
  optionalAuth,
  recipeGenerationLimiter,
  recipeValidation,
  async (req, res) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { ingredients, cuisine, cookingTime, dietary, skillLevel } = req.body;

      // Create prompt for OpenAI
      const prompt = createRecipePrompt({
        ingredients,
        cuisine,
        cookingTime,
        dietary,
        skillLevel
      });

      logger.info('Generating recipe with OpenAI', {
        userId: req.user?.id,
        ingredients: ingredients.substring(0, 100),
        cuisine,
        cookingTime,
        dietary,
        skillLevel
      });

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a professional chef and recipe developer. Create detailed, practical recipes that are easy to follow. Always respond in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const aiResponse = completion.choices[0].message.content;
      let recipe;

      try {
        recipe = JSON.parse(aiResponse);
      } catch (parseError) {
        logger.error('Failed to parse OpenAI response:', parseError);
        throw new Error('Invalid AI response format');
      }

      // Validate and enhance the recipe
      const enhancedRecipe = enhanceRecipe(recipe, { cuisine, dietary, skillLevel });

      // Log successful generation
      logger.info('Recipe generated successfully', {
        userId: req.user?.id,
        recipeName: enhancedRecipe.name,
        tokensUsed: completion.usage?.total_tokens
      });

      res.json({
        success: true,
        recipe: enhancedRecipe,
        metadata: {
          tokensUsed: completion.usage?.total_tokens,
          model: completion.model,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Recipe generation error:', error);

      // Handle specific OpenAI errors
      if (error.code === 'insufficient_quota') {
        return res.status(503).json({
          error: 'AI service temporarily unavailable. Please try again later.',
          code: 'SERVICE_UNAVAILABLE'
        });
      }

      if (error.code === 'rate_limit_exceeded') {
        return res.status(429).json({
          error: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMIT'
        });
      }

      res.status(500).json({
        error: 'Failed to generate recipe. Please try again.',
        code: 'GENERATION_FAILED'
      });
    }
  }
);

// GET /api/recipe/suggestions
router.get('/suggestions', optionalAuth, async (req, res) => {
  try {
    const { ingredients } = req.query;

    if (!ingredients || ingredients.length < 3) {
      return res.status(400).json({
        error: 'Ingredients parameter is required and must be at least 3 characters'
      });
    }

    // Generate recipe suggestions using a simpler OpenAI call
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful cooking assistant. Suggest 3-5 simple recipe names based on the given ingredients. Respond in JSON format with an array of recipe names."
        },
        {
          role: "user",
          content: `Suggest recipe names for these ingredients: ${ingredients}`
        }
      ],
      temperature: 0.8,
      max_tokens: 200,
      response_format: { type: "json_object" }
    });

    const suggestions = JSON.parse(completion.choices[0].message.content);

    res.json({
      success: true,
      suggestions: suggestions.recipes || suggestions.suggestions || []
    });

  } catch (error) {
    logger.error('Recipe suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get recipe suggestions',
      code: 'SUGGESTIONS_FAILED'
    });
  }
});

function createRecipePrompt({ ingredients, cuisine, cookingTime, dietary, skillLevel }) {
  let prompt = `Create a detailed recipe using these ingredients: ${ingredients}.`;

  if (cuisine) {
    const cuisineMap = {
      korean: 'Korean',
      italian: 'Italian',
      asian: 'Asian',
      mexican: 'Mexican',
      american: 'American',
      mediterranean: 'Mediterranean',
      indian: 'Indian',
      french: 'French'
    };
    prompt += ` The recipe should be ${cuisineMap[cuisine]} cuisine.`;
  }

  if (cookingTime) {
    const timeMap = {
      quick: 'under 15 minutes',
      medium: '15-30 minutes',
      long: '30-60 minutes',
      extended: 'over 1 hour'
    };
    prompt += ` Cooking time should be ${timeMap[cookingTime]}.`;
  }

  if (dietary) {
    prompt += ` The recipe must be ${dietary}.`;
  }

  if (skillLevel) {
    prompt += ` Make it suitable for ${skillLevel} cooks.`;
  }

  prompt += `

Please respond with a JSON object containing:
{
  "name": "Recipe name",
  "description": "Brief description",
  "prepTime": "Preparation time",
  "cookTime": "Cooking time",
  "totalTime": "Total time",
  "servings": "Number of servings",
  "difficulty": "easy/medium/hard",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "tips": ["tip 1", "tip 2", ...],
  "nutrition": {
    "calories": "approximate calories per serving",
    "protein": "protein content",
    "carbs": "carbohydrate content",
    "fat": "fat content"
  }
}`;

  return prompt;
}

function enhanceRecipe(recipe, options) {
  // Ensure all required fields are present
  const enhanced = {
    name: recipe.name || 'Delicious Recipe',
    description: recipe.description || 'A wonderful dish made with fresh ingredients',
    prepTime: recipe.prepTime || '10분',
    cookTime: recipe.cookTime || '20분',
    totalTime: recipe.totalTime || '30분',
    servings: recipe.servings || '2-3인분',
    difficulty: recipe.difficulty || 'easy',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
    tips: Array.isArray(recipe.tips) ? recipe.tips : [],
    nutrition: recipe.nutrition || {
      calories: '약 400kcal',
      protein: '20g',
      carbs: '45g',
      fat: '15g'
    },
    ...recipe
  };

  // Add cuisine-specific emoji
  if (options.cuisine) {
    const cuisineEmojis = {
      korean: '🍚',
      italian: '🍝',
      asian: '🍜',
      mexican: '🌮',
      american: '🍔',
      mediterranean: '🥙',
      indian: '🍛',
      french: '🥐'
    };
    
    if (!enhanced.name.includes('🍳') && !enhanced.name.includes('🍝')) {
      enhanced.name = `${cuisineEmojis[options.cuisine] || '🍳'} ${enhanced.name}`;
    }
  }

  return enhanced;
}

module.exports = router;