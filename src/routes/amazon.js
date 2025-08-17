const express = require('express');
const { query, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Amazon Product Advertising API configuration (if using official API)
// const amazonPaapi = require('amazon-paapi');

// Product categories mapping for better recommendations
const PRODUCT_CATEGORIES = {
  cooking_tools: {
    keywords: ['pan', 'pot', 'knife', 'cutting board', 'spatula', 'whisk', 'measuring cup'],
    category: 'Kitchen & Dining'
  },
  ingredients: {
    keywords: ['sauce', 'spice', 'oil', 'vinegar', 'flour', 'sugar', 'salt'],
    category: 'Grocery & Gourmet Food'
  },
  appliances: {
    keywords: ['blender', 'mixer', 'food processor', 'oven', 'microwave'],
    category: 'Kitchen & Dining'
  }
};

// Curated product database (fallback when API is not available)
const CURATED_PRODUCTS = {
  korean: [
    {
      id: 'gochujang-1',
      title: 'CJ Haechandle Gochujang Korean Chili Paste',
      price: '$8.99',
      rating: 4.6,
      reviewCount: 1250,
      image: 'https://m.media-amazon.com/images/I/61ZQoE2CVOL._SL1500_.jpg',
      affiliate_url: 'https://amazon.com/dp/B00886GU4U?tag=airecipechef-20',
      category: 'ingredient',
      description: 'Authentic Korean fermented chili paste'
    },
    {
      id: 'sesame-oil-1',
      title: 'Kadoya Pure Sesame Oil',
      price: '$12.99',
      rating: 4.7,
      reviewCount: 890,
      image: 'https://m.media-amazon.com/images/I/71VXoE2CVOL._SL1500_.jpg',
      affiliate_url: 'https://amazon.com/dp/B00027J5UG?tag=airecipechef-20',
      category: 'ingredient',
      description: 'Premium toasted sesame oil'
    }
  ],
  italian: [
    {
      id: 'pasta-maker-1',
      title: 'Marcato Atlas 150 Pasta Machine',
      price: '$79.95',
      rating: 4.5,
      reviewCount: 2100,
      image: 'https://m.media-amazon.com/images/I/71nVXoE2CVOL._SL1500_.jpg',
      affiliate_url: 'https://amazon.com/dp/B0009U5OSO?tag=airecipechef-20',
      category: 'tool',
      description: 'Professional pasta maker'
    },
    {
      id: 'olive-oil-1',
      title: 'Colavita Extra Virgin Olive Oil',
      price: '$15.99',
      rating: 4.4,
      reviewCount: 3200,
      image: 'https://m.media-amazon.com/images/I/61ZQoE2CVOL._SL1500_.jpg',
      affiliate_url: 'https://amazon.com/dp/B000H29N6W?tag=airecipechef-20',
      category: 'ingredient',
      description: 'Premium Italian extra virgin olive oil'
    }
  ],
  general: [
    {
      id: 'cast-iron-1',
      title: 'Lodge Cast Iron Skillet',
      price: '$24.90',
      rating: 4.6,
      reviewCount: 15000,
      image: 'https://m.media-amazon.com/images/I/81ZQoE2CVOL._SL1500_.jpg',
      affiliate_url: 'https://amazon.com/dp/B00006JSUB?tag=airecipechef-20',
      category: 'tool',
      description: 'Pre-seasoned cast iron skillet'
    },
    {
      id: 'cutting-board-1',
      title: 'John Boos Block Cutting Board',
      price: '$89.99',
      rating: 4.8,
      reviewCount: 850,
      image: 'https://m.media-amazon.com/images/I/71VXoE2CVOL._SL1500_.jpg',
      affiliate_url: 'https://amazon.com/dp/B001FB5AAS?tag=airecipechef-20',
      category: 'tool',
      description: 'Professional maple cutting board'
    },
    {
      id: 'knife-set-1',
      title: 'Wusthof Classic 3-Piece Knife Set',
      price: '$199.95',
      rating: 4.7,
      reviewCount: 1200,
      image: 'https://m.media-amazon.com/images/I/61ZQoE2CVOL._SL1500_.jpg',
      affiliate_url: 'https://amazon.com/dp/B00005MEGG?tag=airecipechef-20',
      category: 'tool',
      description: 'Professional German knife set'
    },
    {
      id: 'spice-rack-1',
      title: 'Simply Gourmet Spice Rack',
      price: '$39.99',
      rating: 4.3,
      reviewCount: 650,
      image: 'https://m.media-amazon.com/images/I/71nVXoE2CVOL._SL1500_.jpg',
      affiliate_url: 'https://amazon.com/dp/B07FXYZ123?tag=airecipechef-20',
      category: 'organization',
      description: 'Magnetic spice rack with 20 jars'
    }
  ]
};

// GET /api/amazon/products
router.get('/products',
  optionalAuth,
  [
    query('recipe')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('Recipe must be a string with max 200 characters'),
    query('cuisine')
      .optional()
      .isString()
      .isIn(['korean', 'italian', 'asian', 'mexican', 'american', 'mediterranean', 'indian', 'french'])
      .withMessage('Invalid cuisine type'),
    query('category')
      .optional()
      .isString()
      .isIn(['tool', 'ingredient', 'appliance', 'organization'])
      .withMessage('Invalid category'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { recipe, cuisine, category, limit = 6 } = req.query;

      logger.info('Amazon products request', {
        userId: req.user?.id,
        recipe: recipe?.substring(0, 50),
        cuisine,
        category,
        limit
      });

      // Get products based on cuisine or general products
      let products = [];
      
      if (cuisine && CURATED_PRODUCTS[cuisine]) {
        products = [...CURATED_PRODUCTS[cuisine]];
      }
      
      // Always include some general products
      products = [...products, ...CURATED_PRODUCTS.general];

      // Filter by category if specified
      if (category) {
        products = products.filter(product => product.category === category);
      }

      // If recipe is provided, try to match relevant products
      if (recipe) {
        const recipeKeywords = recipe.toLowerCase().split(' ');
        products = products.map(product => {
          let relevanceScore = 0;
          
          // Check if product matches recipe keywords
          recipeKeywords.forEach(keyword => {
            if (product.title.toLowerCase().includes(keyword) ||
                product.description.toLowerCase().includes(keyword)) {
              relevanceScore += 2;
            }
          });

          // Boost score for ingredients mentioned in recipe
          Object.keys(PRODUCT_CATEGORIES).forEach(catKey => {
            const catData = PRODUCT_CATEGORIES[catKey];
            catData.keywords.forEach(catKeyword => {
              if (recipeKeywords.includes(catKeyword)) {
                relevanceScore += 1;
              }
            });
          });

          return { ...product, relevanceScore };
        });

        // Sort by relevance score
        products.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      }

      // Remove duplicates and limit results
      const uniqueProducts = products.filter((product, index, self) =>
        index === self.findIndex(p => p.id === product.id)
      ).slice(0, parseInt(limit));

      // Add tracking parameters to affiliate URLs
      const trackedProducts = uniqueProducts.map(product => ({
        ...product,
        affiliate_url: addTrackingParams(product.affiliate_url, {
          source: 'ai-recipe-chef',
          medium: 'api',
          campaign: 'recipe-products',
          userId: req.user?.id || 'anonymous'
        })
      }));

      res.json({
        success: true,
        products: trackedProducts,
        metadata: {
          totalFound: trackedProducts.length,
          filters: { recipe, cuisine, category, limit },
          disclaimer: 'As an Amazon Associate, we earn from qualifying purchases.'
        }
      });

    } catch (error) {
      logger.error('Amazon products error:', error);
      res.status(500).json({
        error: 'Failed to fetch product recommendations',
        code: 'PRODUCTS_FAILED'
      });
    }
  }
);

// GET /api/amazon/search
router.get('/search',
  optionalAuth,
  [
    query('q')
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters'),
    query('category')
      .optional()
      .isString()
      .isIn(['tool', 'ingredient', 'appliance', 'organization'])
      .withMessage('Invalid category'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { q: searchQuery, category, limit = 10 } = req.query;

      logger.info('Amazon search request', {
        userId: req.user?.id,
        query: searchQuery,
        category,
        limit
      });

      // Search through curated products
      const allProducts = [
        ...CURATED_PRODUCTS.korean,
        ...CURATED_PRODUCTS.italian,
        ...CURATED_PRODUCTS.general
      ];

      const searchResults = allProducts.filter(product => {
        const searchTerms = searchQuery.toLowerCase().split(' ');
        const productText = `${product.title} ${product.description}`.toLowerCase();
        
        return searchTerms.some(term => productText.includes(term));
      });

      // Filter by category if specified
      let filteredResults = category 
        ? searchResults.filter(product => product.category === category)
        : searchResults;

      // Limit results
      filteredResults = filteredResults.slice(0, parseInt(limit));

      // Add tracking to affiliate URLs
      const trackedResults = filteredResults.map(product => ({
        ...product,
        affiliate_url: addTrackingParams(product.affiliate_url, {
          source: 'ai-recipe-chef',
          medium: 'search',
          campaign: 'product-search',
          query: searchQuery,
          userId: req.user?.id || 'anonymous'
        })
      }));

      res.json({
        success: true,
        products: trackedResults,
        metadata: {
          query: searchQuery,
          totalFound: trackedResults.length,
          category,
          disclaimer: 'As an Amazon Associate, we earn from qualifying purchases.'
        }
      });

    } catch (error) {
      logger.error('Amazon search error:', error);
      res.status(500).json({
        error: 'Failed to search products',
        code: 'SEARCH_FAILED'
      });
    }
  }
);

// GET /api/amazon/categories
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const categories = Object.keys(PRODUCT_CATEGORIES).map(key => ({
      id: key,
      name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      keywords: PRODUCT_CATEGORIES[key].keywords,
      category: PRODUCT_CATEGORIES[key].category
    }));

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    logger.error('Categories fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      code: 'CATEGORIES_FAILED'
    });
  }
});

