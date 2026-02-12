import {
  IngredientDictionaryEntry,
  ImageScoringConfig,
} from '../interfaces/ingredient-image.interface';

/**
 * Ingredient synonym dictionary for disambiguation
 * Maps common ingredient names to better search queries with type hints
 */
export const INGREDIENT_DICTIONARY: Record<string, IngredientDictionaryEntry> = {
  // Condiments & Sauces
  'ketchup': { searchQuery: 'ketchup bottle', objectType: 'bottle', preferredTags: ['bottle', 'ketchup', 'red'], bannedTags: ['burger', 'fries', 'hotdog'] },
  'mayo': { searchQuery: 'mayonnaise jar', objectType: 'jar', preferredTags: ['jar', 'mayonnaise', 'white'], bannedTags: ['sandwich', 'salad'] },
  'mayonnaise': { searchQuery: 'mayonnaise jar', objectType: 'jar', preferredTags: ['jar', 'mayonnaise', 'white'], bannedTags: ['sandwich', 'salad'] },
  'mustard': { searchQuery: 'mustard bottle', objectType: 'bottle', preferredTags: ['bottle', 'mustard', 'yellow'], bannedTags: ['hotdog', 'pretzel'] },
  'yellow mustard': { searchQuery: 'yellow mustard bottle', objectType: 'bottle', preferredTags: ['bottle', 'mustard', 'yellow'], bannedTags: ['hotdog', 'pretzel'] },
  'dijon mustard': { searchQuery: 'dijon mustard jar', objectType: 'jar', preferredTags: ['jar', 'mustard', 'dijon'] },
  'relish': { searchQuery: 'pickle relish jar', objectType: 'jar', preferredTags: ['jar', 'relish', 'pickle', 'green'], bannedTags: ['hotdog', 'burger'] },
  'pickle relish': { searchQuery: 'pickle relish jar', objectType: 'jar', preferredTags: ['jar', 'relish', 'pickle', 'green'], bannedTags: ['hotdog', 'burger'] },
  'hot sauce': { searchQuery: 'hot sauce bottle', objectType: 'bottle', preferredTags: ['bottle', 'hot', 'sauce', 'red'] },
  'sriracha': { searchQuery: 'sriracha sauce bottle', objectType: 'bottle', preferredTags: ['bottle', 'sriracha', 'red'] },
  'soy sauce': { searchQuery: 'soy sauce bottle', objectType: 'bottle', preferredTags: ['bottle', 'soy', 'sauce'] },
  'worcestershire sauce': { searchQuery: 'worcestershire sauce bottle', objectType: 'bottle', preferredTags: ['bottle', 'sauce'] },
  'bbq sauce': { searchQuery: 'bbq sauce bottle', objectType: 'bottle', preferredTags: ['bottle', 'bbq', 'barbecue'] },
  'barbeque sauce': { searchQuery: 'bbq sauce bottle', objectType: 'bottle', preferredTags: ['bottle', 'bbq', 'barbecue'] },
  'tartar sauce': { searchQuery: 'tartar sauce jar', objectType: 'jar', preferredTags: ['jar', 'sauce', 'tartar'] },

  // Oils & Vinegars
  'vegetable oil': { searchQuery: 'vegetable oil bottle', objectType: 'bottle', preferredTags: ['bottle', 'oil', 'vegetable'] },
  'olive oil': { searchQuery: 'olive oil bottle', objectType: 'bottle', preferredTags: ['bottle', 'olive', 'oil'] },
  'canola oil': { searchQuery: 'canola oil bottle', objectType: 'bottle', preferredTags: ['bottle', 'oil'] },
  'sesame oil': { searchQuery: 'sesame oil bottle', objectType: 'bottle', preferredTags: ['bottle', 'sesame', 'oil'] },
  'coconut oil': { searchQuery: 'coconut oil jar', objectType: 'jar', preferredTags: ['jar', 'coconut', 'oil'] },
  'vinegar': { searchQuery: 'vinegar bottle', objectType: 'bottle', preferredTags: ['bottle', 'vinegar'] },
  'white vinegar': { searchQuery: 'white vinegar bottle', objectType: 'bottle', preferredTags: ['bottle', 'vinegar', 'white'] },
  'apple cider vinegar': { searchQuery: 'apple cider vinegar bottle', objectType: 'bottle', preferredTags: ['bottle', 'vinegar', 'apple'] },
  'balsamic vinegar': { searchQuery: 'balsamic vinegar bottle', objectType: 'bottle', preferredTags: ['bottle', 'vinegar', 'balsamic'] },
  'rice vinegar': { searchQuery: 'rice vinegar bottle', objectType: 'bottle', preferredTags: ['bottle', 'vinegar', 'rice'] },

  // Seasonings & Spices
  'salt': { searchQuery: 'salt in bowl', objectType: 'bowl', preferredTags: ['salt', 'bowl', 'white', 'seasoning'], bannedTags: ['ocean', 'sea', 'road'] },
  'sea salt': { searchQuery: 'sea salt in bowl', objectType: 'bowl', preferredTags: ['salt', 'bowl', 'sea'] },
  'pepper': { searchQuery: 'black pepper powder', objectType: 'powder', preferredTags: ['pepper', 'black', 'spice', 'powder'], bannedTags: ['bell', 'vegetable'] },
  'black pepper': { searchQuery: 'black pepper powder', objectType: 'powder', preferredTags: ['pepper', 'black', 'spice', 'powder'], bannedTags: ['bell', 'vegetable'] },
  'white pepper': { searchQuery: 'white pepper powder', objectType: 'powder', preferredTags: ['pepper', 'white', 'spice'] },
  'cayenne pepper': { searchQuery: 'cayenne pepper powder', objectType: 'powder', preferredTags: ['cayenne', 'pepper', 'red', 'powder'] },
  'paprika': { searchQuery: 'paprika spice powder', objectType: 'powder', preferredTags: ['paprika', 'spice', 'red', 'powder'] },
  'cumin': { searchQuery: 'cumin spice powder', objectType: 'powder', preferredTags: ['cumin', 'spice', 'powder'] },
  'coriander': { searchQuery: 'coriander spice powder', objectType: 'powder', preferredTags: ['coriander', 'spice', 'powder'] },
  'turmeric': { searchQuery: 'turmeric powder', objectType: 'powder', preferredTags: ['turmeric', 'yellow', 'powder'] },
  'cinnamon': { searchQuery: 'cinnamon sticks and powder', objectType: 'whole', preferredTags: ['cinnamon', 'sticks', 'spice'] },
  'nutmeg': { searchQuery: 'nutmeg spice', objectType: 'whole', preferredTags: ['nutmeg', 'spice'] },
  'cloves': { searchQuery: 'cloves spice', objectType: 'whole', preferredTags: ['cloves', 'spice'] },
  'ginger powder': { searchQuery: 'ginger powder spice', objectType: 'powder', preferredTags: ['ginger', 'powder'] },
  'garlic powder': { searchQuery: 'garlic powder spice', objectType: 'powder', preferredTags: ['garlic', 'powder'] },
  'onion powder': { searchQuery: 'onion powder spice', objectType: 'powder', preferredTags: ['onion', 'powder'] },
  'chili powder': { searchQuery: 'chili powder spice', objectType: 'powder', preferredTags: ['chili', 'powder', 'red'] },
  'oregano': { searchQuery: 'dried oregano spice', objectType: 'raw', preferredTags: ['oregano', 'dried', 'herb'] },
  'basil': { searchQuery: 'fresh basil leaves', objectType: 'raw', preferredTags: ['basil', 'fresh', 'green', 'herb'] },
  'thyme': { searchQuery: 'fresh thyme herb', objectType: 'raw', preferredTags: ['thyme', 'fresh', 'herb'] },
  'rosemary': { searchQuery: 'fresh rosemary herb', objectType: 'raw', preferredTags: ['rosemary', 'fresh', 'herb'] },
  'parsley': { searchQuery: 'fresh parsley herb', objectType: 'raw', preferredTags: ['parsley', 'fresh', 'green', 'herb'] },
  'cilantro': { searchQuery: 'fresh cilantro herb', objectType: 'raw', preferredTags: ['cilantro', 'fresh', 'green', 'herb'] },
  'dill': { searchQuery: 'fresh dill herb', objectType: 'raw', preferredTags: ['dill', 'fresh', 'herb'] },
  'mint': { searchQuery: 'fresh mint leaves', objectType: 'raw', preferredTags: ['mint', 'fresh', 'green'] },
  'bay leaves': { searchQuery: 'bay leaves dried', objectType: 'raw', preferredTags: ['bay', 'leaves', 'dried'] },

  // Dairy & Refrigerated
  'milk': { searchQuery: 'milk glass bottle', objectType: 'bottle', preferredTags: ['milk', 'glass', 'white'] },
  'whole milk': { searchQuery: 'milk glass bottle', objectType: 'bottle', preferredTags: ['milk', 'glass', 'white'] },
  'butter': { searchQuery: 'butter block', objectType: 'whole', preferredTags: ['butter', 'yellow', 'block'] },
  'cream': { searchQuery: 'heavy cream container', objectType: 'container', preferredTags: ['cream', 'white', 'dairy'] },
  'heavy cream': { searchQuery: 'heavy cream container', objectType: 'container', preferredTags: ['cream', 'white', 'dairy'] },
  'sour cream': { searchQuery: 'sour cream container', objectType: 'container', preferredTags: ['sour', 'cream', 'white'] },
  'cream cheese': { searchQuery: 'cream cheese block', objectType: 'whole', preferredTags: ['cream', 'cheese', 'white'] },
  'yogurt': { searchQuery: 'yogurt container', objectType: 'container', preferredTags: ['yogurt', 'white', 'dairy'] },
  'cheese': { searchQuery: 'cheese block', objectType: 'whole', preferredTags: ['cheese', 'yellow'] },
  'cheddar cheese': { searchQuery: 'cheddar cheese block', objectType: 'whole', preferredTags: ['cheddar', 'cheese', 'yellow'] },
  'parmesan cheese': { searchQuery: 'parmesan cheese block', objectType: 'whole', preferredTags: ['parmesan', 'cheese'] },
  'mozzarella cheese': { searchQuery: 'mozzarella cheese ball', objectType: 'whole', preferredTags: ['mozzarella', 'cheese', 'white'] },
  'american cheese': { searchQuery: 'american cheese slices', objectType: 'whole', preferredTags: ['american', 'cheese', 'slices'] },
  'swiss cheese': { searchQuery: 'swiss cheese slice', objectType: 'whole', preferredTags: ['swiss', 'cheese', 'holes'] },
  'feta cheese': { searchQuery: 'feta cheese crumbled', objectType: 'whole', preferredTags: ['feta', 'cheese', 'white'] },
  'eggs': { searchQuery: 'chicken eggs', objectType: 'whole', preferredTags: ['eggs', 'chicken', 'brown', 'white'] },
  'egg': { searchQuery: 'chicken egg', objectType: 'whole', preferredTags: ['egg', 'chicken'] },

  // Meats & Proteins
  'ground beef': { searchQuery: 'raw ground beef meat', objectType: 'raw', preferredTags: ['ground', 'beef', 'raw', 'meat'], bannedTags: ['burger', 'cooked'] },
  'beef': { searchQuery: 'raw beef steak', objectType: 'raw', preferredTags: ['beef', 'raw', 'steak', 'meat'] },
  'chicken': { searchQuery: 'raw chicken breast', objectType: 'raw', preferredTags: ['chicken', 'raw', 'breast', 'meat'] },
  'chicken breast': { searchQuery: 'raw chicken breast', objectType: 'raw', preferredTags: ['chicken', 'breast', 'raw'] },
  'chicken thighs': { searchQuery: 'raw chicken thighs', objectType: 'raw', preferredTags: ['chicken', 'thighs', 'raw'] },
  'pork': { searchQuery: 'raw pork meat', objectType: 'raw', preferredTags: ['pork', 'raw', 'meat'] },
  'bacon': { searchQuery: 'bacon strips raw', objectType: 'raw', preferredTags: ['bacon', 'strips', 'meat'] },
  'ham': { searchQuery: 'ham slices', objectType: 'whole', preferredTags: ['ham', 'slices', 'pink'] },
  'sausage': { searchQuery: 'sausage links raw', objectType: 'raw', preferredTags: ['sausage', 'links', 'meat'] },
  'turkey': { searchQuery: 'raw turkey meat', objectType: 'raw', preferredTags: ['turkey', 'raw', 'meat'] },
  'salmon': { searchQuery: 'raw salmon fillet', objectType: 'raw', preferredTags: ['salmon', 'raw', 'fillet', 'fish'] },
  'shrimp': { searchQuery: 'raw shrimp seafood', objectType: 'raw', preferredTags: ['shrimp', 'raw', 'seafood'] },
  'tuna': { searchQuery: 'tuna fish raw', objectType: 'raw', preferredTags: ['tuna', 'fish', 'raw'] },

  // Vegetables
  'onion': { searchQuery: 'fresh onion vegetable', objectType: 'whole', preferredTags: ['onion', 'vegetable', 'fresh'] },
  'red onion': { searchQuery: 'red onion vegetable', objectType: 'whole', preferredTags: ['onion', 'red', 'vegetable'] },
  'garlic': { searchQuery: 'fresh garlic bulb', objectType: 'whole', preferredTags: ['garlic', 'bulb', 'fresh'] },
  'ginger': { searchQuery: 'fresh ginger root', objectType: 'whole', preferredTags: ['ginger', 'root', 'fresh'] },
  'tomato': { searchQuery: 'fresh red tomato', objectType: 'whole', preferredTags: ['tomato', 'red', 'fresh'] },
  'tomatoes': { searchQuery: 'fresh red tomatoes', objectType: 'whole', preferredTags: ['tomatoes', 'red', 'fresh'] },
  'lettuce': { searchQuery: 'fresh lettuce head', objectType: 'whole', preferredTags: ['lettuce', 'green', 'fresh'] },
  'carrot': { searchQuery: 'fresh carrots', objectType: 'whole', preferredTags: ['carrot', 'orange', 'fresh'] },
  'carrots': { searchQuery: 'fresh carrots', objectType: 'whole', preferredTags: ['carrots', 'orange', 'fresh'] },
  'potato': { searchQuery: 'fresh potatoes', objectType: 'whole', preferredTags: ['potato', 'fresh'] },
  'potatoes': { searchQuery: 'fresh potatoes', objectType: 'whole', preferredTags: ['potatoes', 'fresh'] },
  'celery': { searchQuery: 'celery stalks fresh', objectType: 'whole', preferredTags: ['celery', 'stalks', 'green'] },
  'broccoli': { searchQuery: 'fresh broccoli', objectType: 'whole', preferredTags: ['broccoli', 'green', 'fresh'] },
  'spinach': { searchQuery: 'fresh spinach leaves', objectType: 'raw', preferredTags: ['spinach', 'green', 'leaves'] },
  'bell pepper': { searchQuery: 'bell pepper vegetable', objectType: 'whole', preferredTags: ['bell', 'pepper', 'vegetable'] },
  'green pepper': { searchQuery: 'green bell pepper', objectType: 'whole', preferredTags: ['green', 'pepper', 'bell'] },
  'red pepper': { searchQuery: 'red bell pepper', objectType: 'whole', preferredTags: ['red', 'pepper', 'bell'] },
  'jalapeño': { searchQuery: 'jalapeno pepper green', objectType: 'whole', preferredTags: ['jalapeno', 'pepper', 'green'] },
  'jalapeno': { searchQuery: 'jalapeno pepper green', objectType: 'whole', preferredTags: ['jalapeno', 'pepper', 'green'] },
  'cucumber': { searchQuery: 'fresh cucumber', objectType: 'whole', preferredTags: ['cucumber', 'green', 'fresh'] },
  'pickles': { searchQuery: 'dill pickles', objectType: 'whole', preferredTags: ['pickles', 'dill', 'green'] },
  'mushroom': { searchQuery: 'fresh mushrooms', objectType: 'whole', preferredTags: ['mushroom', 'fresh'] },
  'mushrooms': { searchQuery: 'fresh mushrooms', objectType: 'whole', preferredTags: ['mushrooms', 'fresh'] },
  'zucchini': { searchQuery: 'fresh zucchini', objectType: 'whole', preferredTags: ['zucchini', 'green', 'fresh'] },
  'corn': { searchQuery: 'corn on cob', objectType: 'whole', preferredTags: ['corn', 'yellow', 'cob'] },
  'peas': { searchQuery: 'green peas', objectType: 'whole', preferredTags: ['peas', 'green'] },
  'green beans': { searchQuery: 'fresh green beans', objectType: 'whole', preferredTags: ['green', 'beans', 'fresh'] },
  'asparagus': { searchQuery: 'fresh asparagus', objectType: 'whole', preferredTags: ['asparagus', 'green', 'fresh'] },
  'cabbage': { searchQuery: 'fresh cabbage head', objectType: 'whole', preferredTags: ['cabbage', 'green', 'head'] },
  'cauliflower': { searchQuery: 'fresh cauliflower', objectType: 'whole', preferredTags: ['cauliflower', 'white', 'fresh'] },
  'avocado': { searchQuery: 'fresh avocado', objectType: 'whole', preferredTags: ['avocado', 'green'] },
  'eggplant': { searchQuery: 'fresh eggplant', objectType: 'whole', preferredTags: ['eggplant', 'purple'] },

  // Fruits
  'lemon': { searchQuery: 'fresh lemon fruit', objectType: 'whole', preferredTags: ['lemon', 'yellow', 'citrus'] },
  'lime': { searchQuery: 'fresh lime fruit', objectType: 'whole', preferredTags: ['lime', 'green', 'citrus'] },
  'orange': { searchQuery: 'fresh orange fruit', objectType: 'whole', preferredTags: ['orange', 'citrus', 'fruit'] },
  'apple': { searchQuery: 'fresh apple fruit', objectType: 'whole', preferredTags: ['apple', 'red', 'fruit'] },
  'banana': { searchQuery: 'fresh banana fruit', objectType: 'whole', preferredTags: ['banana', 'yellow', 'fruit'] },
  'strawberry': { searchQuery: 'fresh strawberries', objectType: 'whole', preferredTags: ['strawberry', 'red', 'berry'] },
  'blueberry': { searchQuery: 'fresh blueberries', objectType: 'whole', preferredTags: ['blueberry', 'blue', 'berry'] },

  // Grains & Starches
  'rice': { searchQuery: 'white rice grains', objectType: 'raw', preferredTags: ['rice', 'white', 'grains'] },
  'brown rice': { searchQuery: 'brown rice grains', objectType: 'raw', preferredTags: ['rice', 'brown', 'grains'] },
  'pasta': { searchQuery: 'dry pasta uncooked', objectType: 'raw', preferredTags: ['pasta', 'dry', 'uncooked'] },
  'spaghetti': { searchQuery: 'dry spaghetti pasta', objectType: 'raw', preferredTags: ['spaghetti', 'pasta', 'dry'] },
  'noodles': { searchQuery: 'dry noodles uncooked', objectType: 'raw', preferredTags: ['noodles', 'dry'] },
  'flour': { searchQuery: 'all purpose flour', objectType: 'powder', preferredTags: ['flour', 'white', 'powder'] },
  'bread': { searchQuery: 'fresh bread loaf', objectType: 'whole', preferredTags: ['bread', 'loaf', 'fresh'] },
  'bread crumbs': { searchQuery: 'bread crumbs', objectType: 'raw', preferredTags: ['bread', 'crumbs'] },
  'burger buns': { searchQuery: 'hamburger buns bread', objectType: 'whole', preferredTags: ['buns', 'hamburger', 'bread'] },
  'buns': { searchQuery: 'hamburger buns', objectType: 'whole', preferredTags: ['buns', 'bread'] },
  'tortilla': { searchQuery: 'flour tortilla stack', objectType: 'whole', preferredTags: ['tortilla', 'flour'] },

  // Sweeteners
  'sugar': { searchQuery: 'white sugar bowl', objectType: 'bowl', preferredTags: ['sugar', 'white', 'bowl'] },
  'brown sugar': { searchQuery: 'brown sugar bowl', objectType: 'bowl', preferredTags: ['sugar', 'brown', 'bowl'] },
  'honey': { searchQuery: 'honey jar', objectType: 'jar', preferredTags: ['honey', 'jar', 'golden'] },
  'maple syrup': { searchQuery: 'maple syrup bottle', objectType: 'bottle', preferredTags: ['maple', 'syrup', 'bottle'] },
  'vanilla extract': { searchQuery: 'vanilla extract bottle', objectType: 'bottle', preferredTags: ['vanilla', 'extract', 'bottle'] },
  'vanilla': { searchQuery: 'vanilla extract bottle', objectType: 'bottle', preferredTags: ['vanilla', 'extract'] },

  // Canned & Jarred
  'tomato sauce': { searchQuery: 'tomato sauce jar', objectType: 'jar', preferredTags: ['tomato', 'sauce', 'jar'] },
  'tomato paste': { searchQuery: 'tomato paste can', objectType: 'container', preferredTags: ['tomato', 'paste', 'can'] },
  'canned tomatoes': { searchQuery: 'canned tomatoes', objectType: 'container', preferredTags: ['tomatoes', 'canned'] },
  'chicken broth': { searchQuery: 'chicken broth can', objectType: 'container', preferredTags: ['chicken', 'broth', 'can'] },
  'beef broth': { searchQuery: 'beef broth can', objectType: 'container', preferredTags: ['beef', 'broth', 'can'] },
  'vegetable broth': { searchQuery: 'vegetable broth can', objectType: 'container', preferredTags: ['vegetable', 'broth', 'can'] },
  'coconut milk': { searchQuery: 'coconut milk can', objectType: 'container', preferredTags: ['coconut', 'milk', 'can'] },
  'beans': { searchQuery: 'canned beans', objectType: 'container', preferredTags: ['beans', 'canned'] },
  'black beans': { searchQuery: 'black beans can', objectType: 'container', preferredTags: ['black', 'beans', 'canned'] },
  'kidney beans': { searchQuery: 'kidney beans can', objectType: 'container', preferredTags: ['kidney', 'beans', 'red'] },

  // Baking
  'baking powder': { searchQuery: 'baking powder container', objectType: 'container', preferredTags: ['baking', 'powder'] },
  'baking soda': { searchQuery: 'baking soda box', objectType: 'container', preferredTags: ['baking', 'soda'] },
  'yeast': { searchQuery: 'baking yeast packet', objectType: 'raw', preferredTags: ['yeast', 'baking'] },
  'cornstarch': { searchQuery: 'cornstarch powder', objectType: 'powder', preferredTags: ['cornstarch', 'powder'] },
  'cocoa powder': { searchQuery: 'cocoa powder', objectType: 'powder', preferredTags: ['cocoa', 'powder', 'chocolate'] },
  'chocolate chips': { searchQuery: 'chocolate chips', objectType: 'raw', preferredTags: ['chocolate', 'chips'] },

  // Nuts & Seeds
  'almonds': { searchQuery: 'almonds nuts', objectType: 'raw', preferredTags: ['almonds', 'nuts'] },
  'walnuts': { searchQuery: 'walnuts nuts', objectType: 'raw', preferredTags: ['walnuts', 'nuts'] },
  'peanuts': { searchQuery: 'peanuts nuts', objectType: 'raw', preferredTags: ['peanuts', 'nuts'] },
  'peanut butter': { searchQuery: 'peanut butter jar', objectType: 'jar', preferredTags: ['peanut', 'butter', 'jar'] },
  'sesame seeds': { searchQuery: 'sesame seeds', objectType: 'raw', preferredTags: ['sesame', 'seeds'] },
  'sunflower seeds': { searchQuery: 'sunflower seeds', objectType: 'raw', preferredTags: ['sunflower', 'seeds'] },
};

