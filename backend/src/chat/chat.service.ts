import { Injectable, BadRequestException } from '@nestjs/common';
import { ChatDto } from './dto/chat.dto';
import { DeepSeekService } from './services/deepseek.service';
import { ChatDatabaseService } from './services/chat-database.service';

export interface Recipe {
  title: string;
  servings: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  instructions: string[];
  tips: string[];
  images?: string[];
}

@Injectable()
export class ChatService {
  constructor(
    private readonly deepSeekService: DeepSeekService,
    private readonly chatDatabaseService: ChatDatabaseService,
  ) {}

  // Mock recipe database (kept for fallback)
  private recipes: Record<string, Recipe> = {
    'spaghetti bolognese': {
      title: '🍝 Spaghetti Bolognese (Serves 2-3)',
      servings: 'Serves 2-3',
      ingredients: [
        { name: 'Ground beef', quantity: '200-250', unit: 'g' },
        { name: 'Onion, finely chopped', quantity: '1', unit: 'small' },
        { name: 'Garlic, minced', quantity: '2', unit: 'cloves' },
        { name: 'Carrot, finely diced', quantity: '1', unit: '' },
        { name: 'Tomato paste', quantity: '1', unit: 'tbsp' },
        { name: 'Crushed tomatoes (canned)', quantity: '1', unit: 'can (400 g)' },
        { name: 'Salt', quantity: '½', unit: 'tsp' },
        { name: 'Black pepper', quantity: '¼', unit: 'tsp' },
        { name: 'Dried oregano', quantity: '½', unit: 'tsp' },
        { name: 'Dried basil', quantity: '½', unit: 'tsp' },
        { name: 'Sugar (optional, to reduce acidity)', quantity: '½', unit: 'tsp' },
        { name: 'Water or beef stock', quantity: '½', unit: 'cup' },
        { name: 'Spaghetti', quantity: '200-250', unit: 'g' },
        { name: 'Water + salt (for boiling)', quantity: '', unit: '' },
        { name: 'Grated Parmesan cheese', quantity: '', unit: 'optional' },
        { name: 'Fresh basil or parsley', quantity: '', unit: 'optional' },
      ],
      instructions: [
        'Heat olive oil in a pan over medium heat. Add onion and sauté until translucent.',
        'Add ground beef to the pan. Break it apart with a spoon and cook until browned. Drain off excess fat if needed.',
        'Add garlic and carrot, stir for about 30 seconds until fragrant.',
        'Stir in tomato paste and cook for 1 minute.',
        'Add crushed tomatoes, salt, pepper, oregano, basil, sugar (if using), and water or stock.',
        'Simmer the sauce uncovered for 15-25 minutes, stirring occasionally.',
        'Bring a pot of salted water to a boil. Add spaghetti and cook according to package instructions. Drain the pasta.',
        'Serve spaghetti on a plate and top with Bolognese sauce. Finish with grated Parmesan and fresh herbs if you like.',
      ],
      tips: [
        'For richer flavor, let the sauce simmer longer (30-40 minutes).',
        'You can mix a little sauce into the pasta before serving for better coating.',
        'If the sauce gets too thick, add a splash of pasta water.',
      ],
    },
    'tomato onion scrambled eggs': {
      title: '🥚 Tomato & Onion Scrambled Eggs',
      servings: 'Serves 1-2',
      ingredients: [
        { name: 'Eggs', quantity: '3', unit: '' },
        { name: 'Tomatoes, diced', quantity: '½', unit: 'cup' },
        { name: 'Onion, diced', quantity: '¼', unit: '' },
        { name: 'Olive oil', quantity: '1', unit: 'tbsp' },
        { name: 'Salt & pepper', quantity: 'to taste', unit: '' },
        { name: 'Butter', quantity: '1', unit: 'tbsp' },
      ],
      instructions: [
        'Heat olive oil in a non-stick pan over medium heat.',
        'Add onion and sauté until softened (about 2-3 minutes).',
        'Add diced tomatoes and cook for another minute.',
        'Beat eggs in a bowl with salt and pepper.',
        'Push vegetables to the side and add butter.',
        'Pour in beaten eggs and scramble gently with vegetables until cooked through (2-3 minutes).',
        'Serve hot with toast or bread.',
      ],
      tips: [
        'For fluffier eggs, add a splash of milk or cream.',
        "Don't overcook - remove from heat while eggs are still slightly moist.",
      ],
    },
  };

  async processChat(chatDto: ChatDto) {
    const { message, userId, conversationId } = chatDto;

    if (!message) {
      throw new BadRequestException('Message required');
    }

    // Resolve or create conversation
    let convId = conversationId;
    if (userId && !convId) {
      const conv = await this.chatDatabaseService.createConversation(userId, message.slice(0, 50));
      convId = conv.id;
    }

    // Save user message
    if (convId) {
      await this.chatDatabaseService.addMessage(convId, 'user', message);
    }

    try {
      // Use DeepSeek AI to process the chat message
      const aiResponse = await this.deepSeekService.chat(message);

      // Save AI response
      if (convId) {
        await this.chatDatabaseService.addMessage(convId, 'assistant', aiResponse.response);
        // Update conversation title from first user message
        if (!conversationId) {
          const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
          await this.chatDatabaseService.updateConversationTitle(convId, title);
        }
      }

      return {
        success: true,
        response: aiResponse.response,
        recipe: null,
        conversationId: convId || null,
      };
    } catch (error) {
      // Fallback to simple recipe matching if AI fails
      const messageLC = message.toLowerCase();
      let recipe: Recipe | null = null;
      let response = '';

      for (const [key, value] of Object.entries(this.recipes)) {
        if (messageLC.includes(key)) {
          recipe = value;
          response = `Here's a delicious recipe for ${value.title}!`;
          break;
        }
      }

      if (!recipe) {
        // Check for ingredient-based queries
        if (messageLC.includes('egg') && messageLC.includes('tomato')) {
          recipe = this.recipes['tomato onion scrambled eggs'];
          response = `From Eggs + Tomatoes + Onion, you can make:\n\n1) Tomato & Onion Scrambled Eggs - Soft, quick, and filling\n2) Tomato & Onion Omelet - Add salt and pepper for them\n3) Egg, Tomato & Onion Stir Fry - Great for fried rice\n4) Simple Tomato Egg Pancake - Try it like a flat omelet\n5) Egg, Tomato Egg Soup (very basic) - Soft and hearty omelet`;
        } else {
          response =
            'I can help you find recipes! Try asking for specific dishes like "Spaghetti Bolognese" or ingredients you have.';
        }
      }

      // Save fallback response
      if (convId) {
        await this.chatDatabaseService.addMessage(convId, 'assistant', response);
      }

      return {
        success: true,
        response,
        recipe: recipe || null,
        conversationId: convId || null,
      };
    }
  }
}