// POST /api/amazon/track-click
router.post('/track-click',
  optionalAuth,
  [
    body('productId').isString().withMessage('Product ID is required'),
    body('source').optional().isString().withMessage('Source must be a string')
  ],
  async (req, res) => {
    try {
      const { productId, source = 'unknown' } = req.body;

      // Log the click for analytics
      logger.info('Amazon affiliate click tracked', {
        userId: req.user?.id,
        productId,
        source,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // You could store this in a database for analytics
      // For now, just acknowledge the tracking
      res.json({
        success: true,
        message: 'Click tracked successfully'
      });

    } catch (error) {
      logger.error('Click tracking error:', error);
      res.status(500).json({
        error: 'Failed to track click',
        code: 'TRACKING_FAILED'
      });
    }
  }
);

// Helper function to add tracking parameters to Amazon URLs
function addTrackingParams(url, params) {
  try {
    const urlObj = new URL(url);
    
    // Add Amazon affiliate tag if not present
    if (!urlObj.searchParams.has('tag')) {
      urlObj.searchParams.set('tag', process.env.AMAZON_AFFILIATE_TAG || 'airecipechef-20');
    }

    // Add custom tracking parameters
    Object.keys(params).forEach(key => {
      if (params[key]) {
        urlObj.searchParams.set(`utm_${key}`, params[key]);
      }
    });

    return urlObj.toString();
  } catch (error) {
    logger.error('Error adding tracking params:', error);
    return url; // Return original URL if parsing fails
  }
}

// Helper function to get product recommendations based on ingredients
function getRecommendationsByIngredients(ingredients) {
  const ingredientList = ingredients.toLowerCase().split(',').map(i => i.trim());
  const recommendations = [];

  ingredientList.forEach(ingredient => {
    // Map common ingredients to product categories
    if (['chicken', 'beef', 'pork', 'fish'].some(meat => ingredient.includes(meat))) {
      recommendations.push('meat-thermometer', 'marinade', 'tenderizer');
    }
    
    if (['pasta', 'noodles'].some(pasta => ingredient.includes(pasta))) {
      recommendations.push('pasta-maker', 'colander', 'pasta-sauce');
    }
    
    if (['rice'].includes(ingredient)) {
      recommendations.push('rice-cooker', 'rice-vinegar');
    }

    if (['garlic', 'onion'].some(aromatic => ingredient.includes(aromatic))) {
      recommendations.push('garlic-press', 'onion-chopper');
    }
  });

  return recommendations;
}

module.exports = router;