/**
 * Image scoring configuration
 */
export const IMAGE_SCORING_CONFIG: ImageScoringConfig = {
  // Words that indicate a "scene" photo - these get penalized
  sceneIndicators: [
    'food', 'meal', 'dinner', 'lunch', 'breakfast', 'restaurant',
    'kitchen', 'table', 'plate', 'recipe', 'serving', 'dish',
    'cooking', 'cook', 'chef', 'menu', 'cafe', 'dining',
    'gourmet', 'delicious', 'tasty', 'homemade', 'prepared',
    'bbq', 'barbeque', 'grill', 'grilled', 'fried', 'baked',
  ],

  // Words that indicate an isolated ingredient photo - these get bonus
  isolatedIndicators: [
    'isolated', 'white background', 'on white', 'studio',
    'single', 'raw', 'fresh', 'ingredient', 'uncooked',
    'closeup', 'close up', 'macro', 'detail',
    'jar', 'bottle', 'container', 'bowl', 'spice',
    'whole', 'cut', 'sliced', 'pure', 'natural',
  ],

  // Generic banned words that should always be penalized
  genericBannedWords: [
    'burger', 'pizza', 'sandwich', 'salad', 'fries',
    'hotdog', 'taco', 'pasta dish', 'soup', 'stew',
    'people', 'person', 'hand', 'hands', 'woman', 'man',
    'family', 'restaurant', 'cafe', 'diner',
    'plated', 'served', 'decorated', 'garnished',
  ],

  // Negative keywords to append to search queries
  negativeKeywords: [
    '-burger', '-pizza', '-plate', '-restaurant',
    '-kitchen', '-recipe', '-sandwich', '-salad',
    '-table', '-people', '-meal', '-dish',
  ],

  // Photo style keywords to add to queries
  photoStyleKeywords: [
    'isolated',
    'white background',
    'close up',
    'ingredient',
  ],
};

/**
 * Score weights for image ranking
 */
export const SCORE_WEIGHTS = {
  TAG_MATCH: 3,           // Bonus per matching preferred tag
  TAG_KEYWORD_MATCH: 2,   // Bonus per ingredient keyword found in tag
  BANNED_WORD_PENALTY: -4, // Penalty per banned word found
  SCENE_INDICATOR_PENALTY: -2, // Penalty per scene indicator found
  ISOLATED_INDICATOR_BONUS: 3, // Bonus per isolated indicator found
  POPULARITY_BONUS_MAX: 2, // Max bonus for popular images (likes/downloads)
  EXACT_MATCH_BONUS: 5,   // Bonus if ingredient name exactly matches a tag
};
